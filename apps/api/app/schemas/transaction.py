from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from app.models.transaction import TransactionSource

class LineItemCreate(BaseModel):
    raw_item_name: str
    quantity: Decimal = Decimal("1.000")
    unit: str = "piece"
    unit_price: Optional[Decimal] = None
    total_price: Decimal
    notes: Optional[str] = None

class LineItemResponse(LineItemCreate):
    id: UUID
    transaction_id: UUID
    canonical_item_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

class TransactionCreate(BaseModel):
    household_id: UUID
    account_id: UUID
    envelope_id: UUID
    total_amount: Decimal
    merchant: Optional[str] = None
    source: TransactionSource = TransactionSource.WHATSAPP
    raw_input: Optional[str] = None
    transacted_at: Optional[datetime] = None
    line_items: List[LineItemCreate] = []

class TransactionUpdate(BaseModel):
    account_id: Optional[UUID] = None
    envelope_id: Optional[UUID] = None
    total_amount: Optional[Decimal] = None
    merchant: Optional[str] = None
    raw_input: Optional[str] = None
    transacted_at: Optional[datetime] = None
    # When provided, replaces the entire line-item set.
    line_items: Optional[List[LineItemCreate]] = None


class TransactionResponse(BaseModel):
    id: UUID
    household_id: UUID
    account_id: UUID
    envelope_id: UUID
    total_amount: Decimal
    merchant: Optional[str] = None
    source: TransactionSource
    raw_input: Optional[str] = None
    transacted_at: datetime
    created_at: datetime
    line_items: List[LineItemResponse] = []
    model_config = ConfigDict(from_attributes=True)
