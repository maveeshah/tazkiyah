import pytest
from decimal import Decimal
from app.core.exceptions import InvalidOperationError
from app.services.zbb_service import ZBBService

@pytest.mark.asyncio
async def test_zbb_summary_and_invariants(db_session, seed_data):
    household = seed_data["household"]
    
    # Total Inflow: 25,000 (Cash) + 150,000 (Meezan) = 175,000
    # Total Assigned: 40,000 (Grocery) + 20,000 (Fuel) + 15,000 (Dining) = 75,000
    # Unassigned Cash: 175,000 - 75,000 = 100,000
    summary = await ZBBService.get_zbb_summary(household_id=household.id, db=db_session)

    assert summary.total_inflow == Decimal("175000.00")
    assert summary.total_assigned == Decimal("75000.00")
    assert summary.unassigned_cash == Decimal("100000.00")
    assert summary.overspent_envelopes_count == 0

@pytest.mark.asyncio
async def test_assign_income_to_envelope(db_session, seed_data):
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    updated = await ZBBService.assign_envelope(
        household_id=household.id,
        envelope_id=grocery_env.id,
        assigned_amount=Decimal("50000.00"),
        db=db_session,
    )
    assert updated.assigned_amount == Decimal("50000.00")

    summary = await ZBBService.get_zbb_summary(household_id=household.id, db=db_session)
    assert summary.total_assigned == Decimal("85000.00")
    assert summary.unassigned_cash == Decimal("90000.00")

@pytest.mark.asyncio
async def test_assign_envelope_rejects_overcommit(db_session, seed_data):
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]  # currently assigned: 40,000

    # Unassigned cash is 100,000; grocery already holds 40,000, so at most
    # 140,000 can be assigned to it. Ask for more than that.
    with pytest.raises(InvalidOperationError):
        await ZBBService.assign_envelope(
            household_id=household.id,
            envelope_id=grocery_env.id,
            assigned_amount=Decimal("150000.00"),
            db=db_session,
        )

    # The envelope must be left untouched by the rejected assignment.
    await db_session.refresh(grocery_env)
    assert grocery_env.assigned_amount == Decimal("40000.00")

@pytest.mark.asyncio
async def test_assign_envelope_rejects_negative_amount(db_session, seed_data):
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    with pytest.raises(InvalidOperationError):
        await ZBBService.assign_envelope(
            household_id=household.id,
            envelope_id=grocery_env.id,
            assigned_amount=Decimal("-100.00"),
            db=db_session,
        )

@pytest.mark.asyncio
async def test_rebalance_to_self_rejected(db_session, seed_data):
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]

    with pytest.raises(InvalidOperationError):
        await ZBBService.rebalance_envelopes(
            household_id=household.id,
            from_envelope_id=grocery_env.id,
            to_envelope_id=grocery_env.id,
            amount=Decimal("1000.00"),
            db=db_session,
        )


@pytest.mark.asyncio
async def test_spending_does_not_change_unassigned_cash(db_session, seed_data):
    from app.schemas.transaction import TransactionCreate, LineItemCreate
    from app.models.transaction import TransactionSource
    from app.services.ledger_service import LedgerService

    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    before = await ZBBService.get_zbb_summary(household_id=household.id, db=db_session)

    await LedgerService.create_transaction(
        payload=TransactionCreate(
            household_id=household.id,
            account_id=cash_acc.id,
            envelope_id=grocery_env.id,
            total_amount=Decimal("5000.00"),
            source=TransactionSource.WEB,
            line_items=[LineItemCreate(raw_item_name="Groceries", total_price=Decimal("5000.00"))],
        ),
        db=db_session,
    )

    after = await ZBBService.get_zbb_summary(household_id=household.id, db=db_session)
    assert after.unassigned_cash == before.unassigned_cash
    assert after.total_inflow == before.total_inflow - Decimal("5000.00")
    assert after.total_spent == before.total_spent + Decimal("5000.00")


@pytest.mark.asyncio
async def test_rebalance_envelopes(db_session, seed_data):
    household = seed_data["household"]
    dining_env = seed_data["envelopes"]["dining"]  # 15,000
    grocery_env = seed_data["envelopes"]["grocery"]  # 40,000

    # Transfer 5,000 from Dining to Grocery
    from_env, to_env = await ZBBService.rebalance_envelopes(
        household_id=household.id,
        from_envelope_id=dining_env.id,
        to_envelope_id=grocery_env.id,
        amount=Decimal("5000.00"),
        db=db_session,
    )

    assert from_env.assigned_amount == Decimal("10000.00")
    assert to_env.assigned_amount == Decimal("45000.00")
