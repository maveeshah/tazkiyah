from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

class EnvelopeBase(BaseModel):
    name: str
    assigned_amount: Decimal = Decimal("0.00")
    spent_amount: Decimal = Decimal("0.00")
    target_amount: Optional[Decimal] = None

class EnvelopeCreate(BaseModel):
    group_id: UUID
    name: str
    target_amount: Optional[Decimal] = None

class EnvelopeUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = None


class EnvelopeAssign(BaseModel):
    envelope_id: UUID
    assigned_amount: Decimal

class EnvelopeRebalance(BaseModel):
    from_envelope_id: UUID
    to_envelope_id: UUID
    amount: Decimal

class EnvelopeResponse(EnvelopeBase):
    id: UUID
    group_id: UUID
    available_balance: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EnvelopeGroupBase(BaseModel):
    name: str
    sort_order: int = 0

class EnvelopeGroupCreate(EnvelopeGroupBase):
    household_id: UUID


class EnvelopeGroupUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None

class EnvelopeGroupResponse(EnvelopeGroupBase):
    id: UUID
    household_id: UUID
    envelopes: List[EnvelopeResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ZBBSummaryResponse(BaseModel):
    total_inflow: Decimal
    total_assigned: Decimal
    unassigned_cash: Decimal
    total_spent: Decimal
    overspent_envelopes_count: int
