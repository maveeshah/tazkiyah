from uuid import UUID
from decimal import Decimal
from typing import List, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.exceptions import NotFoundError, InvalidOperationError
from app.models.goal import Goal, GoalType
from app.models.envelope import Envelope, EnvelopeGroup
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse


class GoalService:
    @staticmethod
    def calculate_monthly_pacing(goal: Goal, current_balance: Decimal) -> Optional[Decimal]:
        if goal.goal_type != GoalType.TARGET_BY_DATE or not goal.target_date:
            return None

        today = date.today()
        if goal.target_date <= today:
            return max(Decimal("0.00"), goal.target_amount - current_balance)

        months_diff = (goal.target_date.year - today.year) * 12 + (goal.target_date.month - today.month)
        if months_diff <= 0:
            months_diff = 1

        remaining = max(Decimal("0.00"), goal.target_amount - current_balance)
        return Decimal(str(round(float(remaining) / months_diff, 2)))

    @staticmethod
    def resolve_current_balance(goal: Goal) -> Decimal:
        # A goal linked to an envelope tracks that envelope's live balance rather
        # than a stored value, so the two can never drift out of sync.
        if goal.envelope_id and goal.envelope is not None:
            return Decimal(str(goal.envelope.available_balance))
        return goal.current_balance

    @classmethod
    def to_response(cls, goal: Goal) -> GoalResponse:
        current_balance = cls.resolve_current_balance(goal)
        resp = GoalResponse.model_validate(goal)
        resp.current_balance = current_balance
        resp.monthly_pacing = cls.calculate_monthly_pacing(goal, current_balance)
        return resp

    @staticmethod
    async def _validate_envelope(household_id: UUID, envelope_id: Optional[UUID], db: AsyncSession) -> None:
        if envelope_id is None:
            return
        exists = await db.scalar(
            select(Envelope.id)
            .join(EnvelopeGroup, Envelope.group_id == EnvelopeGroup.id)
            .where(Envelope.id == envelope_id, EnvelopeGroup.household_id == household_id)
        )
        if not exists:
            raise NotFoundError("Linked envelope not found in this household")

    @staticmethod
    async def _load(goal_id: UUID, household_id: UUID, db: AsyncSession) -> Goal:
        result = await db.execute(
            select(Goal)
            .options(selectinload(Goal.envelope))
            .where(Goal.id == goal_id, Goal.household_id == household_id)
        )
        goal = result.scalar_one_or_none()
        if not goal:
            raise NotFoundError("Goal not found")
        return goal

    @classmethod
    async def get_goal(cls, goal_id: UUID, household_id: UUID, db: AsyncSession) -> GoalResponse:
        return cls.to_response(await cls._load(goal_id, household_id, db))

    @classmethod
    async def create_goal(cls, payload: GoalCreate, db: AsyncSession) -> GoalResponse:
        if payload.target_amount < 0:
            raise InvalidOperationError("Goal target_amount cannot be negative")
        await cls._validate_envelope(payload.household_id, payload.envelope_id, db)

        goal = Goal(
            household_id=payload.household_id,
            envelope_id=payload.envelope_id,
            name=payload.name,
            goal_type=payload.goal_type,
            target_amount=payload.target_amount,
            target_date=payload.target_date,
            # Envelope-linked goals derive their balance live; nothing to store.
            current_balance=Decimal("0.00") if payload.envelope_id else payload.current_balance,
        )
        db.add(goal)
        await db.commit()
        return cls.to_response(await cls._load(goal.id, payload.household_id, db))

    @classmethod
    async def update_goal(
        cls, goal_id: UUID, household_id: UUID, payload: GoalUpdate, db: AsyncSession
    ) -> GoalResponse:
        goal = await cls._load(goal_id, household_id, db)

        if payload.target_amount is not None:
            if payload.target_amount < 0:
                raise InvalidOperationError("Goal target_amount cannot be negative")
            goal.target_amount = payload.target_amount
        if payload.name is not None:
            goal.name = payload.name.strip()
        if payload.goal_type is not None:
            goal.goal_type = payload.goal_type
        if payload.target_date is not None:
            goal.target_date = payload.target_date
        if payload.envelope_id is not None or "envelope_id" in payload.model_fields_set:
            await cls._validate_envelope(household_id, payload.envelope_id, db)
            goal.envelope_id = payload.envelope_id
        # current_balance is only meaningful for an unlinked goal (ADR 0002).
        if payload.current_balance is not None and goal.envelope_id is None:
            goal.current_balance = payload.current_balance

        await db.commit()
        return cls.to_response(await cls._load(goal_id, household_id, db))

    @classmethod
    async def delete_goal(cls, goal_id: UUID, household_id: UUID, db: AsyncSession) -> None:
        goal = await cls._load(goal_id, household_id, db)
        await db.delete(goal)
        await db.commit()

    @classmethod
    async def list_goals(cls, household_id: UUID, db: AsyncSession) -> List[GoalResponse]:
        result = await db.execute(
            select(Goal)
            .options(selectinload(Goal.envelope))
            .where(Goal.household_id == household_id)
        )
        goals = result.scalars().all()
        return [cls.to_response(g) for g in goals]
