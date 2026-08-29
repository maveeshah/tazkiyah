"""
Tier 3: Cross-Feature Combinations E2E Test Suite
Covers pairwise interactions and multi-feature cascades across Features R1 through R6.
Target: >= 10 combination test cases.
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from app.models.goal import GoalType


@pytest.mark.asyncio
async def test_tier3_transaction_triggers_account_envelope_price_and_zbb_sync(client, seed_data):
    """
    Pairwise 1: Transaction Posted ->
    1. Account balance debited: Cash (25,000 -> 24,000)
    2. Envelope spent amount incremented: Grocery (0 -> 1,000)
    3. Envelope available balance decremented: Grocery (40,000 -> 39,000)
    4. CPI price history recorded for Potato (100 PKR/kg)
    5. ZBB summary recalculated: total_spent increases by 1,000.
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
            "total_amount": "1000.00",
            "merchant": "Imtiaz",
            "source": "WHATSAPP",
            "line_items": [
                {"raw_item_name": "Potato", "quantity": "10.000", "unit": "kg", "unit_price": "100.00", "total_price": "1000.00"}
            ],
        },
    )
    assert tx_resp.status_code == 200

    # 1. Account debited
    acc = (await client.get(f"/api/v1/accounts/{cash_acc.id}?household_id={household.id}")).json()
    assert Decimal(str(acc["current_balance"])) == Decimal("24000.00")

    # 2 & 3. Envelope updated
    groups = (await client.get(f"/api/v1/envelopes/groups/household/{household.id}")).json()
    grocery = next(e for g in groups for e in g["envelopes"] if e["id"] == str(grocery_env.id))
    assert Decimal(str(grocery["spent_amount"])) == Decimal("1000.00")
    assert grocery["available_balance"] == 39000.0

    # 4. CPI recorded
    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    potato = next(t for t in trends if t["name"] == "Potato")
    assert Decimal(str(potato["latest_price"])) == Decimal("100.00")

    # 5. ZBB Summary
    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary["total_spent"])) == Decimal("1000.00")


@pytest.mark.asyncio
async def test_tier3_rebalance_preserves_zbb_invariants(client, seed_data):
    """
    Pairwise 2: Inter-envelope rebalance ->
    Transfers available funds between envelopes without modifying Total Assigned or Unassigned Cash.
    """
    household = seed_data["household"]
    dining_env = seed_data["envelopes"]["dining"]  # 15,000
    fuel_env = seed_data["envelopes"]["fuel"]      # 20,000

    summary_before = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()

    # Rebalance 8,000 from Fuel to Dining
    rebalance_resp = await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(fuel_env.id),
            "to_envelope_id": str(dining_env.id),
            "amount": "8000.00",
        },
    )
    assert rebalance_resp.status_code == 200

    summary_after = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()

    # Invariant preservation
    assert summary_before["total_inflow"] == summary_after["total_inflow"]
    assert summary_before["total_assigned"] == summary_after["total_assigned"]
    assert summary_before["unassigned_cash"] == summary_after["unassigned_cash"]


@pytest.mark.asyncio
async def test_tier3_transaction_causes_envelope_overspend_and_alert_in_zbb_summary(client, seed_data):
    """
    Pairwise 3: Transaction exceeding assigned budget triggers:
    1. Envelope available_balance becomes negative
    2. Overspent envelopes count in summary increments by 1
    3. /envelopes/overspent includes the envelope
    """
    household = seed_data["household"]
    bank_acc = seed_data["accounts"]["bank"]
    fuel_env = seed_data["envelopes"]["fuel"]  # assigned: 20,000

    # Spend 24,000 on Fuel
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(bank_acc.id),
            "envelope_id": str(fuel_env.id),
            "total_amount": "24000.00",
            "merchant": "Shell",
            "source": "MOBILE",
            "line_items": [{"raw_item_name": "Petrol", "quantity": "80.000", "unit": "liter", "total_price": "24000.00"}],
        },
    )

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert summary["overspent_envelopes_count"] == 1

    overspent = (await client.get(f"/api/v1/envelopes/overspent/{household.id}")).json()
    assert len(overspent) == 1
    assert overspent[0]["id"] == str(fuel_env.id)
    assert overspent[0]["available_balance"] == -4000.0


@pytest.mark.asyncio
async def test_tier3_rebalance_clears_overspent_envelope_state(client, seed_data):
    """
    Pairwise 4: Overspending an envelope followed by a rebalance transfer into it:
    1. Fuel overspent by 4,000 (assigned 20k, spent 24k -> available -4k).
    2. Rebalance 5,000 from Grocery (assigned 40k -> 35k) into Fuel (assigned 20k -> 25k).
    3. Fuel available becomes +1,000.
    4. Overspent count drops from 1 back to 0.
    """
    household = seed_data["household"]
    bank_acc = seed_data["accounts"]["bank"]
    fuel_env = seed_data["envelopes"]["fuel"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Step 1: Overspend
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(bank_acc.id),
            "envelope_id": str(fuel_env.id),
            "total_amount": "24000.00",
            "merchant": "Shell",
            "source": "MOBILE",
            "line_items": [{"raw_item_name": "Petrol", "quantity": "80.000", "unit": "liter", "total_price": "24000.00"}],
        },
    )

    assert (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()["overspent_envelopes_count"] == 1

    # Step 2: Rebalance to cover overspend
    await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(grocery_env.id),
            "to_envelope_id": str(fuel_env.id),
            "amount": "5000.00",
        },
    )

    # Step 3 & 4: Clear overspent state
    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert summary["overspent_envelopes_count"] == 0

    overspent = (await client.get(f"/api/v1/envelopes/overspent/{household.id}")).json()
    assert len(overspent) == 0


@pytest.mark.asyncio
async def test_tier3_goal_linked_envelope_pacing_and_budget_allocation(client, seed_data):
    """
    Pairwise 5: Create a goal, allocate savings, and verify goal pacing dynamically updates.
    Target: 300,000 PKR by date in 6 months.
    Current Balance: 0 -> Pacing = 50,000 PKR/month.
    """
    household = seed_data["household"]
    target_dt = date(date.today().year, date.today().month + 6 if date.today().month <= 6 else 12, 1)

    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Umrah 2027 Sinking Fund",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "300000.00",
            "target_date": target_dt.isoformat(),
            "current_balance": "0.00",
        },
    )
    assert goal_resp.status_code == 200
    goal = goal_resp.json()
    assert Decimal(str(goal["monthly_pacing"])) > Decimal("0.00")


@pytest.mark.asyncio
async def test_tier3_multi_channel_intake_updates_unified_cpi_trends(client, seed_data):
    """
    Pairwise 6: Transactions originating from WHATSAPP, WEB, and MOBILE all feed the same
    canonical item and generate a continuous price history time-series.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # WhatsApp: Roman Urdu 'aaloo' @ 80
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "80.00",
            "merchant": "Vendor A",
            "source": "WHATSAPP",
            "line_items": [{"raw_item_name": "aaloo", "quantity": "1.000", "unit": "kg", "total_price": "80.00"}],
        },
    )

    # Web: 'Potato' @ 100
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "100.00",
            "merchant": "Vendor B",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Potato", "quantity": "1.000", "unit": "kg", "total_price": "100.00"}],
        },
    )

    # Mobile: 'potatoes' @ 110
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "110.00",
            "merchant": "Vendor C",
            "source": "MOBILE",
            "line_items": [{"raw_item_name": "potatoes", "quantity": "1.000", "unit": "kg", "total_price": "110.00"}],
        },
    )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    potato = next(t for t in trends if t["name"] == "Potato")
    assert len(potato["history"]) == 3
    assert Decimal(str(potato["latest_price"])) == Decimal("110.00")
    assert Decimal(str(potato["previous_price"])) == Decimal("100.00")
    assert potato["inflation_rate_percentage"] == 10.0


@pytest.mark.asyncio
async def test_tier3_overdraft_reflected_in_inflow_but_unassigned_cash_stable(client, seed_data):
    """
    Pairwise 7: Spending is drawn from the envelope's budget, not from "to be
    assigned". unassigned_cash = inflow - assigned + spent, so spending (even
    spending that overdraws the account) leaves unassigned_cash unchanged; only
    the account balance / total_inflow and the overspent count move.
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]  # 25,000
    grocery_env = seed_data["envelopes"]["grocery"]  # assigned 40,000

    # Initial: Inflow 175,000, Assigned 75,000, Spent 0, Unassigned 100,000.
    initial = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(initial["unassigned_cash"])) == Decimal("100000.00")

    # Spend 35,000 from Cash on Grocery (within its 40,000 budget). Cash -> -10,000.
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "35000.00",
            "merchant": "Hospital Pharmacy",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Medicine", "quantity": "1.000", "unit": "pack", "total_price": "35000.00"}],
        },
    )

    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary["total_inflow"])) == Decimal("140000.00")   # 175k - 35k
    assert Decimal(str(summary["total_spent"])) == Decimal("35000.00")
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("100000.00")  # unchanged by spending
    assert summary["overspent_envelopes_count"] == 0

    # The account is now overdrawn and flagged.
    acc = (await client.get(f"/api/v1/accounts/{cash_acc.id}?household_id={household.id}")).json()
    assert Decimal(str(acc["current_balance"])) == Decimal("-10000.00")
    assert acc["is_overdrawn"] is True

    # Overspend Grocery: another 10,000 -> spent 45,000 > assigned 40,000.
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "10000.00",
            "merchant": "Hospital Pharmacy",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Follow-up", "quantity": "1.000", "unit": "visit", "total_price": "10000.00"}],
        },
    )
    summary2 = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary2["total_inflow"])) == Decimal("130000.00")
    assert Decimal(str(summary2["unassigned_cash"])) == Decimal("100000.00")  # still unchanged
    assert summary2["overspent_envelopes_count"] == 1


@pytest.mark.asyncio
async def test_tier3_new_envelope_group_and_envelope_budgeting_flow(client, seed_data):
    """
    Pairwise 8: Create new envelope group, add an envelope, and assign budget from unassigned cash.
    """
    household = seed_data["household"]

    # 1. Create group
    g_resp = await client.post(
        "/api/v1/envelopes/groups",
        json={"household_id": str(household.id), "name": "Annual Obligations", "sort_order": 3},
    )
    assert g_resp.status_code == 200
    group_id = g_resp.json()["id"]

    # 2. Create envelope
    e_resp = await client.post(
        "/api/v1/envelopes",
        json={"group_id": group_id, "name": "Zakat Fund", "target_amount": "50000.00"},
    )
    assert e_resp.status_code == 200
    env_id = e_resp.json()["id"]

    # 3. Assign 30,000 to Zakat Fund
    assign_resp = await client.post(
        f"/api/v1/envelopes/assign?household_id={household.id}",
        json={"envelope_id": env_id, "assigned_amount": "30000.00"},
    )
    assert assign_resp.status_code == 200

    # 4. Verify ZBB Summary
    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary["total_assigned"])) == Decimal("105000.00")  # 75k + 30k
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("70000.00")  # 175k - 105k


@pytest.mark.asyncio
async def test_tier3_transaction_with_multiple_different_staples_cpi_sync(client, seed_data):
    """
    Pairwise 9: A single transaction containing 3 distinct staples (Potato, Milk, Petrol)
    atomically generates 3 independent CPI price point records and trends.
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
            "total_amount": "1250.00",
            "merchant": "Mega Superstore",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "Potato", "quantity": "2.000", "unit": "kg", "unit_price": "100.00", "total_price": "200.00"},
                {"raw_item_name": "Milk", "quantity": "2.000", "unit": "liter", "unit_price": "250.00", "total_price": "500.00"},
                {"raw_item_name": "Petrol", "quantity": "2.000", "unit": "liter", "unit_price": "275.00", "total_price": "550.00"},
            ],
        },
    )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    trend_map = {t["name"]: t for t in trends}
    assert "Potato" in trend_map
    assert "Milk" in trend_map
    assert "Petrol" in trend_map


@pytest.mark.asyncio
async def test_tier3_goal_listing_includes_all_household_goals_with_pacing(client, seed_data):
    """
    Pairwise 10: Listing goals returns both target-date goals (with pacing) and sinking funds (without pacing).
    """
    household = seed_data["household"]
    future_date = date.today() + timedelta(days=120)

    # Goal 1: Target by date
    await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Umrah Trip",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "400000.00",
            "target_date": future_date.isoformat(),
            "current_balance": "80000.00",
        },
    )

    # Goal 2: Sinking Fund
    await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Car Cushion",
            "goal_type": GoalType.SINKING_FUND.value,
            "target_amount": "50000.00",
            "current_balance": "15000.00",
        },
    )

    goals = (await client.get(f"/api/v1/goals/household/{household.id}")).json()
    assert len(goals) == 2
    umrah = next(g for g in goals if g["name"] == "Umrah Trip")
    car = next(g for g in goals if g["name"] == "Car Cushion")

    assert umrah["monthly_pacing"] is not None
    assert car["monthly_pacing"] is None
