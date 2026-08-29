from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from app.models.goal import GoalType

class GoalBase(BaseModel):
    name: str
    goal_type: GoalType = GoalType.TARGET_BY_DATE
    target_amount: Decimal
    target_date: Optional[date] = None
    current_balance: Decimal = Decimal("0.00")

class GoalCreate(GoalBase):
    household_id: UUID
    envelope_id: Optional[UUID] = None

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    goal_type: Optional[GoalType] = None
    target_amount: Optional[Decimal] = None
    target_date: Optional[date] = None
    current_balance: Optional[Decimal] = None
    envelope_id: Optional[UUID] = None

class GoalResponse(GoalBase):
    id: UUID
    household_id: UUID
    envelope_id: Optional[UUID] = None
    monthly_pacing: Optional[Decimal] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
