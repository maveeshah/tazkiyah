from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.household import (
    HouseholdCreate,
    HouseholdResponse,
    UserCreate,
    UserResponse,
    AuthResponse,
)
from app.services.household_service import HouseholdService

router = APIRouter(prefix="/households", tags=["Households"])

@router.get("", response_model=List[HouseholdResponse])
async def list_households(db: AsyncSession = Depends(get_db)):
    return await HouseholdService.list_households(db=db)

@router.post("", response_model=HouseholdResponse)
async def create_household(payload: HouseholdCreate, db: AsyncSession = Depends(get_db)):
    return await HouseholdService.create_household(payload=payload, db=db)

@router.get("/bootstrap", response_model=AuthResponse)
async def bootstrap_household(db: AsyncSession = Depends(get_db)):
    household, user = await HouseholdService.get_or_bootstrap_household(db=db)
    return AuthResponse(user=UserResponse.model_validate(user), household=HouseholdResponse.model_validate(household))

@router.get("/{household_id}", response_model=HouseholdResponse)
async def get_household(household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await HouseholdService.get_household(household_id=household_id, db=db)

@router.get("/{household_id}/users", response_model=List[UserResponse])
async def list_household_users(household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await HouseholdService.list_users_by_household(household_id=household_id, db=db)

@router.post("/{household_id}/users", response_model=UserResponse)
async def create_user(household_id: UUID, payload: UserCreate, db: AsyncSession = Depends(get_db)):
    return await HouseholdService.create_user(household_id=household_id, payload=payload, db=db)

