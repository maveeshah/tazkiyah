from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.services.account_service import AccountService

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.post("", response_model=AccountResponse)
async def create_account(payload: AccountCreate, db: AsyncSession = Depends(get_db)):
    return await AccountService.create_account(payload=payload, db=db)

@router.get("/household/{household_id}", response_model=List[AccountResponse])
async def list_accounts(household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await AccountService.list_accounts(household_id=household_id, db=db)

@router.get("/overdrawn/{household_id}", response_model=List[AccountResponse])
async def get_overdrawn_accounts(household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await AccountService.get_overdrawn_accounts(household_id=household_id, db=db)

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await AccountService.get_account(account_id=account_id, household_id=household_id, db=db)

@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: UUID, household_id: UUID, payload: AccountUpdate, db: AsyncSession = Depends(get_db)
):
    return await AccountService.update_account(
        account_id=account_id, household_id=household_id, payload=payload, db=db
    )

@router.delete("/{account_id}")
async def delete_account(account_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    await AccountService.delete_account(account_id=account_id, household_id=household_id, db=db)
    return {"status": "success", "message": f"Account {account_id} deleted"}
