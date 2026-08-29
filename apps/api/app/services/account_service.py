from uuid import UUID
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from app.core.exceptions import NotFoundError, InvalidOperationError, ConflictError
from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.account import AccountCreate, AccountUpdate


class AccountService:
    @staticmethod
    async def create_account(payload: AccountCreate, db: AsyncSession) -> Account:
        account = Account(
            household_id=payload.household_id,
            name=payload.name,
            type=payload.type,
            current_balance=payload.current_balance,
            is_active=payload.is_active,
        )
        db.add(account)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise InvalidOperationError(f"Household {payload.household_id} does not exist")
        await db.refresh(account)
        return account

    @staticmethod
    async def list_accounts(household_id: UUID, db: AsyncSession) -> List[Account]:
        result = await db.execute(
            select(Account).where(Account.household_id == household_id, Account.is_active == True)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_account(account_id: UUID, household_id: UUID, db: AsyncSession) -> Account:
        result = await db.execute(
            select(Account).where(Account.id == account_id, Account.household_id == household_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise NotFoundError("Account not found")
        return account

    @staticmethod
    async def get_overdrawn_accounts(household_id: UUID, db: AsyncSession) -> List[Account]:
        result = await db.execute(
            select(Account).where(Account.household_id == household_id, Account.current_balance < 0)
        )
        return list(result.scalars().all())

    @classmethod
    async def update_account(
        cls, account_id: UUID, household_id: UUID, payload: AccountUpdate, db: AsyncSession
    ) -> Account:
        account = await cls.get_account(account_id, household_id, db)
        if payload.name is not None:
            account.name = payload.name.strip()
        if payload.type is not None:
            account.type = payload.type
        if payload.current_balance is not None:
            account.current_balance = payload.current_balance
        if payload.is_active is not None:
            account.is_active = payload.is_active
        await db.commit()
        await db.refresh(account)
        return account

    @classmethod
    async def delete_account(cls, account_id: UUID, household_id: UUID, db: AsyncSession) -> None:
        account = await cls.get_account(account_id, household_id, db)
        tx_count = await db.scalar(
            select(func.count(Transaction.id)).where(Transaction.account_id == account_id)
        )
        if tx_count:
            raise ConflictError(
                f"Account has {tx_count} transaction(s) — set is_active=false to hide it instead of deleting."
            )
        await db.delete(account)
        await db.commit()
