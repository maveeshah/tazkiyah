from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.ledger_service import LedgerService

router = APIRouter(prefix="/transactions", tags=["Transactions & Ledger"])

@router.post("", response_model=TransactionResponse)
async def create_transaction(payload: TransactionCreate, db: AsyncSession = Depends(get_db)):
    return await LedgerService.create_transaction(payload=payload, db=db)

@router.get("/household/{household_id}", response_model=List[TransactionResponse])
async def list_transactions(household_id: UUID, limit: int = 50, db: AsyncSession = Depends(get_db)):
    limit = max(1, min(limit, 500))
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.line_items))
        .where(Transaction.household_id == household_id)
        .order_by(desc(Transaction.transacted_at))
        .limit(limit)
    )
    return list(result.scalars().all())

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await LedgerService.get_transaction(transaction_id=transaction_id, household_id=household_id, db=db)

@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    household_id: UUID,
    payload: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await LedgerService.update_transaction(
        transaction_id=transaction_id, household_id=household_id, payload=payload, db=db
    )

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    await LedgerService.delete_transaction(transaction_id=transaction_id, household_id=household_id, db=db)
    return {"status": "success", "message": f"Transaction {transaction_id} deleted"}
