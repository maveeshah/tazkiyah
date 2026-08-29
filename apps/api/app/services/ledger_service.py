from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.exceptions import NotFoundError, InvalidOperationError
from app.models.account import Account
from app.models.transaction import Transaction, LineItem
from app.schemas.transaction import TransactionCreate, TransactionUpdate, LineItemCreate
from app.services.cpi_service import CPIService
from app.services.common import get_household_envelope

# Line-item totals are allowed to drift from the transaction total by at most this
# (rounding when a unit price is back-derived from qty).
LINE_ITEM_SUM_TOLERANCE = Decimal("0.01")


class LedgerService:
    # ---- helpers -----------------------------------------------------------

    @staticmethod
    def _validate_amounts(total_amount: Decimal, line_items: list[LineItemCreate]) -> None:
        if total_amount <= 0:
            raise InvalidOperationError("Transaction total_amount must be greater than zero")
        if line_items:
            line_sum = sum((li.total_price for li in line_items), Decimal("0.00"))
            if abs(line_sum - total_amount) > LINE_ITEM_SUM_TOLERANCE:
                raise InvalidOperationError(
                    f"Line items sum to {line_sum} but transaction total is {total_amount}",
                )

    @staticmethod
    async def _fetch_account(household_id: UUID, account_id: UUID, db: AsyncSession, *, require_active: bool) -> Account:
        conditions = [Account.id == account_id, Account.household_id == household_id]
        if require_active:
            conditions.append(Account.is_active == True)
        result = await db.execute(select(Account).where(*conditions))
        account = result.scalar_one_or_none()
        if not account:
            raise NotFoundError("Account not found" + (" or inactive" if require_active else ""))
        return account

    @staticmethod
    async def _add_line_items(
        transaction: Transaction,
        household_id: UUID,
        line_items: list[LineItemCreate],
        merchant: str | None,
        db: AsyncSession,
    ) -> None:
        for item_data in line_items:
            unit_price = item_data.unit_price
            if unit_price is None and item_data.quantity > 0:
                unit_price = item_data.total_price / item_data.quantity

            canonical_item = await CPIService.match_or_create_canonical_item(
                household_id=household_id,
                raw_name=item_data.raw_item_name,
                standard_unit=item_data.unit,
                db=db,
            )

            if unit_price is not None:
                await CPIService.record_price_history(
                    canonical_item_id=canonical_item.id,
                    unit_price=unit_price,
                    unit=item_data.unit,
                    merchant=merchant,
                    db=db,
                )

            db.add(
                LineItem(
                    transaction_id=transaction.id,
                    canonical_item_id=canonical_item.id,
                    raw_item_name=item_data.raw_item_name,
                    quantity=item_data.quantity,
                    unit=item_data.unit,
                    unit_price=unit_price,
                    total_price=item_data.total_price,
                    notes=item_data.notes,
                )
            )

    @staticmethod
    async def _reload(transaction_id: UUID, db: AsyncSession) -> Transaction:
        result = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.line_items))
            .where(Transaction.id == transaction_id)
        )
        return result.scalar_one()

    # ---- CRUD ------------------------------------------------------------

    @classmethod
    async def create_transaction(cls, payload: TransactionCreate, db: AsyncSession) -> Transaction:
        cls._validate_amounts(payload.total_amount, payload.line_items)

        account = await cls._fetch_account(payload.household_id, payload.account_id, db, require_active=True)
        envelope = await get_household_envelope(payload.household_id, payload.envelope_id, db)
        if not envelope:
            raise NotFoundError("Envelope not found")

        account.current_balance -= payload.total_amount
        envelope.spent_amount += payload.total_amount

        transaction = Transaction(
            household_id=payload.household_id,
            account_id=payload.account_id,
            envelope_id=payload.envelope_id,
            total_amount=payload.total_amount,
            merchant=payload.merchant,
            source=payload.source,
            raw_input=payload.raw_input,
            transacted_at=payload.transacted_at or datetime.now(timezone.utc),
        )
        db.add(transaction)
        await db.flush()

        await cls._add_line_items(transaction, payload.household_id, payload.line_items, payload.merchant, db)

        await db.commit()
        return await cls._reload(transaction.id, db)

    @classmethod
    async def get_transaction(cls, transaction_id: UUID, household_id: UUID, db: AsyncSession) -> Transaction:
        result = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.line_items))
            .where(Transaction.id == transaction_id, Transaction.household_id == household_id)
        )
        transaction = result.scalar_one_or_none()
        if not transaction:
            raise NotFoundError("Transaction not found")
        return transaction

    @classmethod
    async def delete_transaction(cls, transaction_id: UUID, household_id: UUID, db: AsyncSession) -> None:
        transaction = await cls.get_transaction(transaction_id, household_id, db)

        # Reverse the ledger effects. Price-history rows are left in place — a price
        # was genuinely observed at the time (see docs/adr/0005).
        account = await cls._fetch_account(household_id, transaction.account_id, db, require_active=False)
        envelope = await get_household_envelope(household_id, transaction.envelope_id, db)
        account.current_balance += transaction.total_amount
        if envelope is not None:
            envelope.spent_amount -= transaction.total_amount

        await db.delete(transaction)  # line_items cascade
        await db.commit()

    @classmethod
    async def update_transaction(
        cls,
        transaction_id: UUID,
        household_id: UUID,
        payload: TransactionUpdate,
        db: AsyncSession,
    ) -> Transaction:
        transaction = await cls.get_transaction(transaction_id, household_id, db)

        old_account = await cls._fetch_account(household_id, transaction.account_id, db, require_active=False)
        old_envelope = await get_household_envelope(household_id, transaction.envelope_id, db)

        # Resolve the post-edit account / envelope / total.
        new_account = old_account
        if payload.account_id is not None and payload.account_id != transaction.account_id:
            new_account = await cls._fetch_account(household_id, payload.account_id, db, require_active=True)

        new_envelope = old_envelope
        if payload.envelope_id is not None and payload.envelope_id != transaction.envelope_id:
            new_envelope = await get_household_envelope(household_id, payload.envelope_id, db)
            if new_envelope is None:
                raise NotFoundError("Envelope not found")

        new_total = payload.total_amount if payload.total_amount is not None else transaction.total_amount
        new_merchant = payload.merchant if payload.merchant is not None else transaction.merchant

        # Line items: replace the whole set if provided, else keep the existing ones.
        replacing_items = payload.line_items is not None
        effective_items = payload.line_items if replacing_items else [
            LineItemCreate(
                raw_item_name=li.raw_item_name,
                quantity=li.quantity,
                unit=li.unit,
                unit_price=li.unit_price,
                total_price=li.total_price,
                notes=li.notes,
            )
            for li in transaction.line_items
        ]
        cls._validate_amounts(new_total, effective_items)

        # Reverse old effects, apply new.
        old_account.current_balance += transaction.total_amount
        if old_envelope is not None:
            old_envelope.spent_amount -= transaction.total_amount
        new_account.current_balance -= new_total
        if new_envelope is not None:
            new_envelope.spent_amount += new_total

        transaction.account_id = new_account.id
        if new_envelope is not None:
            transaction.envelope_id = new_envelope.id
        transaction.total_amount = new_total
        if payload.merchant is not None:
            transaction.merchant = payload.merchant
        if payload.raw_input is not None:
            transaction.raw_input = payload.raw_input
        if payload.transacted_at is not None:
            transaction.transacted_at = payload.transacted_at

        if replacing_items:
            # delete-orphan cascade removes items dropped from the collection
            transaction.line_items.clear()
            await db.flush()
            await cls._add_line_items(transaction, household_id, payload.line_items, new_merchant, db)

        await db.commit()
        return await cls._reload(transaction.id, db)
