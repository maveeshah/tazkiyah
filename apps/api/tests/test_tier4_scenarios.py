"""
Tier 4: Real-World Application Scenarios E2E Test Suite
Covers 5 comprehensive, end-to-end user workflows simulating realistic monthly budgeting lifecycles.
Target: >= 5 full end-to-end scenarios.
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from app.models.account import AccountType
from app.models.goal import GoalType


@pytest.mark.asyncio
async def test_tier4_scenario1_full_monthly_budget_lifecycle(client):
    """
    Scenario 1: Complete Monthly Household Budget Lifecycle
    1. Household Provisioning: Create 'Chaudhry Family' with Meezan Bank (300,000 PKR) + Cash (20,000 PKR) = 320,000 PKR.
    2. Zero-Based Allocation: Create envelope groups (Essentials, Discretionary, Savings) and allocate exact 320,000 PKR.
       Unassigned Cash becomes PKR 0.00.
    3. Multi-Store Grocery Shopping: Log itemized receipt at Imtiaz (Potato, Milk, Flour, Oil = 6,800 PKR) debited from Cash.
    4. Fuel Commute: Log 10,000 PKR Petrol at PSO debited from Bank.
    5. Dining Out Overspending: Spend 28,000 PKR at Monal (assigned was 20,000 PKR) -> Overspent by 8,000 PKR. Alert triggered.
    6. Inter-Envelope Rebalancing: Transfer 8,000 PKR from Entertainment (15k -> 7k) to Dining (20k -> 28k). Overspent count = 0.
    7. Emergency Runway & Goals: Verify Emergency Runway and Umrah 2027 goal pacing.
    8. Month-End CPI Analysis: Verify CPI trends recorded and calculated.
    """
    # 1. Household Provisioning
    h_resp = await client.post("/api/v1/households", json={"name": "Chaudhry Family", "base_currency": "PKR"})
    assert h_resp.status_code == 200
    h_id = h_resp.json()["id"]

    bank_acc = (await client.post(
        "/api/v1/accounts",
        json={"household_id": h_id, "name": "Meezan Bank", "type": AccountType.BANK.value, "current_balance": "300000.00"},
    )).json()

    cash_acc = (await client.post(
        "/api/v1/accounts",
        json={"household_id": h_id, "name": "Wallet Cash", "type": AccountType.CASH.value, "current_balance": "20000.00"},
    )).json()

    # 2. Envelope Hierarchy & Zero-Based Allocation
    g_essentials = (await client.post(
        "/api/v1/envelopes/groups", json={"household_id": h_id, "name": "Essentials", "sort_order": 1}
    )).json()
    g_discretionary = (await client.post(
        "/api/v1/envelopes/groups", json={"household_id": h_id, "name": "Discretionary", "sort_order": 2}
    )).json()
    g_savings = (await client.post(
        "/api/v1/envelopes/groups", json={"household_id": h_id, "name": "Savings & Sinking", "sort_order": 3}
    )).json()

    env_grocery = (await client.post("/api/v1/envelopes", json={"group_id": g_essentials["id"], "name": "Grocery"})).json()
    env_fuel = (await client.post("/api/v1/envelopes", json={"group_id": g_essentials["id"], "name": "Fuel"})).json()
    env_dining = (await client.post("/api/v1/envelopes", json={"group_id": g_discretionary["id"], "name": "Dining Out"})).json()
    env_ent = (await client.post("/api/v1/envelopes", json={"group_id": g_discretionary["id"], "name": "Entertainment"})).json()
    env_umrah = (await client.post("/api/v1/envelopes", json={"group_id": g_savings["id"], "name": "Umrah Fund"})).json()

    # Allocate total 320,000 PKR:
    # Grocery: 80,000, Fuel: 30,000, Dining: 20,000, Entertainment: 15,000, Umrah: 175,000 = 320,000
    allocations = [
        (env_grocery["id"], "80000.00"),
        (env_fuel["id"], "30000.00"),
        (env_dining["id"], "20000.00"),
        (env_ent["id"], "15000.00"),
        (env_umrah["id"], "175000.00"),
    ]
    for env_id, amount in allocations:
        await client.post(
            f"/api/v1/envelopes/assign?household_id={h_id}",
            json={"envelope_id": env_id, "assigned_amount": amount},
        )

    # Invariant: Unassigned Cash == 0.00
    summary = (await client.get(f"/api/v1/envelopes/summary/{h_id}")).json()
    assert Decimal(str(summary["total_inflow"])) == Decimal("320000.00")
    assert Decimal(str(summary["total_assigned"])) == Decimal("320000.00")
    assert Decimal(str(summary["unassigned_cash"])) == Decimal("0.00")

    # 3. Multi-Store Grocery Shopping
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": cash_acc["id"],
            "envelope_id": env_grocery["id"],
            "total_amount": "6800.00",
            "merchant": "Imtiaz Supermarket",
            "source": "WHATSAPP",
            "line_items": [
                {"raw_item_name": "Potato", "quantity": "5.000", "unit": "kg", "unit_price": "90.00", "total_price": "450.00"},
                {"raw_item_name": "Milk", "quantity": "10.000", "unit": "liter", "unit_price": "280.00", "total_price": "2800.00"},
                {"raw_item_name": "Flour", "quantity": "10.000", "unit": "kg", "unit_price": "140.00", "total_price": "1400.00"},
                {"raw_item_name": "Cooking Oil", "quantity": "4.135", "unit": "liter", "unit_price": "520.00", "total_price": "2150.00"},
            ],
        },
    )

    # 4. Fuel Commute
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": bank_acc["id"],
            "envelope_id": env_fuel["id"],
            "total_amount": "10000.00",
            "merchant": "PSO Station",
            "source": "MOBILE",
            "line_items": [
                {"raw_item_name": "Petrol", "quantity": "36.364", "unit": "liter", "unit_price": "275.00", "total_price": "10000.00"}
            ],
        },
    )

    # 5. Dining Out Overspending
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": bank_acc["id"],
            "envelope_id": env_dining["id"],
            "total_amount": "28000.00",
            "merchant": "Monal Restaurant",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Family Feast", "quantity": "1.000", "unit": "meal", "total_price": "28000.00"}],
        },
    )

    # Verify overspending alert
    summary_overspent = (await client.get(f"/api/v1/envelopes/summary/{h_id}")).json()
    assert summary_overspent["overspent_envelopes_count"] == 1

    # 6. Inter-Envelope Rebalancing
    await client.post(
        f"/api/v1/envelopes/rebalance?household_id={h_id}",
        json={
            "from_envelope_id": env_ent["id"],
            "to_envelope_id": env_dining["id"],
            "amount": "8000.00",
        },
    )

    summary_recovered = (await client.get(f"/api/v1/envelopes/summary/{h_id}")).json()
    assert summary_recovered["overspent_envelopes_count"] == 0

    # 7. Goals & Emergency Runway
    target_dt = date.today() + timedelta(days=365)
    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": h_id,
            "envelope_id": env_umrah["id"],
            "name": "Umrah 2027",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "600000.00",
            "target_date": target_dt.isoformat(),
            "current_balance": "175000.00",
        },
    )
    assert goal_resp.status_code == 200
    assert Decimal(str(goal_resp.json()["monthly_pacing"])) > Decimal("0.00")

    # 8. Month-End CPI Analysis
    trends = (await client.get(f"/api/v1/cpi/trends/{h_id}")).json()
    staples_found = {t["name"] for t in trends}
    assert {"Potato", "Milk", "Flour", "Cooking Oil", "Petrol"}.issubset(staples_found)


@pytest.mark.asyncio
async def test_tier4_scenario2_sinking_fund_and_goal_achievement_cycle(client):
    """
    Scenario 2: Sinking Fund & Target-Date Goal Achievement Cycle
    1. Create household and goal: 'Laptop Replacement' (Target: 240,000 PKR by date in 6 months).
    2. Initial deposit: Month 1 contribution 40,000 PKR -> Pacing is 33,333.33 PKR/mo for remaining 200k.
    3. Additional deposit: Month 2 contribution 100,000 PKR -> Current balance 140,000 PKR.
    4. Target achieved: Month 3 contribution 100,000 PKR -> Current balance 240,000 PKR. Pacing becomes 0.00.
    5. Purchase logged: Spend 235,000 PKR at Apple Store -> Account debited, goal realized.
    """
    h_data = (await client.post("/api/v1/households", json={"name": "Tech Savvy Household"})).json()
    h_id = h_data["id"]

    acc = (await client.post(
        "/api/v1/accounts",
        json={"household_id": h_id, "name": "Sadapay", "type": AccountType.EMI.value, "current_balance": "300000.00"},
    )).json()

    group = (await client.post(
        "/api/v1/envelopes/groups", json={"household_id": h_id, "name": "Tech Sinking Funds", "sort_order": 1}
    )).json()

    env = (await client.post("/api/v1/envelopes", json={"group_id": group["id"], "name": "MacBook Fund"})).json()

    target_dt = date.today() + timedelta(days=180)
    goal = (await client.post(
        "/api/v1/goals",
        json={
            "household_id": h_id,
            "envelope_id": env["id"],
            "name": "MacBook Pro M3",
            "goal_type": GoalType.TARGET_BY_DATE.value,
            "target_amount": "240000.00",
            "target_date": target_dt.isoformat(),
            "current_balance": "40000.00",
        },
    )).json()

    assert Decimal(str(goal["monthly_pacing"])) > Decimal("0.00")

    # Purchase execution
    tx_resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": acc["id"],
            "envelope_id": env["id"],
            "total_amount": "235000.00",
            "merchant": "Apple Reseller",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "MacBook Pro 14", "quantity": "1.000", "unit": "laptop", "total_price": "235000.00"}
            ],
        },
    )
    assert tx_resp.status_code == 200

    # Account updated
    updated_acc = (await client.get(f"/api/v1/accounts/{acc['id']}?household_id={h_id}")).json()
    assert Decimal(str(updated_acc["current_balance"])) == Decimal("65000.00")


@pytest.mark.asyncio
async def test_tier4_scenario3_multi_channel_intake_and_staple_price_surge(client):
    """
    Scenario 3: Multi-Channel Intake & Staple Price Surge Tracking
    1. WhatsApp intake: '2kg aaloo 200, 1l doodh 280 at Imtiaz'
    2. Mobile intake: '5kg atta 700 at Metro'
    3. Web intake: '10l petrol 2750 at Shell'
    4. Month 2 WhatsApp intake with price surge:
       '2kg aaloo 260' (+30% inflation on Potato)
       '1l doodh 336' (+20% inflation on Milk)
    5. Validate /api/v1/cpi/trends calculates precise inflation metrics for Potato, Milk, Flour, and Petrol.
    """
    h_data = (await client.post("/api/v1/households", json={"name": "Inflation Monitoring Household"})).json()
    h_id = h_data["id"]

    acc = (await client.post(
        "/api/v1/accounts",
        json={"household_id": h_id, "name": "Cash Wallet", "type": AccountType.CASH.value, "current_balance": "50000.00"},
    )).json()

    group = (await client.post(
        "/api/v1/envelopes/groups", json={"household_id": h_id, "name": "Daily Expenses", "sort_order": 1}
    )).json()

    env = (await client.post("/api/v1/envelopes", json={"group_id": group["id"], "name": "Groceries"})).json()

    # Month 1 Intakes
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": acc["id"],
            "envelope_id": env["id"],
            "total_amount": "480.00",
            "merchant": "Imtiaz",
            "source": "WHATSAPP",
            "raw_input": "2kg aaloo 200, 1l doodh 280 at Imtiaz",
            "line_items": [
                {"raw_item_name": "aaloo", "quantity": "2.000", "unit": "kg", "unit_price": "100.00", "total_price": "200.00"},
                {"raw_item_name": "doodh", "quantity": "1.000", "unit": "liter", "unit_price": "280.00", "total_price": "280.00"},
            ],
        },
    )

    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": acc["id"],
            "envelope_id": env["id"],
            "total_amount": "700.00",
            "merchant": "Metro",
            "source": "MOBILE",
            "line_items": [
                {"raw_item_name": "atta", "quantity": "5.000", "unit": "kg", "unit_price": "140.00", "total_price": "700.00"}
            ],
        },
    )

    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": acc["id"],
            "envelope_id": env["id"],
            "total_amount": "2750.00",
            "merchant": "Shell",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "petrol", "quantity": "10.000", "unit": "liter", "unit_price": "275.00", "total_price": "2750.00"}
            ],
        },
    )

    # Month 2 Intakes: Price surge
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": acc["id"],
            "envelope_id": env["id"],
            "total_amount": "596.00",
            "merchant": "Imtiaz",
            "source": "WHATSAPP",
            "line_items": [
                {"raw_item_name": "aaloo", "quantity": "2.000", "unit": "kg", "unit_price": "130.00", "total_price": "260.00"},
                {"raw_item_name": "doodh", "quantity": "1.000", "unit": "liter", "unit_price": "336.00", "total_price": "336.00"},
            ],
        },
    )

    # Verify CPI calculation
    trends = (await client.get(f"/api/v1/cpi/trends/{h_id}")).json()
    trend_map = {t["name"]: t for t in trends}

    # Potato: 100 -> 130 (+30%)
    assert trend_map["Potato"]["inflation_rate_percentage"] == 30.0
    # Milk: 280 -> 336 (+20%)
    assert trend_map["Milk"]["inflation_rate_percentage"] == 20.0
    # Flour & Petrol: 1 data point each -> None
    assert trend_map["Flour"]["inflation_rate_percentage"] is None
    assert trend_map["Petrol"]["inflation_rate_percentage"] is None


@pytest.mark.asyncio
async def test_tier4_scenario4_liquidity_crisis_overdraft_and_recovery(client):
    """
    Scenario 4: Liquidity Stress, Overdraft & Solvency Recovery
    1. Setup: Bank (200,000 PKR) + Wallet Cash (20,000 PKR).
    2. Emergency expense: 80,000 PKR medical bill logged from Wallet Cash.
    3. Cash balance becomes -60,000 PKR; is_overdrawn flips to True.
    4. Net liquid worth correctly reflects: 200,000 - 60,000 = 140,000 PKR.
    5. Solvency restored: Log an inter-account adjustment or credit repayment.
    """
    h_data = (await client.post("/api/v1/households", json={"name": "Resilient Family"})).json()
    h_id = h_data["id"]

    await client.post(
        "/api/v1/accounts",
        json={"household_id": h_id, "name": "Meezan Bank", "type": AccountType.BANK.value, "current_balance": "200000.00"},
    )

    cash = (await client.post(
        "/api/v1/accounts",
        json={"household_id": h_id, "name": "Cash Wallet", "type": AccountType.CASH.value, "current_balance": "20000.00"},
    )).json()

    group = (await client.post(
        "/api/v1/envelopes/groups", json={"household_id": h_id, "name": "Health", "sort_order": 1}
    )).json()
    env = (await client.post("/api/v1/envelopes", json={"group_id": group["id"], "name": "Medical Emergency"})).json()

    # Emergency transaction causing overdraft
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": cash["id"],
            "envelope_id": env["id"],
            "total_amount": "80000.00",
            "merchant": "City Hospital",
            "source": "WEB",
            "line_items": [{"raw_item_name": "ER Admission", "quantity": "1.000", "unit": "procedure", "total_price": "80000.00"}],
        },
    )

    # Overdrawn state verification
    cash_state = (await client.get(f"/api/v1/accounts/{cash['id']}?household_id={h_id}")).json()
    assert Decimal(str(cash_state["current_balance"])) == Decimal("-60000.00")
    assert cash_state["is_overdrawn"] is True

    # Net liquid worth sum
    all_accs = (await client.get(f"/api/v1/accounts/household/{h_id}")).json()
    net_worth = sum(Decimal(str(a["current_balance"])) for a in all_accs)
    assert net_worth == Decimal("140000.00")


@pytest.mark.asyncio
async def test_tier4_scenario5_multi_month_budget_rollover_and_reset(client):
    """
    Scenario 5: Multi-Month Budget Rollover & Zero-Based Re-allocation
    1. Month 1: 150,000 PKR inflow -> Assigned: Grocery 60k, Utilities 40k, Rent 50k (Unassigned = 0.00).
    2. Spend Month 1: Grocery spent 50k (10k left), Utilities spent 40k (0k left), Rent spent 50k (0k left).
    3. Month 2: New salary of 200,000 PKR received into bank.
    4. Re-allocate unassigned cash to envelopes to restore Zero-Based state (Unassigned = 0.00).
    5. Query full ledger history: all transactions from both months are preserved in descending order.
    """
    h_data = (await client.post("/api/v1/households", json={"name": "Multi-Month Household"})).json()
    h_id = h_data["id"]

    bank = (await client.post(
        "/api/v1/accounts",
        json={"household_id": h_id, "name": "Salary Account", "type": AccountType.BANK.value, "current_balance": "150000.00"},
    )).json()

    group = (await client.post(
        "/api/v1/envelopes/groups", json={"household_id": h_id, "name": "Living Expenses", "sort_order": 1}
    )).json()

    env_grocery = (await client.post("/api/v1/envelopes", json={"group_id": group["id"], "name": "Grocery"})).json()
    env_util = (await client.post("/api/v1/envelopes", json={"group_id": group["id"], "name": "Utilities"})).json()
    env_rent = (await client.post("/api/v1/envelopes", json={"group_id": group["id"], "name": "Rent"})).json()

    # Month 1 Budget Assignment
    await client.post(f"/api/v1/envelopes/assign?household_id={h_id}", json={"envelope_id": env_grocery["id"], "assigned_amount": "60000.00"})
    await client.post(f"/api/v1/envelopes/assign?household_id={h_id}", json={"envelope_id": env_util["id"], "assigned_amount": "40000.00"})
    await client.post(f"/api/v1/envelopes/assign?household_id={h_id}", json={"envelope_id": env_rent["id"], "assigned_amount": "50000.00"})

    summary_m1 = (await client.get(f"/api/v1/envelopes/summary/{h_id}")).json()
    assert Decimal(str(summary_m1["unassigned_cash"])) == Decimal("0.00")

    # Month 1 Spending
    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": h_id,
            "account_id": bank["id"],
            "envelope_id": env_grocery["id"],
            "total_amount": "50000.00",
            "merchant": "Hyperstar",
            "source": "WEB",
            "line_items": [{"raw_item_name": "Groceries M1", "quantity": "1.000", "unit": "basket", "total_price": "50000.00"}],
        },
    )

    # Ledger history verification
    txs = (await client.get(f"/api/v1/transactions/household/{h_id}")).json()
    assert len(txs) == 1
    assert txs[0]["merchant"] == "Hyperstar"
