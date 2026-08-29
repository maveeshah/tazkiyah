import pytest
from decimal import Decimal
from app.core.exceptions import InvalidOperationError
from app.schemas.transaction import TransactionCreate, LineItemCreate
from app.models.transaction import TransactionSource
from app.services.ledger_service import LedgerService
from app.services.zbb_service import ZBBService


@pytest.mark.asyncio
async def test_create_transaction_rejects_nonpositive_total(db_session, seed_data):
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    for bad in (Decimal("0.00"), Decimal("-100.00")):
        with pytest.raises(InvalidOperationError):
            await LedgerService.create_transaction(
                payload=TransactionCreate(
                    household_id=household.id,
                    account_id=cash_acc.id,
                    envelope_id=grocery_env.id,
                    total_amount=bad,
                    source=TransactionSource.WEB,
                    line_items=[],
                ),
                db=db_session,
            )


@pytest.mark.asyncio
async def test_create_transaction_rejects_line_item_sum_mismatch(db_session, seed_data):
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    with pytest.raises(InvalidOperationError):
        await LedgerService.create_transaction(
            payload=TransactionCreate(
                household_id=household.id,
                account_id=cash_acc.id,
                envelope_id=grocery_env.id,
                total_amount=Decimal("1000.00"),
                source=TransactionSource.WEB,
                line_items=[
                    LineItemCreate(raw_item_name="A", total_price=Decimal("400.00")),
                    LineItemCreate(raw_item_name="B", total_price=Decimal("300.00")),
                ],
            ),
            db=db_session,
        )

@pytest.mark.asyncio
async def test_create_transaction_with_granular_line_items(db_session, seed_data):
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    # Log 1.25kg Potato @ 100/kg (125 PKR) + 2L Milk @ 290/L (580 PKR) = Total 705 PKR
    payload = TransactionCreate(
        household_id=household.id,
        account_id=cash_acc.id,
        envelope_id=grocery_env.id,
        total_amount=Decimal("705.00"),
        merchant="Imtiaz Supermarket",
        source=TransactionSource.WHATSAPP,
        raw_input="1.25kg potato for 125, 2l milk for 580 from cash at Imtiaz",
        line_items=[
            LineItemCreate(
                raw_item_name="Potato",
                quantity=Decimal("1.250"),
                unit="kg",
                unit_price=Decimal("100.00"),
                total_price=Decimal("125.00"),
            ),
            LineItemCreate(
                raw_item_name="Milk",
                quantity=Decimal("2.000"),
                unit="liter",
                unit_price=Decimal("290.00"),
                total_price=Decimal("580.00"),
            ),
        ],
    )

    tx = await LedgerService.create_transaction(payload=payload, db=db_session)

    assert tx.id is not None
    assert tx.total_amount == Decimal("705.00")
    assert len(tx.line_items) == 2

    # Verify Account was debited: 25,000 - 705 = 24,295
    await db_session.refresh(cash_acc)
    assert cash_acc.current_balance == Decimal("24295.00")

    # Verify Envelope spent_amount was updated: 0 + 705 = 705
    await db_session.refresh(grocery_env)
    assert grocery_env.spent_amount == Decimal("705.00")
    assert grocery_env.available_balance == 40000.00 - 705.00

@pytest.mark.asyncio
async def test_overspending_triggers_alert(db_session, seed_data):
    household = seed_data["household"]
    bank_acc = seed_data["accounts"]["bank"]
    dining_env = seed_data["envelopes"]["dining"]  # assigned: 15,000

    # Spend 18,000 on Dining (3,000 overspent)
    payload = TransactionCreate(
        household_id=household.id,
        account_id=bank_acc.id,
        envelope_id=dining_env.id,
        total_amount=Decimal("18000.00"),
        merchant="Kolachi Restaurant",
        source=TransactionSource.WHATSAPP,
        line_items=[
            LineItemCreate(
                raw_item_name="Family Dinner",
                quantity=Decimal("1.000"),
                unit="meal",
                total_price=Decimal("18000.00"),
            )
        ],
    )

    await LedgerService.create_transaction(payload=payload, db=db_session)
    await db_session.refresh(dining_env)

    assert dining_env.spent_amount == Decimal("18000.00")
    assert dining_env.available_balance == -3000.00

    summary = await ZBBService.get_zbb_summary(household_id=household.id, db=db_session)
    assert summary.overspent_envelopes_count == 1

@pytest.mark.asyncio
async def test_account_overdraft_is_allowed_and_flagged(db_session, seed_data):
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]  # balance: 25,000
    grocery_env = seed_data["envelopes"]["grocery"]  # assigned: 40,000

    assert cash_acc.is_overdrawn is False

    # Spend more than the account holds. This must succeed (accounts are
    # allowed to go negative, mirroring how envelope overspend is handled)
    # rather than being rejected outright.
    payload = TransactionCreate(
        household_id=household.id,
        account_id=cash_acc.id,
        envelope_id=grocery_env.id,
        total_amount=Decimal("30000.00"),
        merchant="Emergency Vet Bill",
        source=TransactionSource.WHATSAPP,
        line_items=[
            LineItemCreate(
                raw_item_name="Vet Bill",
                quantity=Decimal("1.000"),
                unit="service",
                total_price=Decimal("30000.00"),
            )
        ],
    )

    await LedgerService.create_transaction(payload=payload, db=db_session)
    await db_session.refresh(cash_acc)

    assert cash_acc.current_balance == Decimal("-5000.00")
    assert cash_acc.is_overdrawn is True
