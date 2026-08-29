from typing import List, Tuple, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.core.exceptions import NotFoundError, ConflictError
from app.models.household import Household, User
from app.schemas.household import HouseholdCreate, UserCreate, UserRegisterRequest, UserUpdate


class HouseholdService:
    @staticmethod
    async def create_household(payload: HouseholdCreate, db: AsyncSession) -> Household:
        household = Household(name=payload.name, base_currency=payload.base_currency)
        db.add(household)
        await db.commit()
        await db.refresh(household)
        return household

    @staticmethod
    async def list_households(db: AsyncSession) -> List[Household]:
        result = await db.execute(select(Household).order_by(Household.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_household(household_id: UUID, db: AsyncSession) -> Household:
        result = await db.execute(select(Household).where(Household.id == household_id))
        household = result.scalar_one_or_none()
        if not household:
            raise NotFoundError("Household not found")
        return household

    @staticmethod
    async def get_or_bootstrap_household(db: AsyncSession) -> Tuple[Household, User]:
        """Returns the first existing household and its primary user, or bootstraps a default one."""
        result = await db.execute(select(Household).order_by(Household.created_at.asc()))
        household = result.scalars().first()

        if not household:
            household = Household(name="Mavee Household", base_currency="PKR")
            db.add(household)
            await db.flush()

        # Find or create primary user
        user_res = await db.execute(
            select(User).where(User.household_id == household.id).order_by(User.created_at.asc())
        )
        user = user_res.scalars().first()

        if not user:
            user = User(
                household_id=household.id,
                phone_number="+923001234567",
                full_name="Mavee",
                email="mavee@tazkiyah.app",
                role="ADMIN",
            )
            db.add(user)
            await db.flush()

        await db.commit()
        await db.refresh(household)
        await db.refresh(user)
        return household, user

    @staticmethod
    async def list_users_by_household(household_id: UUID, db: AsyncSession) -> List[User]:
        # Validate household exists
        await HouseholdService.get_household(household_id, db)
        result = await db.execute(
            select(User).where(User.household_id == household_id).order_by(User.created_at.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_user(household_id: UUID, payload: UserCreate, db: AsyncSession) -> User:
        # Validate household exists
        await HouseholdService.get_household(household_id, db)
        user = User(
            household_id=household_id,
            phone_number=payload.phone_number.strip(),
            full_name=payload.full_name.strip(),
            email=payload.email.strip() if payload.email else None,
            role=payload.role or "MEMBER",
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise ConflictError("A user with this phone number or email already exists")
        await db.refresh(user)
        return user

    @staticmethod
    async def login_user(phone_number: str, db: AsyncSession) -> Tuple[User, Household]:
        cleaned_phone = phone_number.strip()
        result = await db.execute(select(User).where(User.phone_number == cleaned_phone))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError(f"No user found with phone number {cleaned_phone}")
        
        household = await HouseholdService.get_household(user.household_id, db)
        return user, household

    @staticmethod
    async def register_user(payload: UserRegisterRequest, db: AsyncSession) -> Tuple[User, Household]:
        cleaned_phone = payload.phone_number.strip()
        
        # Check if user already exists
        existing_res = await db.execute(select(User).where(User.phone_number == cleaned_phone))
        if existing_res.scalar_one_or_none():
            raise ConflictError(f"User with phone number {cleaned_phone} already exists. Please log in.")

        # Determine household
        household: Optional[Household] = None
        if payload.household_id:
            household = await HouseholdService.get_household(payload.household_id, db)
        else:
            hh_name = payload.household_name.strip() if payload.household_name else f"{payload.full_name.strip()}'s Household"
            household = Household(name=hh_name, base_currency="PKR")
            db.add(household)
            await db.flush()

        user = User(
            household_id=household.id,
            phone_number=cleaned_phone,
            full_name=payload.full_name.strip(),
            email=payload.email.strip() if payload.email else None,
            role=payload.role or "ADMIN",
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise ConflictError("A user with this phone number or email already exists")
        
        await db.refresh(household)
        await db.refresh(user)
        return user, household

    @staticmethod
    async def list_all_users(db: AsyncSession) -> List[User]:
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def delete_user(user_id: UUID, db: AsyncSession) -> None:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found")
        await db.delete(user)
        await db.commit()

    @staticmethod
    async def update_user(user_id: UUID, payload: UserUpdate, db: AsyncSession) -> User:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found")
        
        if payload.full_name is not None:
            user.full_name = payload.full_name.strip()
        if payload.email is not None:
            user.email = payload.email.strip() if payload.email else None
        if payload.role is not None:
            user.role = payload.role.strip()
            
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise ConflictError("Email conflict detected")
        await db.refresh(user)
        return user

