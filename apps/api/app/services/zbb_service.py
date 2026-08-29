from uuid import UUID
from decimal import Decimal
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from app.core.exceptions import NotFoundError, InvalidOperationError, ConflictError
from app.models.account import Account
from app.models.envelope import Envelope, EnvelopeGroup
from app.models.transaction import Transaction
from app.schemas.envelope import (
    EnvelopeCreate,
    EnvelopeUpdate,
    EnvelopeGroupCreate,
    EnvelopeGroupUpdate,
    ZBBSummaryResponse,
)
from app.services.common import household_envelopes_query, get_household_envelope

class ZBBService:
    @staticmethod
    async def get_zbb_summary(household_id: UUID, db: AsyncSession) -> ZBBSummaryResponse:
        # Total inflow / liquid cash available across all active accounts
        acc_result = await db.execute(
            select(func.coalesce(func.sum(Account.current_balance), Decimal("0.00")))
            .where(Account.household_id == household_id, Account.is_active == True)
        )
        total_inflow = acc_result.scalar_one()

        # Total assigned across all envelopes
        env_result = await db.execute(
            select(
                func.coalesce(func.sum(Envelope.assigned_amount), Decimal("0.00")),
                func.coalesce(func.sum(Envelope.spent_amount), Decimal("0.00"))
            )
            .join(EnvelopeGroup, Envelope.group_id == EnvelopeGroup.id)
            .where(EnvelopeGroup.household_id == household_id)
        )
        total_assigned, total_spent = env_result.one()

        # Money not yet earmarked = cash in accounts minus what's still assigned
        # AND unspent. Spending reduces an account balance (and total_inflow) but
        # leaves assigned_amount untouched, so the spent amount must be added back
        # or every real transaction would drag unassigned_cash negative.
        unassigned_cash = total_inflow - total_assigned + total_spent

        # Count overspent envelopes (where spent > assigned)
        overspent_result = await db.execute(
            select(func.count(Envelope.id))
            .join(EnvelopeGroup, Envelope.group_id == EnvelopeGroup.id)
            .where(EnvelopeGroup.household_id == household_id, Envelope.spent_amount > Envelope.assigned_amount)
        )
        overspent_count = overspent_result.scalar_one()

        return ZBBSummaryResponse(
            total_inflow=total_inflow,
            total_assigned=total_assigned,
            unassigned_cash=unassigned_cash,
            total_spent=total_spent,
            overspent_envelopes_count=overspent_count,
        )

    @staticmethod
    async def assign_envelope(
        household_id: UUID,
        envelope_id: UUID,
        assigned_amount: Decimal,
        db: AsyncSession,
    ) -> Envelope:
        # Find envelope and verify household
        envelope = await get_household_envelope(household_id, envelope_id, db)
        if not envelope:
            raise NotFoundError("Envelope not found")

        if assigned_amount < 0:
            raise InvalidOperationError("Assigned amount cannot be negative")

        summary = await ZBBService.get_zbb_summary(household_id=household_id, db=db)
        available = summary.unassigned_cash + envelope.assigned_amount
        if assigned_amount > available:
            raise InvalidOperationError(
                f"Cannot assign {assigned_amount}: only {available} unassigned cash available",
            )

        envelope.assigned_amount = assigned_amount
        await db.commit()
        await db.refresh(envelope)
        return envelope

    @staticmethod
    async def rebalance_envelopes(
        household_id: UUID,
        from_envelope_id: UUID,
        to_envelope_id: UUID,
        amount: Decimal,
        db: AsyncSession,
    ) -> Tuple[Envelope, Envelope]:
        if amount <= 0:
            raise InvalidOperationError("Rebalance amount must be greater than zero")

        if from_envelope_id == to_envelope_id:
            raise InvalidOperationError("Cannot rebalance an envelope to itself")

        # Fetch both envelopes
        from_env = await get_household_envelope(household_id, from_envelope_id, db)
        to_env = await get_household_envelope(household_id, to_envelope_id, db)

        if not from_env or not to_env:
            raise NotFoundError("One or both envelopes not found")

        if from_env.assigned_amount < amount:
            raise InvalidOperationError(
                f"Cannot transfer {amount} from envelope '{from_env.name}' with assigned amount {from_env.assigned_amount}",
            )

        from_env.assigned_amount -= amount
        to_env.assigned_amount += amount

        await db.commit()
        await db.refresh(from_env)
        await db.refresh(to_env)
        return from_env, to_env

    @staticmethod
    async def get_overspent_envelopes(household_id: UUID, db: AsyncSession) -> List[Envelope]:
        result = await db.execute(
            household_envelopes_query(household_id).where(Envelope.spent_amount > Envelope.assigned_amount)
        )
        return list(result.scalars().all())

    # ---- Group / envelope CRUD -----------------------------------------

    @staticmethod
    async def _get_household_group(household_id: UUID, group_id: UUID, db: AsyncSession) -> EnvelopeGroup:
        result = await db.execute(
            select(EnvelopeGroup)
            .options(selectinload(EnvelopeGroup.envelopes))
            .where(EnvelopeGroup.id == group_id, EnvelopeGroup.household_id == household_id)
        )
        group = result.scalar_one_or_none()
        if not group:
            raise NotFoundError("Envelope group not found")
        return group

    @staticmethod
    async def _envelope_tx_count(envelope_ids: List[UUID], db: AsyncSession) -> int:
        if not envelope_ids:
            return 0
        return await db.scalar(
            select(func.count(Transaction.id)).where(Transaction.envelope_id.in_(envelope_ids))
        ) or 0

    @classmethod
    async def create_group(cls, payload: EnvelopeGroupCreate, db: AsyncSession) -> EnvelopeGroup:
        group = EnvelopeGroup(
            household_id=payload.household_id, name=payload.name, sort_order=payload.sort_order
        )
        db.add(group)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise InvalidOperationError(f"Household {payload.household_id} does not exist")
        result = await db.execute(
            select(EnvelopeGroup)
            .options(selectinload(EnvelopeGroup.envelopes))
            .where(EnvelopeGroup.id == group.id)
        )
        return result.scalar_one()

    @classmethod
    async def update_group(
        cls, group_id: UUID, household_id: UUID, payload: EnvelopeGroupUpdate, db: AsyncSession
    ) -> EnvelopeGroup:
        group = await cls._get_household_group(household_id, group_id, db)
        if payload.name is not None:
            group.name = payload.name.strip()
        if payload.sort_order is not None:
            group.sort_order = payload.sort_order
        await db.commit()
        return await cls._get_household_group(household_id, group_id, db)

    @classmethod
    async def delete_group(cls, group_id: UUID, household_id: UUID, db: AsyncSession) -> None:
        group = await cls._get_household_group(household_id, group_id, db)
        tx_count = await cls._envelope_tx_count([e.id for e in group.envelopes], db)
        if tx_count:
            raise ConflictError(
                f"Group has envelopes with {tx_count} transaction(s) — reassign or delete those first."
            )
        await db.delete(group)  # envelopes cascade
        await db.commit()

    @classmethod
    async def create_envelope(cls, payload: EnvelopeCreate, db: AsyncSession) -> Envelope:
        envelope = Envelope(
            group_id=payload.group_id, name=payload.name, target_amount=payload.target_amount
        )
        db.add(envelope)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise InvalidOperationError(f"Envelope group {payload.group_id} does not exist")
        await db.refresh(envelope)
        return envelope

    @classmethod
    async def update_envelope(
        cls, envelope_id: UUID, household_id: UUID, payload: EnvelopeUpdate, db: AsyncSession
    ) -> Envelope:
        envelope = await get_household_envelope(household_id, envelope_id, db)
        if not envelope:
            raise NotFoundError("Envelope not found")
        if payload.name is not None:
            envelope.name = payload.name.strip()
        if payload.target_amount is not None:
            envelope.target_amount = payload.target_amount
        await db.commit()
        await db.refresh(envelope)
        return envelope

    @classmethod
    async def delete_envelope(cls, envelope_id: UUID, household_id: UUID, db: AsyncSession) -> None:
        envelope = await get_household_envelope(household_id, envelope_id, db)
        if not envelope:
            raise NotFoundError("Envelope not found")
        tx_count = await cls._envelope_tx_count([envelope_id], db)
        if tx_count:
            raise ConflictError(
                f"Envelope has {tx_count} transaction(s) — delete or reassign them before deleting the envelope."
            )
        await db.delete(envelope)
        await db.commit()
