from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional
from app.models.account import AccountType

class AccountBase(BaseModel):
    name: str
    type: AccountType = AccountType.BANK
    current_balance: Decimal = Decimal("0.00")
    is_active: bool = True

class AccountCreate(AccountBase):
    household_id: UUID

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    current_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None

class AccountResponse(AccountBase):
    id: UUID
    household_id: UUID
    is_overdrawn: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
