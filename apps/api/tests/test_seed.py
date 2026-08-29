import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.household import Household
from app.models.account import Account, AccountType
from app.models.envelope import EnvelopeGroup, Envelope
from app.models.transaction import Transaction
from app.models.goal import Goal, GoalType
from app.services.zbb_service import ZBBService
from app.services.cpi_service import CPIService
from scripts.seed_demo_data import seed_demo_data


@pytest.mark.asyncio
async def test_seed_demo_data_complete_lifecycle(db_session):
    # 1. Run Seeder
    result = await seed_demo_data(session=db_session)
    assert result is not None
    household_id = result["household_id"]

    # 2. Verify Household & User (R1, R5)
    hh_res = await db_session.execute(
        select(Household)
        .options(selectinload(Household.users))
        .where(Household.id == household_id)
    )
    household = hh_res.scalar_one()
    assert household.name == "Mavee Household"
    assert household.base_currency == "PKR"
    assert len(household.users) == 1
    user = household.users[0]
    assert user.full_name == "Mavee"
    assert user.phone_number == "+923001234567"
    assert user.email == "mavee@tazkiyah.app"
    assert user.role == "ADMIN"

    # 3. Verify Accounts (R5)
    acc_res = await db_session.execute(
        select(Account).where(Account.household_id == household_id, Account.is_active == True)
    )
    accounts = acc_res.scalars().all()
    assert len(accounts) == 4
    acc_dict = {a.name: a for a in accounts}
    assert "Wallet Cash" in acc_dict
    assert "Meezan Bank" in acc_dict
    assert "Sadapay" in acc_dict
    assert "Nayapay" in acc_dict

    # Opening balances (25k/180k/40k/30k = 275k) are debited by the 18 seeded
    # transactions (150k total) -> 125k liquid inflow post-seed; Sadapay goes overdrawn.
    assert acc_dict["Wallet Cash"].type == AccountType.CASH
    assert acc_dict["Wallet Cash"].current_balance == Decimal("4850.00")
    assert acc_dict["Meezan Bank"].type == AccountType.BANK
    assert acc_dict["Meezan Bank"].current_balance == Decimal("115300.00")
    assert acc_dict["Sadapay"].type == AccountType.EMI
    assert acc_dict["Sadapay"].current_balance == Decimal("-1600.00")
    assert acc_dict["Sadapay"].is_overdrawn is True
    assert acc_dict["Nayapay"].type == AccountType.EMI
    assert acc_dict["Nayapay"].current_balance == Decimal("6450.00")

    total_inflow = sum(a.current_balance for a in accounts)
    assert total_inflow == Decimal("125000.00")

    # 4. Verify Envelope Groups & Envelopes (R1)
    grp_res = await db_session.execute(
        select(EnvelopeGroup)
        .options(selectinload(EnvelopeGroup.envelopes))
        .where(EnvelopeGroup.household_id == household_id)
        .order_by(EnvelopeGroup.sort_order)
    )
    groups = grp_res.scalars().all()
    assert len(groups) == 3
    assert [g.name for g in groups] == ["Daily Living", "Discretionary", "Savings & Sinking Funds"]

    env_res = await db_session.execute(
        select(Envelope)
        .join(EnvelopeGroup, Envelope.group_id == EnvelopeGroup.id)
        .where(EnvelopeGroup.household_id == household_id)
    )
    envelopes = env_res.scalars().all()
    assert len(envelopes) == 8
    env_dict = {e.name: e for e in envelopes}

    # Verify specific envelope allocations
    assert env_dict["Grocery"].assigned_amount == Decimal("60000.00")
    assert env_dict["Grocery"].spent_amount == Decimal("42500.00")
    assert env_dict["Grocery"].available_balance == 17500.00

    assert env_dict["Fuel & Commute"].assigned_amount == Decimal("35000.00")
    assert env_dict["Fuel & Commute"].spent_amount == Decimal("28000.00")

    assert env_dict["Utilities & Bills"].assigned_amount == Decimal("30000.00")
    assert env_dict["Utilities & Bills"].spent_amount == Decimal("29500.00")

    # Overspent envelope check
    assert env_dict["Dining Out"].assigned_amount == Decimal("20000.00")
    assert env_dict["Dining Out"].spent_amount == Decimal("24800.00")
    assert env_dict["Dining Out"].available_balance == -4800.00

    assert env_dict["Shopping & Personal"].assigned_amount == Decimal("25000.00")
    assert env_dict["Shopping & Personal"].spent_amount == Decimal("18200.00")

    assert env_dict["Umrah 2027"].assigned_amount == Decimal("40000.00")
    assert env_dict["Umrah 2027"].spent_amount == Decimal("0.00")

    assert env_dict["Emergency Cushion"].assigned_amount == Decimal("50000.00")
    assert env_dict["Emergency Cushion"].spent_amount == Decimal("0.00")

    assert env_dict["Vehicle Maintenance"].assigned_amount == Decimal("15000.00")
    assert env_dict["Vehicle Maintenance"].spent_amount == Decimal("7000.00")

    # 5. Verify ZBB Invariants — unassigned_cash = inflow - assigned + spent
    zbb_summary = await ZBBService.get_zbb_summary(household_id=household_id, db=db_session)
    assert zbb_summary.total_inflow == Decimal("125000.00")
    assert zbb_summary.total_assigned == Decimal("275000.00")
    assert zbb_summary.unassigned_cash == Decimal("0.00")
    assert zbb_summary.total_spent == Decimal("150000.00")
    assert zbb_summary.overspent_envelopes_count == 1

    overspent_envs = await ZBBService.get_overspent_envelopes(household_id=household_id, db=db_session)
    assert len(overspent_envs) == 1
    assert overspent_envs[0].name == "Dining Out"

    # 6. Verify Canonical Items & CPI Trends (R3)
    cpi_trends = await CPIService.get_cpi_trends(household_id=household_id, db=db_session)
    assert len(cpi_trends) == 10
    cpi_dict = {item.name: item for item in cpi_trends}

    assert "Potato" in cpi_dict
    assert "Milk" in cpi_dict
    assert "Eggs" in cpi_dict
    assert "Petrol" in cpi_dict
    assert "Flour" in cpi_dict
    assert "Cooking Oil" in cpi_dict
    assert "Onion" in cpi_dict
    assert "Tomato" in cpi_dict
    assert "Sugar" in cpi_dict
    assert "Rice" in cpi_dict

    # Check that each item has 4+ historical price points showing inflation
    for name, item in cpi_dict.items():
        assert len(item.history) >= 4
        assert item.latest_price is not None
        assert item.previous_price is not None
        assert item.latest_price >= item.previous_price
        assert item.inflation_rate_percentage is not None
        assert item.inflation_rate_percentage >= 0

    # 7. Verify Granular Transactions (R2)
    tx_res = await db_session.execute(
        select(Transaction)
        .options(selectinload(Transaction.line_items))
        .where(Transaction.household_id == household_id)
    )
    transactions = tx_res.scalars().all()
    assert len(transactions) == 18

    total_spent_txs = sum(t.total_amount for t in transactions)
    assert total_spent_txs == Decimal("150000.00")

    for t in transactions:
        assert len(t.line_items) >= 1
        line_item_total = sum(li.total_price for li in t.line_items)
        assert line_item_total == t.total_amount

    # 8. Verify Financial Goals (R4)
    goals_res = await db_session.execute(
        select(Goal).where(Goal.household_id == household_id)
    )
    goals = goals_res.scalars().all()
    assert len(goals) == 3
    goals_dict = {g.name: g for g in goals}

    assert "Umrah 2027" in goals_dict
    assert goals_dict["Umrah 2027"].goal_type == GoalType.TARGET_BY_DATE
    assert goals_dict["Umrah 2027"].target_amount == Decimal("800000.00")
    assert goals_dict["Umrah 2027"].current_balance == Decimal("160000.00")
    assert goals_dict["Umrah 2027"].target_date == date(2027, 6, 1)

    assert "Emergency Cushion" in goals_dict
    assert goals_dict["Emergency Cushion"].goal_type == GoalType.TARGET_CAP
    assert goals_dict["Emergency Cushion"].target_amount == Decimal("500000.00")
    assert goals_dict["Emergency Cushion"].current_balance == Decimal("220000.00")

    assert "Vehicle Maintenance" in goals_dict
    assert goals_dict["Vehicle Maintenance"].goal_type == GoalType.SINKING_FUND
    assert goals_dict["Vehicle Maintenance"].target_amount == Decimal("100000.00")
    assert goals_dict["Vehicle Maintenance"].current_balance == Decimal("45000.00")

    # 9. Test Idempotency: Re-running seed_demo_data should succeed without duplicate key errors
    result2 = await seed_demo_data(session=db_session)
    assert result2["household_id"] is not None
