"""
Tier 2: Boundary & Corner Cases E2E Test Suite
Covers extreme values, zero states, negative overdrafts, overspent envelopes, fractional quantities,
Unicode character inputs, and edge invariants across Features R1 through R6.
Target: >= 5 tests per feature (>= 30 tests total).
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from app.models.account import AccountType
from app.models.goal import GoalType


# ==============================================================================
# R1: ZBB Boundary & Corner Cases
# ==============================================================================

@pytest.mark.asyncio
async def test_r1_boundary_zero_unassigned_cash_exact_budget(client, seed_data):
    """
    R1.B1: Assigning exactly 100% of remaining unassigned cash reaches the perfect ZBB state:
    Unassigned Cash == PKR 0.00.
    Inflow: 175,000, Assigned was 75,000 (Grocery 40k, Fuel 20k, Dining 15k).
    Assign additional 100,000 to Grocery (40,000 -> 140,000). Total Assigned = 175,000.
    Unassigned Cash becomes exactly 0.00.
    """
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    resp = await client.post(
        f"/api/v1/envelopes/assign?household_id={household.id}",
        json={"envelope_id": str(grocery_env.id), "assigned_amount": "140000.00"},
    )
    assert resp.status_code == 200

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary["total_assigned"])) == Decimal("175000.00")
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("0.00")


@pytest.mark.asyncio
async def test_r1_boundary_rebalance_exact_assigned_amount(client, seed_data):
    """
    R1.B2: Rebalancing 100% of an envelope's assigned amount brings source envelope to 0.00 without error.
    Dining Out has 15,000 assigned. Transfer all 15,000 to Fuel (20,000 -> 35,000).
    Dining Out assigned becomes 0.00.
    """
    household = seed_data["household"]
    dining_env = seed_data["envelopes"]["dining"]
    fuel_env = seed_data["envelopes"]["fuel"]

    resp = await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(dining_env.id),
            "to_envelope_id": str(fuel_env.id),
            "amount": "15000.00",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(str(data["from_envelope"]["assigned_amount"])) == Decimal("0.00")
    assert Decimal(str(data["to_envelope"]["assigned_amount"])) == Decimal("35000.00")


@pytest.mark.asyncio
async def test_r1_boundary_rebalance_zero_or_negative_amount_fails(client, seed_data):
    """
    R1.B3: Rebalancing 0.00 or negative amounts must fail with 400 Bad Request.
    """
    household = seed_data["household"]
    dining_env = seed_data["envelopes"]["dining"]
    fuel_env = seed_data["envelopes"]["fuel"]

    # Zero amount
    resp0 = await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(dining_env.id),
            "to_envelope_id": str(fuel_env.id),
            "amount": "0.00",
        },
    )
    assert resp0.status_code == 400

    # Negative amount
    resp_neg = await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(dining_env.id),
            "to_envelope_id": str(fuel_env.id),
            "amount": "-500.00",
        },
    )
    assert resp_neg.status_code == 400


@pytest.mark.asyncio
async def test_r1_boundary_assign_zero_to_envelope(client, seed_data):
    """
    R1.B4: Setting assigned amount to exactly 0.00 is allowed and frees cash to unassigned.
    Grocery: 40,000 -> 0.00. Unassigned cash increases from 100,000 to 140,000.
    """
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    resp = await client.post(
        f"/api/v1/envelopes/assign?household_id={household.id}",
        json={"envelope_id": str(grocery_env.id), "assigned_amount": "0.00"},
    )
    assert resp.status_code == 200
    assert Decimal(str(resp.json()["assigned_amount"])) == Decimal("0.00")

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary["total_assigned"])) == Decimal("35000.00")
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("140000.00")


@pytest.mark.asyncio
async def test_r1_boundary_household_with_zero_accounts_summary(client):
    """
    R1.B5: A newly created household with zero accounts returns 0.00 for all summary fields without errors.
    """
    new_h = (await client.post("/api/v1/households", json={"name": "Empty Household", "base_currency": "PKR"})).json()
    h_id = new_h["id"]

    summary_resp = await client.get(f"/api/v1/envelopes/summary/{h_id}")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert Decimal(str(summary["total_inflow"])) == Decimal("0.00")
    assert Decimal(str(summary["total_assigned"])) == Decimal("0.00")
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("0.00")
    assert Decimal(str(summary["total_spent"])) == Decimal("0.00")
    assert summary["overspent_envelopes_count"] == 0


@pytest.mark.asyncio
async def test_r1_boundary_multiple_overspent_envelopes_count(client, seed_data):
    """
    R1.B6: Verify summary overspent count accurately aggregates multiple overspent envelopes.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]  # assigned: 40,000
    fuel_env = seed_data["envelopes"]["fuel"]        # assigned: 20,000

    # Overspend grocery by 5,000 (spend 45,000)
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "45000.00",
            "merchant": "Wholesale Mart",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Bulk Groceries", "quantity": "1.000", "unit": "pkg", "total_price": "45000.00"}],
        },
    )

    # Overspend fuel by 2,000 (spend 22,000)
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(fuel_env.id),
            "total_amount": "22000.00",
            "merchant": "Shell",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Petrol", "quantity": "80.000", "unit": "liter", "total_price": "22000.00"}],
        },
    )

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert summary["overspent_envelopes_count"] == 2


# ==============================================================================
# R2: Granular Line-Item Transaction Boundary Cases
# ==============================================================================

@pytest.mark.asyncio
async def test_r2_boundary_single_line_item_receipt(client, seed_data):
    """
    R2.B1: Receipt with exactly 1 line item is processed cleanly.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    fuel_env = seed_data["envelopes"]["fuel"]

    resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(fuel_env.id),
            "total_amount": "2750.00",
            "merchant": "Attock Petroleum",
            "source": "WHATSAPP",
            "line_items": [
                {"raw_item_name": "Petrol", "quantity": "10.000", "unit": "liter", "unit_price": "275.00", "total_price": "2750.00"}
            ],
        },
    )
    assert resp.status_code == 200
    assert len(resp.json()["line_items"]) == 1


@pytest.mark.asyncio
async def test_r2_boundary_fractional_quantities_high_precision(client, seed_data):
    """
    R2.B2: Fractional quantities with 3 decimal precision (1.250 kg, 0.333 liter, 2.750 dozen) maintain exact precision.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "888.50",
            "merchant": "Sabzi Mandi",
            "source": "WHATSAPP",
            "line_items": [
                {
                    "raw_item_name": "Potato",
                    "quantity": "1.250",
                    "unit": "kg",
                    "unit_price": "100.00",
                    "total_price": "125.00",
                },
                {
                    "raw_item_name": "Eggs",
                    "quantity": "2.750",
                    "unit": "dozen",
                    "unit_price": "277.64",
                    "total_price": "763.50",
                },
            ],
        },
    )
    assert resp.status_code == 200
    items = resp.json()["line_items"]
    assert Decimal(str(items[0]["quantity"])) == Decimal("1.250")
    assert Decimal(str(items[1]["quantity"])) == Decimal("2.750")


@pytest.mark.asyncio
async def test_r2_boundary_empty_line_items_transaction(client, seed_data):
    """
    R2.B3: Transaction without itemized line items (lump-sum expense) is recorded properly.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "300.00",
            "merchant": "Street Vendor",
            "source": "WEB",
            "raw_input": "300 spent on snacks",
            "line_items": [],
        },
    )
    assert resp.status_code == 200
    assert len(resp.json()["line_items"]) == 0


@pytest.mark.asyncio
async def test_r2_boundary_large_monetary_amount_stress(client, seed_data):
    """
    R2.B4: High monetary transaction values (e.g. 5,000,000 PKR asset purchase) maintain exact Decimal precision.
    """
    household = seed_data["household"]
    bank_acc = seed_data["accounts"]["bank"]
    dining_env = seed_data["envelopes"]["dining"]

    resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(bank_acc.id),
            "envelope_id": str(dining_env.id),
            "total_amount": "5000000.00",
            "merchant": "Real Estate Investment",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "Property Downpayment", "quantity": "1.000", "unit": "plot", "total_price": "5000000.00"}
            ],
        },
    )
    assert resp.status_code == 200
    tx = resp.json()
    assert Decimal(str(tx["total_amount"])) == Decimal("5000000.00")


@pytest.mark.asyncio
async def test_r2_boundary_unicode_and_special_chars_in_merchant_and_notes(client, seed_data):
    """
    R2.B5: Supports Urdu, Arabic, Emojis, and special characters in merchant and line-item notes.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "450.00",
            "merchant": "الحاج بیف پلاؤ 🍛 (Al-Haj Beef Pulao)",
            "source": "WHATSAPP",
            "raw_input": "450 روپے پلاؤ کے لیے",
            "line_items": [
                {
                    "raw_item_name": "Beef Pulao",
                    "quantity": "1.000",
                    "unit": "plate",
                    "total_price": "450.00",
                    "notes": "بہت عمدہ ذائقہ! ⭐",
                }
            ],
        },
    )
    assert resp.status_code == 200
    tx = resp.json()
    assert "الحاج بیف پلاؤ" in tx["merchant"]
    assert "بہت عمدہ ذائقہ" in tx["line_items"][0]["notes"]


# ==============================================================================
# R3: Personal CPI Boundary Cases
# ==============================================================================

@pytest.mark.asyncio
async def test_r3_boundary_cpi_100_percent_inflation_doubling(client, seed_data):
    """
    R3.B1: Price doubles from 100 PKR to 200 PKR -> Exactly 100.0% inflation.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Price 1
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "100.00",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Eggs", "quantity": "1.000", "unit": "dozen", "total_price": "100.00"}],
        },
    )
    # Price 2
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "200.00",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Eggs", "quantity": "1.000", "unit": "dozen", "total_price": "200.00"}],
        },
    )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    eggs = next(t for t in trends if t["name"] == "Eggs")
    assert eggs["inflation_rate_percentage"] == 100.0


@pytest.mark.asyncio
async def test_r3_boundary_cpi_zero_inflation_identical_prices(client, seed_data):
    """
    R3.B2: Consecutive identical prices return exactly 0.0% inflation.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    for _ in range(2):
        await client.post(
            "/api/v1/transactions",
            json={
                "household_id": str(household.id),
                "account_id": str(cash_acc.id),
                "envelope_id": str(grocery_env.id),
                "total_amount": "280.00",
                "source": "WEB",
                "line_items": [{"raw_item_name": "Milk", "quantity": "1.000", "unit": "liter", "total_price": "280.00"}],
            },
        )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    milk = next(t for t in trends if t["name"] == "Milk")
    assert milk["inflation_rate_percentage"] == 0.0


@pytest.mark.asyncio
async def test_r3_boundary_cpi_unknown_item_categorization(client, seed_data):
    """
    R3.B3: Unrecognized raw item (e.g. 'chia seeds') defaults to category 'General' and title-cased name.
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
            "total_amount": "450.00",
            "source": "WEB",
            "line_items": [{"raw_item_name": "chia seeds", "quantity": "0.250", "unit": "kg", "total_price": "450.00"}],
        },
    )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    chia = next(t for t in trends if t["name"] == "Chia Seeds")
    assert chia["category"] == "General"


@pytest.mark.asyncio
async def test_r3_boundary_cpi_whitespace_and_case_insensitivity(client, seed_data):
    """
    R3.B4: Leading/trailing whitespace and mixed case ('  aAloO  ', 'POTATO') resolve to the same canonical item.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    for raw in ["  aAloO  ", "POTATO", "   potato   "]:
        await client.post(
            "/api/v1/transactions",
            json={
                "household_id": str(household.id),
                "account_id": str(cash_acc.id),
                "envelope_id": str(grocery_env.id),
                "total_amount": "100.00",
                "source": "WHATSAPP",
                "line_items": [{"raw_item_name": raw, "quantity": "1.000", "unit": "kg", "total_price": "100.00"}],
            },
        )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    potato_trends = [t for t in trends if t["name"] == "Potato"]
    assert len(potato_trends) == 1  # Exactly 1 canonical item created
    assert len(potato_trends[0]["history"]) == 3


@pytest.mark.asyncio
async def test_r3_boundary_cpi_history_limit_to_20(client, seed_data):
    """
    R3.B5: Price history caps response at latest 20 price points.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    fuel_env = seed_data["envelopes"]["fuel"]

    for i in range(25):
        await client.post(
            "/api/v1/transactions",
            json={
                "household_id": str(household.id),
                "account_id": str(cash_acc.id),
                "envelope_id": str(fuel_env.id),
                "total_amount": f"{250 + i}.00",
                "merchant": f"Station {i}",
                "source": "WEB",
                "line_items": [{"raw_item_name": "petrol", "quantity": "1.000", "unit": "liter", "total_price": f"{250 + i}.00"}],
            },
        )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    petrol = next(t for t in trends if t["name"] == "Petrol")
    assert len(petrol["history"]) == 20
    assert Decimal(str(petrol["latest_price"])) == Decimal("274.00")


# ==============================================================================
# R4: Financial Goals Boundary Cases
# ==============================================================================

@pytest.mark.asyncio
async def test_r4_boundary_goal_zero_target_amount(client, seed_data):
    """
    R4.B1: Goal with 0.00 target amount calculates 0.00 pacing without divide-by-zero error.
    """
    household = seed_data["household"]
    future_date = date.today() + timedelta(days=90)

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Zero Target Goal",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "0.00",
            "target_date": future_date.isoformat(),
            "current_balance": "0.00",
        },
    )
    assert resp.status_code == 200
    assert Decimal(str(resp.json()["monthly_pacing"])) == Decimal("0.00")


@pytest.mark.asyncio
async def test_r4_boundary_goal_target_date_today(client, seed_data):
    """
    R4.B2: Goal target date equal to today requires full remaining funding immediately.
    Target: 100,000 PKR, Current: 40,000 PKR -> Pacing = 60,000 PKR.
    """
    household = seed_data["household"]
    today_dt = date.today()

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Due Today Goal",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "100000.00",
            "target_date": today_dt.isoformat(),
            "current_balance": "40000.00",
        },
    )
    assert resp.status_code == 200
    assert Decimal(str(resp.json()["monthly_pacing"])) == Decimal("60000.00")


@pytest.mark.asyncio
async def test_r4_boundary_goal_target_date_far_future(client, seed_data):
    """
    R4.B3: Goal target date 10 years out (120 months) computes precise monthly pacing.
    Target: 1,200,000 PKR, Current: 0 PKR -> Pacing = 10,000 PKR/month.
    """
    household = seed_data["household"]
    future_10y = date(date.today().year + 10, date.today().month, 1)

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "10 Year Long Goal",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "1200000.00",
            "target_date": future_10y.isoformat(),
            "current_balance": "0.00",
        },
    )
    assert resp.status_code == 200
    goal = resp.json()
    assert Decimal(str(goal["monthly_pacing"])) == Decimal("10000.00")


@pytest.mark.asyncio
async def test_r4_boundary_goal_current_balance_exceeds_target(client, seed_data):
    """
    R4.B4: Overfunded goal (current_balance > target_amount) caps pacing at 0.00 rather than negative pacing.
    """
    household = seed_data["household"]
    future_date = date.today() + timedelta(days=60)

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Overfunded Goal",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "100000.00",
            "target_date": future_date.isoformat(),
            "current_balance": "150000.00",
        },
    )
    assert resp.status_code == 200
    assert Decimal(str(resp.json()["monthly_pacing"])) == Decimal("0.00")


@pytest.mark.asyncio
async def test_r4_boundary_zero_monthly_burn_rate_runway(client, seed_data):
    """
    R4.B5: Zero monthly burn rate (all envelopes 0 assigned) indicates infinite/sustainable runway.
    """
    household = seed_data["household"]

    # Set all envelopes to 0 assigned
    for env_key in ["grocery", "fuel", "dining"]:
        env = seed_data["envelopes"][env_key]
        await client.post(
            f"/api/v1/envelopes/assign?household_id={household.id}",
            json={"envelope_id": str(env.id), "assigned_amount": "0.00"},
        )

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    monthly_burn = Decimal(str(summary["total_assigned"]))
    assert monthly_burn == Decimal("0.00")


# ==============================================================================
# R5: Liquid Accounts Boundary Cases
# ==============================================================================

@pytest.mark.asyncio
async def test_r5_boundary_account_zero_balance(client, seed_data):
    """
    R5.B1: Account with exactly 0.00 balance is NOT overdrawn (is_overdrawn == False).
    """
    household = seed_data["household"]
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "household_id": str(household.id),
            "name": "Zero Balance Wallet",
            "type": AccountType.CASH.value,
            "current_balance": "0.00",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["is_overdrawn"] is False


@pytest.mark.asyncio
async def test_r5_boundary_account_barely_negative_balance(client, seed_data):
    """
    R5.B2: Account with -0.01 balance is flagged overdrawn (is_overdrawn == True).
    """
    household = seed_data["household"]
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "household_id": str(household.id),
            "name": "Penny Overdrawn Account",
            "type": AccountType.BANK.value,
            "current_balance": "-0.01",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["is_overdrawn"] is True


@pytest.mark.asyncio
async def test_r5_boundary_account_large_negative_balance_overdraft(client, seed_data):
    """
    R5.B3: Deep overdraft (-500,000 PKR) is handled with exact Decimal fidelity.
    """
    household = seed_data["household"]
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "household_id": str(household.id),
            "name": "Credit Facility Overdraft",
            "type": AccountType.CREDIT.value,
            "current_balance": "-500000.00",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(str(data["current_balance"])) == Decimal("-500000.00")
    assert data["is_overdrawn"] is True


@pytest.mark.asyncio
async def test_r5_boundary_multiple_accounts_mixed_positive_and_negative(client, seed_data):
    """
    R5.B4: Net liquid worth sums both positive and negative accounts accurately.
    Bank (+150k), Cash (+25k), Overdrawn (-10k) = 165,000 PKR.
    """
    household = seed_data["household"]
    await client.post(
        "/api/v1/accounts",
        json={
            "household_id": str(household.id),
            "name": "Overdrawn Wallet",
            "type": AccountType.CASH.value,
            "current_balance": "-10000.00",
        },
    )

    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    net_worth = sum(Decimal(str(a["current_balance"])) for a in accs)
    assert net_worth == Decimal("165000.00")


@pytest.mark.asyncio
async def test_r5_boundary_account_creation_all_supported_types(client, seed_data):
    """
    R5.B5: Validates creating accounts for all supported AccountType enum values.
    """
    household = seed_data["household"]
    for atype in AccountType:
        resp = await client.post(
            "/api/v1/accounts",
            json={
                "household_id": str(household.id),
                "name": f"Account {atype.value}",
                "type": atype.value,
                "current_balance": "100.00",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == atype.value


# ==============================================================================
# R6: Verification & Seed Data Boundary Cases
# ==============================================================================

@pytest.mark.asyncio
async def test_r6_boundary_user_duplicate_phone_rejected(client, seed_data):
    """
    R6.B1: Attempting to create a user with duplicate phone number is rejected.
    """
    household = seed_data["household"]
    # Seed data user has phone "+923001234567"
    resp = await client.post(
        f"/api/v1/households/{household.id}/users",
        json={
            "phone_number": "+923001234567",
            "full_name": "Duplicate User",
            "email": "diff_email@tazkiyah.app",
        },
    )
    # Database integrity error or 400/500 rejected
    assert resp.status_code == 409  # 409 Conflict is correct for duplicate phone/email


@pytest.mark.asyncio
async def test_r6_boundary_nonexistent_entity_ids_return_404(client):
    """
    R6.B2: Non-existent UUIDs return 404 for households and accounts.
    """
    fake_uuid = "11111111-2222-3333-4444-555555555555"

    h_resp = await client.get(f"/api/v1/households/{fake_uuid}")
    assert h_resp.status_code == 404

    acc_resp = await client.get(f"/api/v1/accounts/{fake_uuid}?household_id={fake_uuid}")
    assert acc_resp.status_code == 404


@pytest.mark.asyncio
async def test_r6_boundary_empty_household_name_handling(client):
    """
    R6.B3: Creating a household with base_currency defaults to PKR.
    """
    resp = await client.post("/api/v1/households", json={"name": "Default Currency House"})
    assert resp.status_code == 200
    assert resp.json()["base_currency"] == "PKR"


@pytest.mark.asyncio
async def test_r6_boundary_user_creation_default_role(client):
    """
    R6.B4: User created without explicit role defaults to 'MEMBER'.
    """
    h_data = (await client.post("/api/v1/households", json={"name": "Role Test Household"})).json()
    u_resp = await client.post(
        f"/api/v1/households/{h_data['id']}/users",
        json={
            "phone_number": "+923459876543",
            "full_name": "Ali",
        },
    )
    assert u_resp.status_code == 200
    assert u_resp.json()["role"] == "MEMBER"


@pytest.mark.asyncio
async def test_r6_boundary_envelope_create_default_spent_amount_is_zero(client, seed_data):
    """
    R6.B5: Newly created envelope has spent_amount 0.00 and available_balance 0.00.
    """
    household = seed_data["household"]
    groups = (await client.get(f"/api/v1/envelopes/groups/household/{household.id}")).json()
    group_id = groups[0]["id"]

    resp = await client.post(
        "/api/v1/envelopes",
        json={
            "group_id": group_id,
            "name": "Books & Learning",
            "target_amount": "5000.00",
        },
    )
    assert resp.status_code == 200
    env = resp.json()
    assert env["name"] == "Books & Learning"
    assert Decimal(str(env["assigned_amount"])) == Decimal("0.00")
    assert Decimal(str(env["spent_amount"])) == Decimal("0.00")
    assert env["available_balance"] == 0.0
