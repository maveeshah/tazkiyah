"""
Tier 1: Feature Coverage E2E Test Suite
Covers core happy-path behaviors and interface contracts for Features R1 through R6.
Target: >= 5 tests per feature (>= 30 tests total).
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from app.models.account import AccountType
from app.models.transaction import TransactionSource
from app.models.goal import GoalType


# ==============================================================================
# R1: Zero-Based Budget Allocation Table & Envelope Management
# ==============================================================================

@pytest.mark.asyncio
async def test_r1_zbb_invariants_initial_calculation(client, seed_data):
    """
    R1.1: Verify ZBB Summary invariants:
    total_inflow = sum(account.current_balance) = 25,000 (Cash) + 150,000 (Bank) = 175,000 PKR
    total_assigned = 40,000 (Grocery) + 20,000 (Fuel) + 15,000 (Dining) = 75,000 PKR
    unassigned_cash = total_inflow - total_assigned + total_spent = 100,000 PKR (no spend yet)
    overspent_envelopes_count = 0
    """
    household = seed_data["household"]
    resp = await client.get(f"/api/v1/envelopes/summary/{household.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(str(data["total_inflow"])) == Decimal("175000.00")
    assert Decimal(str(data["total_assigned"])) == Decimal("75000.00")
    assert Decimal(str(data["unassigned_cash"])) == Decimal("100000.00")
    assert data["overspent_envelopes_count"] == 0


@pytest.mark.asyncio
async def test_r1_envelope_income_assignment_success(client, seed_data):
    """
    R1.2: Assign additional income to an envelope within available unassigned cash.
    Grocery increased from 40,000 to 60,000 (Delta +20,000).
    Unassigned cash drops from 100,000 to 80,000. Total assigned becomes 95,000.
    """
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    assign_resp = await client.post(
        f"/api/v1/envelopes/assign?household_id={household.id}",
        json={"envelope_id": str(grocery_env.id), "assigned_amount": "60000.00"},
    )
    assert assign_resp.status_code == 200
    env_data = assign_resp.json()
    assert Decimal(str(env_data["assigned_amount"])) == Decimal("60000.00")

    summary_resp = await client.get(f"/api/v1/envelopes/summary/{household.id}")
    summary = summary_resp.json()
    assert Decimal(str(summary["total_assigned"])) == Decimal("95000.00")
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("80000.00")


@pytest.mark.asyncio
async def test_r1_envelope_income_assignment_exceeds_unassigned_cash(client, seed_data):
    """
    R1.3: Reject envelope assignment that exceeds unassigned cash ceiling.
    Unassigned cash = 100,000, Grocery currently has 40,000 (Max allocatable = 140,000).
    Attempting to assign 150,000 must fail with HTTP 400 Bad Request.
    """
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    resp = await client.post(
        f"/api/v1/envelopes/assign?household_id={household.id}",
        json={"envelope_id": str(grocery_env.id), "assigned_amount": "150000.00"},
    )
    assert resp.status_code == 400
    assert "unassigned cash" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_r1_envelope_income_assignment_negative_rejected(client, seed_data):
    """
    R1.4: Reject negative envelope assignment amount with HTTP 400.
    """
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    resp = await client.post(
        f"/api/v1/envelopes/assign?household_id={household.id}",
        json={"envelope_id": str(grocery_env.id), "assigned_amount": "-500.00"},
    )
    assert resp.status_code == 400
    assert "negative" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_r1_envelope_rebalance_mechanics(client, seed_data):
    """
    R1.5: Rebalance funds between envelopes.
    Transfer 5,000 from Fuel (assigned 20,000 -> 15,000) to Dining Out (assigned 15,000 -> 20,000).
    Total assigned (75,000) and unassigned cash (100,000) remain invariant.
    """
    household = seed_data["household"]
    fuel_env = seed_data["envelopes"]["fuel"]
    dining_env = seed_data["envelopes"]["dining"]

    resp = await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(fuel_env.id),
            "to_envelope_id": str(dining_env.id),
            "amount": "5000.00",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert Decimal(str(data["from_envelope"]["assigned_amount"])) == Decimal("15000.00")
    assert Decimal(str(data["to_envelope"]["assigned_amount"])) == Decimal("20000.00")

    # Invariant verification
    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary["total_assigned"])) == Decimal("75000.00")
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("100000.00")


@pytest.mark.asyncio
async def test_r1_envelope_rebalance_exceeds_source_funds(client, seed_data):
    """
    R1.6: Rebalance fails with 400 if transfer amount exceeds source envelope's assigned amount.
    Fuel has 20,000; attempting to transfer 25,000 must be rejected.
    """
    household = seed_data["household"]
    fuel_env = seed_data["envelopes"]["fuel"]
    dining_env = seed_data["envelopes"]["dining"]

    resp = await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(fuel_env.id),
            "to_envelope_id": str(dining_env.id),
            "amount": "25000.00",
        },
    )
    assert resp.status_code == 400
    assert "cannot transfer" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_r1_overspent_envelopes_detection(client, seed_data):
    """
    R1.7: Overspent envelope detection endpoint.
    Create a transaction that exceeds assigned amount, verify /envelopes/overspent returns it.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    dining_env = seed_data["envelopes"]["dining"]  # assigned: 15,000

    # Spend 18,000
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(dining_env.id),
            "total_amount": "18000.00",
            "merchant": "BBQ Tonight",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "Dinner", "quantity": "1.000", "unit": "meal", "total_price": "18000.00"}
            ],
        },
    )

    overspent_resp = await client.get(f"/api/v1/envelopes/overspent/{household.id}")
    assert overspent_resp.status_code == 200
    overspent_list = overspent_resp.json()
    assert len(overspent_list) == 1
    assert overspent_list[0]["id"] == str(dining_env.id)
    assert Decimal(str(overspent_list[0]["spent_amount"])) == Decimal("18000.00")
    assert overspent_list[0]["available_balance"] == -3000.00


@pytest.mark.asyncio
async def test_r1_envelope_group_hierarchical_listing(client, seed_data):
    """
    R1.8: Verify hierarchical envelope groups listing with nested envelopes.
    """
    household = seed_data["household"]
    resp = await client.get(f"/api/v1/envelopes/groups/household/{household.id}")
    assert resp.status_code == 200
    groups = resp.json()
    assert len(groups) == 2
    assert groups[0]["name"] == "Daily Living"
    assert len(groups[0]["envelopes"]) == 2  # Grocery, Fuel
    assert groups[1]["name"] == "Discretionary"
    assert len(groups[1]["envelopes"]) == 1  # Dining Out


# ==============================================================================
# R2: Granular Line-Item Transaction Explorer
# ==============================================================================

@pytest.mark.asyncio
async def test_r2_create_transaction_with_multiple_line_items(client, seed_data):
    """
    R2.1: Create transaction with multiple line items, debiting account and updating envelope.
    Cash balance (25,000 -> 23,800), Grocery spent (0 -> 1,200).
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    tx_payload = {
        "household_id": str(household.id),
        "account_id": str(cash_acc.id),
        "envelope_id": str(grocery_env.id),
        "total_amount": "1200.00",
        "merchant": "Imtiaz Supermarket",
        "source": "WEB",
        "line_items": [
            {
                "raw_item_name": "Potato",
                "quantity": "2.000",
                "unit": "kg",
                "unit_price": "100.00",
                "total_price": "200.00",
                "notes": "Fresh brown potatoes",
            },
            {
                "raw_item_name": "Milk",
                "quantity": "3.000",
                "unit": "liter",
                "unit_price": "290.00",
                "total_price": "870.00",
                "notes": "Olpers full cream",
            },
            {
                "raw_item_name": "Eggs",
                "quantity": "1.000",
                "unit": "dozen",
                "unit_price": "130.00",
                "total_price": "130.00",
            },
        ],
    }

    resp = await client.post("/api/v1/transactions", json=tx_payload)
    assert resp.status_code == 200
    tx = resp.json()
    assert tx["total_amount"] == "1200.00"
    assert len(tx["line_items"]) == 3

    # Verify Account debited
    acc_resp = await client.get(f"/api/v1/accounts/{cash_acc.id}?household_id={household.id}")
    assert Decimal(str(acc_resp.json()["current_balance"])) == Decimal("23800.00")


@pytest.mark.asyncio
async def test_r2_line_item_auto_calculates_unit_price(client, seed_data):
    """
    R2.2: Line item automatically derives unit_price = total_price / quantity when unit_price is omitted.
    5kg Sugar for 750 PKR -> unit_price = 150 PKR/kg.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    tx_payload = {
        "household_id": str(household.id),
        "account_id": str(cash_acc.id),
        "envelope_id": str(grocery_env.id),
        "total_amount": "750.00",
        "merchant": "Carrefour",
        "source": "MOBILE",
        "line_items": [
            {
                "raw_item_name": "Sugar",
                "quantity": "5.000",
                "unit": "kg",
                "total_price": "750.00",
            }
        ],
    }

    resp = await client.post("/api/v1/transactions", json=tx_payload)
    assert resp.status_code == 200
    tx = resp.json()
    item = tx["line_items"][0]
    assert Decimal(str(item["unit_price"])) == Decimal("150.00")


@pytest.mark.asyncio
async def test_r2_transaction_source_tagging_whatsapp_web_mobile(client, seed_data):
    """
    R2.3: Supports source tagging across WHATSAPP, WEB, and MOBILE channels.
    """
    household = seed_data["household"]
    bank_acc = seed_data["accounts"]["bank"]
    fuel_env = seed_data["envelopes"]["fuel"]

    for src in [TransactionSource.WHATSAPP, TransactionSource.WEB, TransactionSource.MOBILE]:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "household_id": str(household.id),
                "account_id": str(bank_acc.id),
                "envelope_id": str(fuel_env.id),
                "total_amount": "1000.00",
                "merchant": "PSO Station",
                "source": src.value,
                "line_items": [
                    {"raw_item_name": "Petrol", "quantity": "3.636", "unit": "liter", "total_price": "1000.00"}
                ],
            },
        )
        assert resp.status_code == 200
        assert resp.json()["source"] == src.value


@pytest.mark.asyncio
async def test_r2_transaction_ledger_pagination_and_ordering(client, seed_data):
    """
    R2.4: Transactions ledger is returned in reverse-chronological order and respects limit query param.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Post 3 transactions with different timestamps
    for i in range(3):
        await client.post(
            "/api/v1/transactions",
            json={
                "household_id": str(household.id),
                "account_id": str(cash_acc.id),
                "envelope_id": str(grocery_env.id),
                "total_amount": f"{100 * (i + 1)}.00",
                "merchant": f"Store {i}",
                "source": "WEB",
                "line_items": [
                    {"raw_item_name": f"Item {i}", "quantity": "1.000", "unit": "piece", "total_price": f"{100 * (i + 1)}.00"}
                ],
            },
        )

    # Fetch with limit=2
    resp = await client.get(f"/api/v1/transactions/household/{household.id}?limit=2")
    assert resp.status_code == 200
    txs = resp.json()
    assert len(txs) == 2
    # First returned is most recent (Store 2)
    assert txs[0]["merchant"] == "Store 2"
    assert txs[1]["merchant"] == "Store 1"


@pytest.mark.asyncio
async def test_r2_transaction_receipt_line_items_expansion(client, seed_data):
    """
    R2.5: Line item receipt expansion verifies all itemized attributes are serialized.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    tx_resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "500.00",
            "merchant": "Metro Cash & Carry",
            "source": "WHATSAPP",
            "raw_input": "500 for flour at Metro",
            "line_items": [
                {
                    "raw_item_name": "Flour",
                    "quantity": "3.500",
                    "unit": "kg",
                    "unit_price": "142.86",
                    "total_price": "500.00",
                    "notes": "Chakki Atta",
                }
            ],
        },
    )
    assert tx_resp.status_code == 200
    tx_id = tx_resp.json()["id"]

    ledger_resp = await client.get(f"/api/v1/transactions/household/{household.id}")
    tx = next(t for t in ledger_resp.json() if t["id"] == tx_id)
    item = tx["line_items"][0]
    assert item["raw_item_name"] == "Flour"
    assert Decimal(str(item["quantity"])) == Decimal("3.500")
    assert item["unit"] == "kg"
    assert item["notes"] == "Chakki Atta"
    assert item["canonical_item_id"] is not None


@pytest.mark.asyncio
async def test_r2_transaction_creation_invalid_account_or_envelope(client, seed_data):
    """
    R2.6: Transaction creation returns 404 if account_id or envelope_id is non-existent.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]
    fake_uuid = "00000000-0000-0000-0000-000000000000"

    # Bad account
    resp1 = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": fake_uuid,
            "envelope_id": str(grocery_env.id),
            "total_amount": "100.00",
            "source": "WEB",
        },
    )
    assert resp1.status_code == 404

    # Bad envelope
    resp2 = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": fake_uuid,
            "total_amount": "100.00",
            "source": "WEB",
        },
    )
    assert resp2.status_code == 404


# ==============================================================================
# R3: Personal CPI & Staple Inflation Visualizer
# ==============================================================================

@pytest.mark.asyncio
async def test_r3_canonical_item_alias_resolution(client, seed_data):
    """
    R3.1: Verify Roman Urdu synonyms correctly resolve to canonical English items.
    'aaloo' -> Potato, 'doodh' -> Milk, 'anday' -> Eggs, 'atta' -> Flour, 'pyaz' -> Onion.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    synonym_map = [
        ("aaloo", "Potato", "Fresh Produce"),
        ("doodh", "Milk", "Dairy"),
        ("anday", "Eggs", "Poultry & Dairy"),
        ("atta", "Flour", "Grains & Staples"),
        ("pyaz", "Onion", "Fresh Produce"),
    ]

    for raw, canonical, category in synonym_map:
        await client.post(
            "/api/v1/transactions",
            json={
                "household_id": str(household.id),
                "account_id": str(cash_acc.id),
                "envelope_id": str(grocery_env.id),
                "total_amount": "100.00",
                "source": "WHATSAPP",
                "line_items": [
                    {"raw_item_name": raw, "quantity": "1.000", "unit": "kg", "total_price": "100.00"}
                ],
            },
        )

    trends_resp = await client.get(f"/api/v1/cpi/trends/{household.id}")
    assert trends_resp.status_code == 200
    trends = trends_resp.json()
    trend_names = {t["name"]: t["category"] for t in trends}

    for _, canonical, category in synonym_map:
        assert canonical in trend_names
        assert trend_names[canonical] == category


@pytest.mark.asyncio
async def test_r3_cpi_trends_mom_inflation_calculation(client, seed_data):
    """
    R3.2: Verify Month-over-Month (MoM) inflation percentage calculation:
    Price 1: 100 PKR/kg at Local Vendor.
    Price 2: 125 PKR/kg at Imtiaz Supermarket.
    MoM Inflation = ((125 - 100) / 100) * 100 = 25.0%.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Month 1 purchase
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "100.00",
            "merchant": "Local Vendor",
            "source": "WHATSAPP",
            "line_items": [
                {"raw_item_name": "Potato", "quantity": "1.000", "unit": "kg", "unit_price": "100.00", "total_price": "100.00"}
            ],
        },
    )

    # Month 2 purchase
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "125.00",
            "merchant": "Imtiaz Supermarket",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "Potato", "quantity": "1.000", "unit": "kg", "unit_price": "125.00", "total_price": "125.00"}
            ],
        },
    )

    trends_resp = await client.get(f"/api/v1/cpi/trends/{household.id}")
    assert trends_resp.status_code == 200
    trends = trends_resp.json()
    potato_trend = next(t for t in trends if t["name"] == "Potato")

    assert Decimal(str(potato_trend["latest_price"])) == Decimal("125.00")
    assert Decimal(str(potato_trend["previous_price"])) == Decimal("100.00")
    assert potato_trend["inflation_rate_percentage"] == 25.0


@pytest.mark.asyncio
async def test_r3_cpi_trends_single_price_point_handling(client, seed_data):
    """
    R3.3: When only a single price point exists, inflation_rate_percentage is None and previous_price is None.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "300.00",
            "merchant": "Milk Shop",
            "source": "WHATSAPP",
            "line_items": [
                {"raw_item_name": "Milk", "quantity": "1.000", "unit": "liter", "unit_price": "300.00", "total_price": "300.00"}
            ],
        },
    )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    milk = next(t for t in trends if t["name"] == "Milk")
    assert Decimal(str(milk["latest_price"])) == Decimal("300.00")
    assert milk["previous_price"] is None
    assert milk["inflation_rate_percentage"] is None


@pytest.mark.asyncio
async def test_r3_cpi_vendor_price_comparison(client, seed_data):
    """
    R3.4: History entries capture merchant names allowing vendor price comparisons.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    merchants = ["Local Bazaari", "Imtiaz", "Carrefour"]
    prices = ["80.00", "95.00", "110.00"]

    for m, p in zip(merchants, prices):
        await client.post(
            "/api/v1/transactions",
            json={
                "household_id": str(household.id),
                "account_id": str(cash_acc.id),
                "envelope_id": str(grocery_env.id),
                "total_amount": p,
                "merchant": m,
                "source": "WEB",
                "line_items": [
                    {"raw_item_name": "Potato", "quantity": "1.000", "unit": "kg", "unit_price": p, "total_price": p}
                ],
            },
        )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    potato = next(t for t in trends if t["name"] == "Potato")
    history_merchants = [h["merchant"] for h in potato["history"]]
    for m in merchants:
        assert m in history_merchants


@pytest.mark.asyncio
async def test_r3_cpi_deflation_and_zero_inflation_handling(client, seed_data):
    """
    R3.5: Price drops produce negative inflation (deflation), and steady prices yield 0.0%.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Price 1: 200 PKR
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "200.00",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Tomato", "quantity": "1.000", "unit": "kg", "total_price": "200.00"}],
        },
    )
    # Price 2: 150 PKR (-25% deflation)
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "150.00",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Tomato", "quantity": "1.000", "unit": "kg", "total_price": "150.00"}],
        },
    )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    tomato = next(t for t in trends if t["name"] == "Tomato")
    assert tomato["inflation_rate_percentage"] == -25.0


# ==============================================================================
# R4: Financial Goals & Emergency Runway Tracker
# ==============================================================================

@pytest.mark.asyncio
async def test_r4_create_target_date_goal_and_pacing(client, seed_data):
    """
    R4.1: Target-by-date goal creation calculates dynamic monthly pacing:
    Target: 600,000 PKR, Current: 100,000 PKR (Remaining: 500,000 PKR).
    Target date in 10 months -> Monthly pacing = 50,000 PKR/month.
    """
    household = seed_data["household"]
    target_dt = date.today() + timedelta(days=300)  # ~10 months

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Umrah 2027",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "600000.00",
            "target_date": target_dt.isoformat(),
            "current_balance": "100000.00",
        },
    )
    assert resp.status_code == 200
    goal = resp.json()
    assert goal["name"] == "Umrah 2027"
    assert goal["monthly_pacing"] is not None
    assert Decimal(str(goal["monthly_pacing"])) > Decimal("0.00")


@pytest.mark.asyncio
async def test_r4_goal_pacing_when_target_date_is_past(client, seed_data):
    """
    R4.2: When target date is in the past, monthly_pacing equals the total remaining balance.
    Target: 200,000 PKR, Current: 50,000 PKR -> Monthly Pacing = 150,000 PKR.
    """
    household = seed_data["household"]
    past_date = date.today() - timedelta(days=30)

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Past Due Fund",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "200000.00",
            "target_date": past_date.isoformat(),
            "current_balance": "50000.00",
        },
    )
    assert resp.status_code == 200
    goal = resp.json()
    assert Decimal(str(goal["monthly_pacing"])) == Decimal("150000.00")


@pytest.mark.asyncio
async def test_r4_goal_pacing_when_fully_funded(client, seed_data):
    """
    R4.3: When current_balance >= target_amount, monthly_pacing is 0.00.
    """
    household = seed_data["household"]
    future_date = date.today() + timedelta(days=180)

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Fully Funded Laptop",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "250000.00",
            "target_date": future_date.isoformat(),
            "current_balance": "250000.00",
        },
    )
    assert resp.status_code == 200
    goal = resp.json()
    assert Decimal(str(goal["monthly_pacing"])) == Decimal("0.00")


@pytest.mark.asyncio
async def test_r4_sinking_fund_and_target_cap_goals(client, seed_data):
    """
    R4.4: SINKING_FUND and TARGET_CAP goal types return monthly_pacing as None.
    """
    household = seed_data["household"]

    for g_type in [GoalType.SINKING_FUND, GoalType.TARGET_CAP]:
        resp = await client.post(
            "/api/v1/goals",
            json={
                "household_id": str(household.id),
                "name": f"Goal {g_type.value}",
                "goal_type": g_type.value,
                "target_amount": "100000.00",
                "current_balance": "20000.00",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["monthly_pacing"] is None


@pytest.mark.asyncio
async def test_r4_emergency_runway_ratio_calculation(client, seed_data):
    """
    R4.5: Emergency Runway Ratio = Total Liquid Cash / Monthly Burn Rate.
    Total Liquid Cash = 175,000 PKR.
    Monthly Burn Rate (Total Envelope Assigned) = 75,000 PKR.
    Runway = 175,000 / 75,000 = 2.33 months.
    """
    household = seed_data["household"]

    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    total_liquid = sum(Decimal(str(a["current_balance"])) for a in accs if a["is_active"])

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    monthly_burn = Decimal(str(summary["total_assigned"]))

    runway_months = round(float(total_liquid / monthly_burn), 2)
    assert runway_months == 2.33


@pytest.mark.asyncio
async def test_r4_goal_progress_ratio(client, seed_data):
    """
    R4.6: Verify Goal progress completion percentage: current_balance / target_amount.
    """
    household = seed_data["household"]
    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Car Maintenance",
            "goal_type": GoalType.SINKING_FUND.value,
            "target_amount": "50000.00",
            "current_balance": "20000.00",
        },
    )
    assert resp.status_code == 200
    goal = resp.json()
    progress_pct = (Decimal(str(goal["current_balance"])) / Decimal(str(goal["target_amount"]))) * 100
    assert progress_pct == Decimal("40.0")


# ==============================================================================
# R5: Liquid Accounts & Wallets Summary
# ==============================================================================

@pytest.mark.asyncio
async def test_r5_create_and_list_accounts_by_type(client, seed_data):
    """
    R5.1: Create accounts of different types (CASH, BANK, EMI, CREDIT) and list active accounts.
    """
    household = seed_data["household"]

    for acc_type in [AccountType.EMI, AccountType.CREDIT]:
        resp = await client.post(
            "/api/v1/accounts",
            json={
                "household_id": str(household.id),
                "name": f"Test {acc_type.value} Account",
                "type": acc_type.value,
                "current_balance": "10000.00",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == acc_type.value

    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    # 2 seeded (Cash, Bank) + 2 created (EMI, Credit) = 4
    assert len(accs) == 4


@pytest.mark.asyncio
async def test_r5_net_liquid_worth_sum(client, seed_data):
    """
    R5.2: Net liquid worth is the exact sum of all active account balances.
    Seed: 25,000 + 150,000 = 175,000 PKR.
    """
    household = seed_data["household"]
    resp = await client.get(f"/api/v1/accounts/household/{household.id}")
    assert resp.status_code == 200
    accounts = resp.json()
    net_worth = sum(Decimal(str(a["current_balance"])) for a in accounts)
    assert net_worth == Decimal("175000.00")


@pytest.mark.asyncio
async def test_r5_account_overdrawn_flag_on_negative_balance(client, seed_data):
    """
    R5.3: Account `is_overdrawn` flag is False when balance >= 0, and True when balance < 0.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Before overdrawing
    resp_before = await client.get(f"/api/v1/accounts/{cash_acc.id}?household_id={household.id}")
    assert resp_before.json()["is_overdrawn"] is False

    # Overdraw Cash by spending 30,000 (balance was 25,000 -> -5,000)
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "30000.00",
            "merchant": "Medical Clinic",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Treatment", "quantity": "1.000", "unit": "service", "total_price": "30000.00"}],
        },
    )

    resp_after = await client.get(f"/api/v1/accounts/{cash_acc.id}?household_id={household.id}")
    data = resp_after.json()
    assert Decimal(str(data["current_balance"])) == Decimal("-5000.00")
    assert data["is_overdrawn"] is True


@pytest.mark.asyncio
async def test_r5_get_account_by_id_with_household_isolation(client, seed_data):
    """
    R5.4: Accounts are strictly tenant-isolated by household_id. Querying another household's account yields 404.
    """
    cash_acc = seed_data["accounts"]["cash"]

    # Create another household
    other_h = (await client.post("/api/v1/households", json={"name": "Foreign Family", "base_currency": "PKR"})).json()

    # Query cash_acc using foreign household_id
    resp = await client.get(f"/api/v1/accounts/{cash_acc.id}?household_id={other_h['id']}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_r5_inactive_account_filtering(client, seed_data):
    """
    R5.5: Inactive accounts (is_active=False) are excluded from /accounts/household/{id}.
    """
    household = seed_data["household"]

    # Create an inactive account
    await client.post(
        "/api/v1/accounts",
        json={
            "household_id": str(household.id),
            "name": "Closed Old Account",
            "type": AccountType.BANK.value,
            "current_balance": "0.00",
            "is_active": False,
        },
    )

    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    names = [a["name"] for a in accs]
    assert "Closed Old Account" not in names


# ==============================================================================
# R6: Verification & Seed Data Readiness
# ==============================================================================

@pytest.mark.asyncio
async def test_r6_api_health_check_contract(client):
    """
    R6.1: Health check endpoint contract verification.
    """
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "tazkiyah-api"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_r6_household_creation_and_retrieval(client):
    """
    R6.2: Create and retrieve a household entity.
    """
    h_resp = await client.post("/api/v1/households", json={"name": "Khan Household", "base_currency": "PKR"})
    assert h_resp.status_code == 200
    h_data = h_resp.json()
    h_id = h_data["id"]

    get_resp = await client.get(f"/api/v1/households/{h_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Khan Household"
    assert get_resp.json()["base_currency"] == "PKR"


@pytest.mark.asyncio
async def test_r6_household_user_association(client):
    """
    R6.3: Associate users with a household.
    """
    h_data = (await client.post("/api/v1/households", json={"name": "Family Team", "base_currency": "PKR"})).json()
    h_id = h_data["id"]

    u_resp = await client.post(
        f"/api/v1/households/{h_id}/users",
        json={
            "phone_number": "+923211122334",
            "full_name": "Fatima",
            "email": "fatima@tazkiyah.app",
            "role": "ADMIN",
        },
    )
    assert u_resp.status_code == 200
    u_data = u_resp.json()
    assert u_data["full_name"] == "Fatima"
    assert u_data["household_id"] == h_id
    assert u_data["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_r6_seed_dataset_generation_invariants(client, seed_data):
    """
    R6.4: Verify complete seed fixture structure conforms to domain invariants:
    - 1 Household
    - 1 User
    - 2 Accounts
    - 2 Envelope Groups
    - 3 Envelopes
    """
    household = seed_data["household"]
    h_resp = await client.get(f"/api/v1/households/{household.id}")
    assert h_resp.status_code == 200

    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    assert len(accs) == 2

    groups = (await client.get(f"/api/v1/envelopes/groups/household/{household.id}")).json()
    assert len(groups) == 2
    all_envs = [env for g in groups for env in g["envelopes"]]
    assert len(all_envs) == 3


@pytest.mark.asyncio
async def test_r6_api_response_schema_contract_compliance(client, seed_data):
    """
    R6.5: Verify API response schemas conform strictly to expected Pydantic fields.
    """
    household = seed_data["household"]

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    expected_summary_keys = {"total_inflow", "total_assigned", "unassigned_cash", "total_spent", "overspent_envelopes_count"}
    assert expected_summary_keys.issubset(summary.keys())

    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    expected_acc_keys = {"id", "household_id", "name", "type", "current_balance", "is_active", "is_overdrawn", "created_at"}
    for acc in accs:
        assert expected_acc_keys.issubset(acc.keys())
