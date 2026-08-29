from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

class CanonicalItemBase(BaseModel):
    name: str
    category: str = "General"
    standard_unit: str = "piece"

class CanonicalItemCreate(CanonicalItemBase):
    household_id: UUID

class CanonicalItemResponse(CanonicalItemBase):
    id: UUID
    household_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PricePointResponse(BaseModel):
    id: UUID
    canonical_item_id: UUID
    unit_price: Decimal
    unit: str
    merchant: Optional[str] = None
    recorded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CPITrendItem(BaseModel):
    canonical_item_id: UUID
    name: str
    category: str
    standard_unit: str
    latest_price: Optional[Decimal] = None
    previous_price: Optional[Decimal] = None
    inflation_rate_percentage: Optional[float] = None
    history: List[PricePointResponse] = []
