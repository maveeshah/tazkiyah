from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.household import (
    UserResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserUpdate,
    AuthResponse,
    HouseholdResponse,
)
from app.services.household_service import HouseholdService

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db)):
    return await HouseholdService.list_all_users(db=db)

@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    user, household = await HouseholdService.login_user(phone_number=payload.phone_number, db=db)
    return AuthResponse(user=UserResponse.model_validate(user), household=HouseholdResponse.model_validate(household))

@router.post("/register", response_model=AuthResponse)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    user, household = await HouseholdService.register_user(payload=payload, db=db)
    return AuthResponse(user=UserResponse.model_validate(user), household=HouseholdResponse.model_validate(household))

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: UUID, payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    return await HouseholdService.update_user(user_id=user_id, payload=payload, db=db)

@router.delete("/{user_id}")
async def delete_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    await HouseholdService.delete_user(user_id=user_id, db=db)
    return {"status": "success", "message": f"User {user_id} deleted successfully"}
