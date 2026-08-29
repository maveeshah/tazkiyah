from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    phone_number: str
    full_name: str
    email: Optional[str] = None
    role: str = "MEMBER"

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    household_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserLoginRequest(BaseModel):
    phone_number: str

class UserRegisterRequest(BaseModel):
    phone_number: str
    full_name: str
    email: Optional[str] = None
    role: str = "MEMBER"
    household_id: Optional[UUID] = None
    household_name: Optional[str] = None

class HouseholdBase(BaseModel):
    name: str
    base_currency: str = "PKR"

class HouseholdCreate(HouseholdBase):
    pass

class HouseholdResponse(HouseholdBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    user: UserResponse
    household: HouseholdResponse

class HouseholdWithUsersResponse(HouseholdResponse):
    users: list[UserResponse] = []
