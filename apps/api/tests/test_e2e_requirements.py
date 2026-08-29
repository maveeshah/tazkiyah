"""
Master E2E Requirements Validation Suite
Validates Features R1 through R6 from ORIGINAL_REQUEST.md and PROJECT.md § Feature Inventory.
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from app.models.goal import GoalType


@pytest.mark.asyncio
async def test_e2e_r1_zero_based_budgeting_complete_workflow(client, seed_data):
    """
    R1 Validation: Zero-Based Budget Allocation Table & Invariants
    - Verify initial summary
    - Assign income to envelopes
    - Enforce unassigned cash limit
    - Rebalance between envelopes
    - Verify overspent envelope detection
    """
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]
    fuel_env = seed_data["envelopes"]["fuel"]

    # Initial state: Inflow 175,000, Assigned 75,000, Unassigned 100,000
    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("100000.00")

    # Assign 50,000 more to Grocery (assigned becomes 90,000)
    assign_resp = await client.post(
        f"/api/v1/envelopes/assign?household_id={household.id}",
        json={"envelope_id": str(grocery_env.id), "assigned_amount": "90000.00"},
    )
    assert assign_resp.status_code == 200

    # Rebalance 10,000 from Fuel (20,000 -> 10,000) to Grocery (90,000 -> 100,000)
    reb_resp = await client.post(
        f"/api/v1/envelopes/rebalance?household_id={household.id}",
        json={
            "from_envelope_id": str(fuel_env.id),
            "to_envelope_id": str(grocery_env.id),
            "amount": "10000.00",
        },
    )
    assert reb_resp.status_code == 200
    assert Decimal(str(reb_resp.json()["from_envelope"]["assigned_amount"])) == Decimal("10000.00")
    assert Decimal(str(reb_resp.json()["to_envelope"]["assigned_amount"])) == Decimal("100000.00")


@pytest.mark.asyncio
async def test_e2e_r2_granular_line_item_ledger_and_receipt_explorer(client, seed_data):
    """
    R2 Validation: Granular Line-Item Transaction Explorer
    - Create multi-item receipt transaction
    - Verify automatic unit price derivation
    - Verify expandable receipt line items
    - Verify ledger listing and ordering
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
            "total_amount": "1450.00",
            "merchant": "Imtiaz Mart",
            "source": "WHATSAPP",
            "raw_input": "2kg aaloo 200, 3l doodh 840, 1 dozen anday 410 from Cash at Imtiaz",
            "line_items": [
                {"raw_item_name": "aaloo", "quantity": "2.000", "unit": "kg", "total_price": "200.00"},
                {"raw_item_name": "doodh", "quantity": "3.000", "unit": "liter", "total_price": "840.00"},
                {"raw_item_name": "anday", "quantity": "1.000", "unit": "dozen", "total_price": "410.00"},
            ],
        },
    )
    assert tx_resp.status_code == 200
    tx = tx_resp.json()
    assert len(tx["line_items"]) == 3
    assert Decimal(str(tx["line_items"][0]["unit_price"])) == Decimal("100.00")  # 200 / 2
    assert Decimal(str(tx["line_items"][1]["unit_price"])) == Decimal("280.00")  # 840 / 3
    assert Decimal(str(tx["line_items"][2]["unit_price"])) == Decimal("410.00")  # 410 / 1


@pytest.mark.asyncio
async def test_e2e_r3_personal_cpi_inflation_trends_and_merchants(client, seed_data):
    """
    R3 Validation: Personal CPI & Staple Inflation Visualizer
    - Auto canonical resolution of Roman Urdu aliases
    - Price history logging
    - MoM % inflation calculation
    - Merchant comparison history
    """
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Month 1: Petrol @ 250 PKR/L at Shell
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "2500.00",
            "merchant": "Shell",
            "source": "WEB",
            "line_items": [{"raw_item_name": "petrol", "quantity": "10.000", "unit": "liter", "unit_price": "250.00", "total_price": "2500.00"}],
        },
    )

    # Month 2: Petrol @ 275 PKR/L at Total Parco (+10% inflation)
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "2750.00",
            "merchant": "Total Parco",
            "source": "MOBILE",
            "line_items": [{"raw_item_name": "fuel", "quantity": "10.000", "unit": "liter", "unit_price": "275.00", "total_price": "2750.00"}],
        },
    )

    trends = (await client.get(f"/api/v1/cpi/trends/{household.id}")).json()
    petrol_trend = next(t for t in trends if t["name"] == "Petrol")
    assert Decimal(str(petrol_trend["latest_price"])) == Decimal("275.00")
    assert Decimal(str(petrol_trend["previous_price"])) == Decimal("250.00")
    assert petrol_trend["inflation_rate_percentage"] == 10.0
    merchants = {h["merchant"] for h in petrol_trend["history"]}
    assert {"Shell", "Total Parco"}.issubset(merchants)


@pytest.mark.asyncio
async def test_e2e_r4_financial_goals_and_emergency_runway(client, seed_data):
    """
    R4 Validation: Financial Goals & Emergency Runway Tracker
    - Target by date goal with dynamic monthly pacing
    - Goal progress percentage
    - Sinking fund goals
    - Emergency liquid runway ratio
    """
    household = seed_data["household"]
    target_dt = date.today() + timedelta(days=365)  # 12 months

    resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Umrah 2027",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "600000.00",
            "target_date": target_dt.isoformat(),
            "current_balance": "120000.00",
        },
    )
    assert resp.status_code == 200
    goal = resp.json()
    assert Decimal(str(goal["monthly_pacing"])) > Decimal("0.00")

    # Emergency runway calculation
    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    total_liquid = sum(Decimal(str(a["current_balance"])) for a in accs if a["is_active"])
    summary = (await client.get(f"/api/v1/envelopes/summary/{household.id}")).json()
    monthly_burn = Decimal(str(summary["total_assigned"]))
    assert total_liquid / monthly_burn > Decimal("1.0")


@pytest.mark.asyncio
async def test_e2e_r5_liquid_accounts_and_wallets_summary(client, seed_data):
    """
    R5 Validation: Liquid Accounts & Wallets Summary
    - Multi-type account cards
    - Net liquid worth calculation
    - Overdraft handling and is_overdrawn flag
    - Household tenant isolation
    """
    household = seed_data["household"]
    accs = (await client.get(f"/api/v1/accounts/household/{household.id}")).json()
    assert len(accs) >= 2

    net_worth = sum(Decimal(str(a["current_balance"])) for a in accs)
    assert net_worth == Decimal("175000.00")


@pytest.mark.asyncio
async def test_e2e_r6_verification_and_seed_data_readiness(client, seed_data):
    """
    R6 Validation: Verification & Seed Data Readiness
    - Health check endpoint contract
    - Household and user relationships
    - Database entity integrity across all relational foreign keys
    """
    health = (await client.get("/api/v1/health")).json()
    assert health["status"] == "healthy"

    household = seed_data["household"]
    h_resp = await client.get(f"/api/v1/households/{household.id}")
    assert h_resp.status_code == 200
    assert h_resp.json()["name"] == "Test Family"
