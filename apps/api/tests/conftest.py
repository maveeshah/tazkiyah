import pytest
import asyncio
import asyncpg
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient, ASGITransport
from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models.household import Household, User
from app.models.account import Account, AccountType
from app.models.envelope import EnvelopeGroup, Envelope
from decimal import Decimal

# Tests run against a dedicated tazkiyah_test_db, never the dev database (tazkiyah_db) —
# the per-test drop_all/create_all below would otherwise wipe real seeded/dev data.
test_engine = create_async_engine(settings.test_async_database_url, echo=False, pool_pre_ping=True)
TestAsyncSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def ensure_test_database():
    conn = await asyncpg.connect(
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_SERVER,
        port=settings.POSTGRES_PORT,
        database="postgres",
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", settings.POSTGRES_TEST_DB
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{settings.POSTGRES_TEST_DB}"')
    finally:
        await conn.close()

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestAsyncSession() as session:
        yield session

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
async def seed_data(db_session: AsyncSession):
    household = Household(name="Test Family", base_currency="PKR")
    db_session.add(household)
    await db_session.flush()

    user = User(
        household_id=household.id,
        phone_number="+923001234567",
        full_name="Mavee",
        email="test@tazkiyah.app",
    )
    db_session.add(user)

    # Accounts
    cash_acc = Account(
        household_id=household.id,
        name="Wallet Cash",
        type=AccountType.CASH,
        current_balance=Decimal("25000.00"),
    )
    bank_acc = Account(
        household_id=household.id,
        name="Meezan Bank",
        type=AccountType.BANK,
        current_balance=Decimal("150000.00"),
    )
    db_session.add_all([cash_acc, bank_acc])
    await db_session.flush()

    # Envelope Groups & Envelopes
    needs_group = EnvelopeGroup(household_id=household.id, name="Daily Living", sort_order=1)
    wants_group = EnvelopeGroup(household_id=household.id, name="Discretionary", sort_order=2)
    db_session.add_all([needs_group, wants_group])
    await db_session.flush()

    grocery_env = Envelope(
        group_id=needs_group.id,
        name="Grocery",
        assigned_amount=Decimal("40000.00"),
        spent_amount=Decimal("0.00"),
    )
    fuel_env = Envelope(
        group_id=needs_group.id,
        name="Fuel",
        assigned_amount=Decimal("20000.00"),
        spent_amount=Decimal("0.00"),
    )
    dining_env = Envelope(
        group_id=wants_group.id,
        name="Dining Out",
        assigned_amount=Decimal("15000.00"),
        spent_amount=Decimal("0.00"),
    )
    db_session.add_all([grocery_env, fuel_env, dining_env])
    await db_session.commit()

    return {
        "household": household,
        "user": user,
        "accounts": {"cash": cash_acc, "bank": bank_acc},
        "envelopes": {"grocery": grocery_env, "fuel": fuel_env, "dining": dining_env},
    }
