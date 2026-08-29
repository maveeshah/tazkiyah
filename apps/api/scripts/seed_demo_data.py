"""
Tazkiyah Daily Finance & Wealth OS — Demo Database Seed Script
Populates a realistic Pakistani Rupee (PKR) dataset fulfilling Acceptance Criteria R1–R6:
- 1 Demo Household ("Mavee Household", Currency: PKR) with Admin User ("Mavee")
- 4 Liquid Accounts, PKR 275,000.00 opening / PKR 125,000.00 after seeded spend
  (Wallet Cash, Meezan Bank, Sadapay, Nayapay)
- 3 Envelope Groups with 8 Envelopes achieving Zero-Based Budgeting (Unassigned = PKR 0.00,
  i.e. inflow − assigned + spent)
  including 1 Overspent Envelope ("Dining Out") for budget alert demonstration
- 10 Canonical Staple Items with 4+ monthly price points (May–August 2026) demonstrating CPI inflation
- 18 Multi-Item Granular Transactions across merchants with Roman Urdu receipt line items
- 3 Financial Goals & Sinking Funds (Umrah 2027, Emergency Cushion, Vehicle Maintenance) with pacing
"""

import sys
import os
import asyncio
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Dict, Any, Optional

# Ensure apps/api directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.household import Household, User
from app.models.account import Account, AccountType
from app.models.envelope import EnvelopeGroup, Envelope
from app.models.canonical_item import CanonicalItem, PriceHistory
from app.models.transaction import Transaction, LineItem, TransactionSource
from app.models.goal import Goal, GoalType
from app.services.zbb_service import ZBBService
from app.services.cpi_service import CPIService


async def seed_demo_data(session: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Seeds demo data into PostgreSQL database.
    Can be called with an existing session (e.g. from pytest) or opens a new session.
    """
    if session is not None:
        return await _execute_seed(session)
    
    async with AsyncSessionLocal() as db:
        return await _execute_seed(db)


async def _execute_seed(db: AsyncSession) -> Dict[str, Any]:
    print("🌱 Starting Tazkiyah Demo Data Seeding...")

    # 1. Clean up existing demo household(s) if present (idempotent seed).
    # There may be more than one — repeated web/app bootstrap creates duplicate
    # "Mavee Household" rows — so delete every match, not just one.
    existing_hh_res = await db.execute(
        select(Household).where(Household.name == "Mavee Household")
    )
    existing_households = list(existing_hh_res.scalars().all())
    for existing_hh in existing_households:
        print(f"   Removing existing demo household: {existing_hh.id}")
        await db.delete(existing_hh)
    if existing_households:
        await db.flush()

    # Also clean up any user with the demo phone number if orphaned.
    existing_user_res = await db.execute(
        select(User).where(User.phone_number == "+923001234567")
    )
    existing_users = list(existing_user_res.scalars().all())
    for existing_user in existing_users:
        await db.delete(existing_user)
    if existing_users:
        await db.flush()

    # 2. Create Household & User (R1, R5)
    household = Household(
        name="Mavee Household",
        base_currency="PKR",
    )
    db.add(household)
    await db.flush()

    user = User(
        household_id=household.id,
        phone_number="+923001234567",
        full_name="Mavee",
        email="mavee@tazkiyah.app",
        role="ADMIN",
    )
    db.add(user)
    await db.flush()
    print(f"✅ Created Household: '{household.name}' ({household.id}) with Admin: '{user.full_name}'")

    # 3. Create Liquid Accounts (R5)
    # Opening balances = 25,000 + 180,000 + 40,000 + 30,000 = 275,000 PKR.
    # The transaction loop debits these by 150,000 total -> 125,000 PKR liquid inflow post-seed.
    accounts_data = [
        {"name": "Wallet Cash", "type": AccountType.CASH, "balance": Decimal("25000.00")},
        {"name": "Meezan Bank", "type": AccountType.BANK, "balance": Decimal("180000.00")},
        {"name": "Sadapay", "type": AccountType.EMI, "balance": Decimal("40000.00")},
        {"name": "Nayapay", "type": AccountType.EMI, "balance": Decimal("30000.00")},
    ]
    accounts_map: Dict[str, Account] = {}
    for acc in accounts_data:
        account_obj = Account(
            household_id=household.id,
            name=acc["name"],
            type=acc["type"],
            current_balance=acc["balance"],
            is_active=True,
        )
        db.add(account_obj)
        await db.flush()
        accounts_map[acc["name"]] = account_obj
    print(f"✅ Created {len(accounts_map)} Accounts (Opening balance: PKR 275,000.00; PKR 125,000.00 after seeded spend)")

    # 4. Create Envelope Groups & Envelopes (R1)
    # Total Assigned = 60k + 35k + 30k + 20k + 25k + 40k + 50k + 15k = 275,000 PKR.
    # Envelopes start at spent=0; the transaction loop below drives spent_amount and
    # debits the accounts, so post-seed:
    #   Total Inflow  = 275,000 (opening) - 150,000 (spent) = 125,000
    #   Unassigned    = Inflow - Assigned + Spent = 125,000 - 275,000 + 150,000 = 0.00 -> ZBB Achieved!
    # The "spent" values below are the expected per-envelope totals the loop should reach.
    # "Dining Out" reaches spent (24,800) > assigned (20,000) -> Overspent by 4,800 PKR.
    groups_config = [
        {
            "name": "Daily Living",
            "sort_order": 1,
            "envelopes": [
                {"name": "Grocery", "assigned": Decimal("60000.00"), "spent": Decimal("42500.00"), "target": Decimal("60000.00")},
                {"name": "Fuel & Commute", "assigned": Decimal("35000.00"), "spent": Decimal("28000.00"), "target": Decimal("35000.00")},
                {"name": "Utilities & Bills", "assigned": Decimal("30000.00"), "spent": Decimal("29500.00"), "target": Decimal("30000.00")},
            ],
        },
        {
            "name": "Discretionary",
            "sort_order": 2,
            "envelopes": [
                {"name": "Dining Out", "assigned": Decimal("20000.00"), "spent": Decimal("24800.00"), "target": Decimal("20000.00")},
                {"name": "Shopping & Personal", "assigned": Decimal("25000.00"), "spent": Decimal("18200.00"), "target": Decimal("25000.00")},
            ],
        },
        {
            "name": "Savings & Sinking Funds",
            "sort_order": 3,
            "envelopes": [
                {"name": "Umrah 2027", "assigned": Decimal("40000.00"), "spent": Decimal("0.00"), "target": Decimal("800000.00")},
                {"name": "Emergency Cushion", "assigned": Decimal("50000.00"), "spent": Decimal("0.00"), "target": Decimal("500000.00")},
                {"name": "Vehicle Maintenance", "assigned": Decimal("15000.00"), "spent": Decimal("7000.00"), "target": Decimal("100000.00")},
            ],
        },
    ]

    envelopes_map: Dict[str, Envelope] = {}
    groups_map: Dict[str, EnvelopeGroup] = {}
    for grp_data in groups_config:
        group_obj = EnvelopeGroup(
            household_id=household.id,
            name=grp_data["name"],
            sort_order=grp_data["sort_order"],
        )
        db.add(group_obj)
        await db.flush()
        groups_map[grp_data["name"]] = group_obj

        for env_data in grp_data["envelopes"]:
            env_obj = Envelope(
                group_id=group_obj.id,
                name=env_data["name"],
                assigned_amount=env_data["assigned"],
                spent_amount=Decimal("0.00"),  # accumulated by the transaction loop below
                target_amount=env_data["target"],
            )
            db.add(env_obj)
            await db.flush()
            envelopes_map[env_data["name"]] = env_obj

    print(f"✅ Created {len(groups_map)} Envelope Groups with {len(envelopes_map)} Envelopes")

    # 5. Create Canonical Items & CPI Price Points across 4+ Months (R3)
    # Staples showing realistic inflation in Pakistan across May, June, July, August 2026
    cpi_items_data = [
        {
            "name": "Potato",
            "category": "Fresh Produce",
            "standard_unit": "kg",
            "history": [
                {"date": datetime(2026, 5, 10, 10, 0, tzinfo=timezone.utc), "price": Decimal("80.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 12, 11, 0, tzinfo=timezone.utc), "price": Decimal("95.00"), "unit": "kg", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 8, 12, 0, tzinfo=timezone.utc), "price": Decimal("110.00"), "unit": "kg", "merchant": "Aghas Supermarket"},
                {"date": datetime(2026, 8, 15, 14, 0, tzinfo=timezone.utc), "price": Decimal("120.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Milk",
            "category": "Dairy",
            "standard_unit": "liter",
            "history": [
                {"date": datetime(2026, 5, 5, 9, 30, tzinfo=timezone.utc), "price": Decimal("210.00"), "unit": "liter", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 6, 8, 10, 0, tzinfo=timezone.utc), "price": Decimal("220.00"), "unit": "liter", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 7, 12, 11, 30, tzinfo=timezone.utc), "price": Decimal("230.00"), "unit": "liter", "merchant": "Aghas Supermarket"},
                {"date": datetime(2026, 8, 18, 15, 0, tzinfo=timezone.utc), "price": Decimal("240.00"), "unit": "liter", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Eggs",
            "category": "Poultry & Dairy",
            "standard_unit": "dozen",
            "history": [
                {"date": datetime(2026, 5, 7, 10, 0, tzinfo=timezone.utc), "price": Decimal("280.00"), "unit": "dozen", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 10, 11, 0, tzinfo=timezone.utc), "price": Decimal("300.00"), "unit": "dozen", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 15, 12, 0, tzinfo=timezone.utc), "price": Decimal("320.00"), "unit": "dozen", "merchant": "Aghas Supermarket"},
                {"date": datetime(2026, 8, 19, 16, 0, tzinfo=timezone.utc), "price": Decimal("340.00"), "unit": "dozen", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Petrol",
            "category": "Fuel",
            "standard_unit": "liter",
            "history": [
                {"date": datetime(2026, 5, 1, 8, 0, tzinfo=timezone.utc), "price": Decimal("265.00"), "unit": "liter", "merchant": "Shell Fuel Station"},
                {"date": datetime(2026, 6, 1, 8, 0, tzinfo=timezone.utc), "price": Decimal("272.00"), "unit": "liter", "merchant": "Total Parco"},
                {"date": datetime(2026, 7, 1, 8, 0, tzinfo=timezone.utc), "price": Decimal("278.00"), "unit": "liter", "merchant": "PSO Clifton"},
                {"date": datetime(2026, 8, 1, 8, 0, tzinfo=timezone.utc), "price": Decimal("285.00"), "unit": "liter", "merchant": "Shell Fuel Station"},
            ],
        },
        {
            "name": "Flour",
            "category": "Grains & Staples",
            "standard_unit": "10kg",
            "history": [
                {"date": datetime(2026, 5, 14, 11, 0, tzinfo=timezone.utc), "price": Decimal("1200.00"), "unit": "10kg", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc), "price": Decimal("1280.00"), "unit": "10kg", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 18, 14, 0, tzinfo=timezone.utc), "price": Decimal("1350.00"), "unit": "10kg", "merchant": "Metro Cash & Carry"},
                {"date": datetime(2026, 8, 12, 16, 0, tzinfo=timezone.utc), "price": Decimal("1420.00"), "unit": "10kg", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Cooking Oil",
            "category": "Cooking Essentials",
            "standard_unit": "liter",
            "history": [
                {"date": datetime(2026, 5, 11, 11, 30, tzinfo=timezone.utc), "price": Decimal("480.00"), "unit": "liter", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 14, 13, 0, tzinfo=timezone.utc), "price": Decimal("500.00"), "unit": "liter", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 16, 15, 0, tzinfo=timezone.utc), "price": Decimal("520.00"), "unit": "liter", "merchant": "Aghas Supermarket"},
                {"date": datetime(2026, 8, 14, 17, 0, tzinfo=timezone.utc), "price": Decimal("550.00"), "unit": "liter", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Onion",
            "category": "Fresh Produce",
            "standard_unit": "kg",
            "history": [
                {"date": datetime(2026, 5, 9, 10, 0, tzinfo=timezone.utc), "price": Decimal("120.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc), "price": Decimal("150.00"), "unit": "kg", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 14, 14, 0, tzinfo=timezone.utc), "price": Decimal("175.00"), "unit": "kg", "merchant": "Aghas Supermarket"},
                {"date": datetime(2026, 8, 16, 16, 30, tzinfo=timezone.utc), "price": Decimal("190.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Tomato",
            "category": "Fresh Produce",
            "standard_unit": "kg",
            "history": [
                {"date": datetime(2026, 5, 8, 10, 30, tzinfo=timezone.utc), "price": Decimal("90.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 13, 11, 30, tzinfo=timezone.utc), "price": Decimal("120.00"), "unit": "kg", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 17, 13, 0, tzinfo=timezone.utc), "price": Decimal("140.00"), "unit": "kg", "merchant": "Aghas Supermarket"},
                {"date": datetime(2026, 8, 17, 17, 0, tzinfo=timezone.utc), "price": Decimal("160.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Sugar",
            "category": "Grains & Staples",
            "standard_unit": "kg",
            "history": [
                {"date": datetime(2026, 5, 12, 10, 0, tzinfo=timezone.utc), "price": Decimal("140.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 16, 12, 0, tzinfo=timezone.utc), "price": Decimal("145.00"), "unit": "kg", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 20, 14, 0, tzinfo=timezone.utc), "price": Decimal("150.00"), "unit": "kg", "merchant": "Metro Cash & Carry"},
                {"date": datetime(2026, 8, 13, 16, 0, tzinfo=timezone.utc), "price": Decimal("155.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
            ],
        },
        {
            "name": "Rice",
            "category": "Grains & Staples",
            "standard_unit": "kg",
            "history": [
                {"date": datetime(2026, 5, 13, 11, 0, tzinfo=timezone.utc), "price": Decimal("320.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
                {"date": datetime(2026, 6, 17, 13, 0, tzinfo=timezone.utc), "price": Decimal("340.00"), "unit": "kg", "merchant": "Al-Fatah"},
                {"date": datetime(2026, 7, 21, 15, 0, tzinfo=timezone.utc), "price": Decimal("360.00"), "unit": "kg", "merchant": "Aghas Supermarket"},
                {"date": datetime(2026, 8, 15, 18, 0, tzinfo=timezone.utc), "price": Decimal("380.00"), "unit": "kg", "merchant": "Imtiaz Super Market"},
            ],
        },
    ]

    canonical_items_map: Dict[str, CanonicalItem] = {}
    total_price_points = 0
    for item_spec in cpi_items_data:
        c_item = CanonicalItem(
            household_id=household.id,
            name=item_spec["name"],
            category=item_spec["category"],
            standard_unit=item_spec["standard_unit"],
        )
        db.add(c_item)
        await db.flush()
        canonical_items_map[item_spec["name"]] = c_item

        for pt in item_spec["history"]:
            p_hist = PriceHistory(
                canonical_item_id=c_item.id,
                unit_price=pt["price"],
                unit=pt["unit"],
                merchant=pt["merchant"],
                recorded_at=pt["date"],
            )
            db.add(p_hist)
            total_price_points += 1
        await db.flush()

    print(f"✅ Created {len(canonical_items_map)} Canonical Items with {total_price_points} Historical Price Points")

    # 6. Create 18 Multi-Item Granular Transactions across accounts & envelopes (R2)
    # Summing up to envelope spent amounts:
    # - Grocery: 14,850 + 11,200 + 9,450 + 7,000 = 42,500 PKR
    # - Fuel & Commute: 11,400 + 8,550 + 8,050 = 28,000 PKR
    # - Utilities & Bills: 21,500 + 5,200 + 2,800 = 29,500 PKR
    # - Dining Out: 10,800 + 8,400 + 5,600 = 24,800 PKR (Overspent!)
    # - Shopping & Personal: 9,500 + 5,400 + 3,300 = 18,200 PKR
    # - Vehicle Maintenance: 5,200 + 1,800 = 7,000 PKR
    # Total Transactions Total Amount = 150,000 PKR
    transactions_spec = [
        # --- GROCERY TRANSACTIONS (42,500 PKR Total) ---
        {
            "account": "Meezan Bank",
            "envelope": "Grocery",
            "merchant": "Imtiaz Super Market",
            "source": TransactionSource.WHATSAPP,
            "raw_input": "Imtiaz bill 14850: 5kg aaloo, 10L doodh, 2 dozen anday, 10kg atta, 5L oil, 10kg chaawal, 5kg pyaz, 5kg tamatar, 3kg cheeni, spices",
            "transacted_at": datetime(2026, 8, 15, 11, 30, tzinfo=timezone.utc),
            "total_amount": Decimal("14850.00"),
            "line_items": [
                {"raw_name": "Aaloo (Potatoes)", "canonical": "Potato", "qty": Decimal("5.000"), "unit": "kg", "unit_price": Decimal("120.00"), "total": Decimal("600.00"), "notes": "Fresh organic potato sack"},
                {"raw_name": "Doodh (Olpers Milk Pack)", "canonical": "Milk", "qty": Decimal("10.000"), "unit": "liter", "unit_price": Decimal("240.00"), "total": Decimal("2400.00"), "notes": "Full cream milk carton"},
                {"raw_name": "Farm Fresh Anday", "canonical": "Eggs", "qty": Decimal("2.000"), "unit": "dozen", "unit_price": Decimal("340.00"), "total": Decimal("680.00"), "notes": "Omega-3 enriched eggs"},
                {"raw_name": "Chakki Atta (10kg bag)", "canonical": "Flour", "qty": Decimal("1.000"), "unit": "10kg", "unit_price": Decimal("1420.00"), "total": Decimal("1420.00"), "notes": "Whole wheat flour"},
                {"raw_name": "Dalda Cooking Oil (5L Can)", "canonical": "Cooking Oil", "qty": Decimal("5.000"), "unit": "liter", "unit_price": Decimal("550.00"), "total": Decimal("2750.00"), "notes": "Fortified canola cooking oil"},
                {"raw_name": "Basmati Super Karnal Rice (10kg)", "canonical": "Rice", "qty": Decimal("10.000"), "unit": "kg", "unit_price": Decimal("380.00"), "total": Decimal("3800.00"), "notes": "Aged long grain rice"},
                {"raw_name": "Pyaz (Red Onions)", "canonical": "Onion", "qty": Decimal("5.000"), "unit": "kg", "unit_price": Decimal("190.00"), "total": Decimal("950.00"), "notes": "Fresh medium red onions"},
                {"raw_name": "Tamatar (Fresh Tomatoes)", "canonical": "Tomato", "qty": Decimal("5.000"), "unit": "kg", "unit_price": Decimal("160.00"), "total": Decimal("800.00"), "notes": "Firm ripe salad tomatoes"},
                {"raw_name": "Cheeni (Refined Sugar)", "canonical": "Sugar", "qty": Decimal("3.000"), "unit": "kg", "unit_price": Decimal("155.00"), "total": Decimal("465.00"), "notes": "Pure white cane sugar"},
                {"raw_name": "Shan Biryani & Karahi Masala", "canonical": None, "qty": Decimal("4.000"), "unit": "piece", "unit_price": Decimal("246.25"), "total": Decimal("985.00"), "notes": "Assorted spice boxes"},
            ],
        },
        {
            "account": "Sadapay",
            "envelope": "Grocery",
            "merchant": "Al-Fatah Gourmet",
            "source": TransactionSource.MOBILE,
            "raw_input": "Al-Fatah receipt for dairy, cheese, and poultry staples",
            "transacted_at": datetime(2026, 8, 10, 16, 45, tzinfo=timezone.utc),
            "total_amount": Decimal("11200.00"),
            "line_items": [
                {"raw_name": "Greek Yogurt (1kg)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("850.00"), "total": Decimal("1700.00"), "notes": "Plain unsweetened"},
                {"raw_name": "Imported Cheddar Cheese (500g)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("1450.00"), "total": Decimal("2900.00"), "notes": "Vintage mature cheddar"},
                {"raw_name": "Doodh (Dairy Pure Milk)", "canonical": "Milk", "qty": Decimal("6.000"), "unit": "liter", "unit_price": Decimal("240.00"), "total": Decimal("1440.00"), "notes": "Pasteurized pouch"},
                {"raw_name": "Farm Fresh Desi Anday", "canonical": "Eggs", "qty": Decimal("3.000"), "unit": "dozen", "unit_price": Decimal("340.00"), "total": Decimal("1020.00"), "notes": "Free range brown eggs"},
                {"raw_name": "K&N's Chicken Breast Fillets (1kg)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("1850.00"), "total": Decimal("3700.00"), "notes": "Boneless frozen breast"},
                {"raw_name": "Dawn Whole Wheat Bread (Large)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("220.00"), "total": Decimal("440.00"), "notes": "High fiber sliced loaf"},
            ],
        },
        {
            "account": "Wallet Cash",
            "envelope": "Grocery",
            "merchant": "Aghas Supermarket",
            "source": TransactionSource.WEB,
            "raw_input": "Weekly vegetables, tea, and dairy refill",
            "transacted_at": datetime(2026, 8, 4, 18, 20, tzinfo=timezone.utc),
            "total_amount": Decimal("9450.00"),
            "line_items": [
                {"raw_name": "Aaloo (Potatoes)", "canonical": "Potato", "qty": Decimal("4.000"), "unit": "kg", "unit_price": Decimal("120.00"), "total": Decimal("480.00"), "notes": "Baking potatoes"},
                {"raw_name": "Pyaz (Onions)", "canonical": "Onion", "qty": Decimal("4.000"), "unit": "kg", "unit_price": Decimal("190.00"), "total": Decimal("760.00"), "notes": "Red onions"},
                {"raw_name": "Tamatar (Tomatoes)", "canonical": "Tomato", "qty": Decimal("3.000"), "unit": "kg", "unit_price": Decimal("160.00"), "total": Decimal("480.00"), "notes": "Vine ripe tomatoes"},
                {"raw_name": "Tapal Danedar Tea (950g)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("1750.00"), "total": Decimal("3500.00"), "notes": "Black tea economy pouch"},
                {"raw_name": "Nurpur Butter (200g)", "canonical": None, "qty": Decimal("5.000"), "unit": "piece", "unit_price": Decimal("480.00"), "total": Decimal("2400.00"), "notes": "Salted butter blocks"},
                {"raw_name": "National Mixed Pickle (1kg)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("615.00"), "total": Decimal("1230.00"), "notes": "Traditional mango-chilli achar jar"},
                {"raw_name": "Cheeni (Sugar)", "canonical": "Sugar", "qty": Decimal("4.000"), "unit": "kg", "unit_price": Decimal("150.00"), "total": Decimal("600.00"), "notes": "Sugar 4kg refill pack"},
            ],
        },
        {
            "account": "Nayapay",
            "envelope": "Grocery",
            "merchant": "Metro Cash & Carry",
            "source": TransactionSource.WHATSAPP,
            "raw_input": "Bulk spices, lentils, and cleaning supplies",
            "transacted_at": datetime(2026, 7, 28, 14, 0, tzinfo=timezone.utc),
            "total_amount": Decimal("7000.00"),
            "line_items": [
                {"raw_name": "Daal Mash Premium (2kg)", "canonical": None, "qty": Decimal("2.000"), "unit": "kg", "unit_price": Decimal("550.00"), "total": Decimal("1100.00"), "notes": "Washed white lentils"},
                {"raw_name": "Daal Chana (2kg)", "canonical": None, "qty": Decimal("2.000"), "unit": "kg", "unit_price": Decimal("350.00"), "total": Decimal("700.00"), "notes": "Split yellow gram"},
                {"raw_name": "Surf Excel Washing Powder (3kg)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("1850.00"), "total": Decimal("3700.00"), "notes": "Detergent economy box"},
                {"raw_name": "Lemon Max Dishwashing Liquid (750ml)", "canonical": None, "qty": Decimal("3.000"), "unit": "piece", "unit_price": Decimal("500.00"), "total": Decimal("1500.00"), "notes": "Anti-grease formula"},
            ],
        },

        # --- FUEL & COMMUTE TRANSACTIONS (28,000 PKR Total) ---
        {
            "account": "Sadapay",
            "envelope": "Fuel & Commute",
            "merchant": "Shell Fuel Station (F-7 Islamabad)",
            "source": TransactionSource.MOBILE,
            "raw_input": "Shell V-Power petrol 40 liters @ 285",
            "transacted_at": datetime(2026, 8, 16, 9, 15, tzinfo=timezone.utc),
            "total_amount": Decimal("11400.00"),
            "line_items": [
                {"raw_name": "Shell V-Power Petrol", "canonical": "Petrol", "qty": Decimal("40.000"), "unit": "liter", "unit_price": Decimal("285.00"), "total": Decimal("11400.00"), "notes": "Full tank fuel refill (Honda Civic)"},
            ],
        },
        {
            "account": "Nayapay",
            "envelope": "Fuel & Commute",
            "merchant": "Total Parco (Gulberg Lahore)",
            "source": TransactionSource.WHATSAPP,
            "raw_input": "Total Excellium 30L petrol",
            "transacted_at": datetime(2026, 8, 8, 19, 40, tzinfo=timezone.utc),
            "total_amount": Decimal("8550.00"),
            "line_items": [
                {"raw_name": "Total Excellium Petrol", "canonical": "Petrol", "qty": Decimal("30.000"), "unit": "liter", "unit_price": Decimal("285.00"), "total": Decimal("8550.00"), "notes": "Commute fuel refill"},
            ],
        },
        {
            "account": "Meezan Bank",
            "envelope": "Fuel & Commute",
            "merchant": "PSO Clifton (Karachi)",
            "source": TransactionSource.WEB,
            "raw_input": "PSO High Octane fuel and car care consumables",
            "transacted_at": datetime(2026, 8, 2, 12, 10, tzinfo=timezone.utc),
            "total_amount": Decimal("8050.00"),
            "line_items": [
                {"raw_name": "Altron X High Octane Petrol", "canonical": "Petrol", "qty": Decimal("25.000"), "unit": "liter", "unit_price": Decimal("285.00"), "total": Decimal("7125.00"), "notes": "Premium octane fuel"},
                {"raw_name": "Windshield Washer Fluid & Car Freshener", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("925.00"), "total": Decimal("925.00"), "notes": "Car maintenance supplies"},
            ],
        },

        # --- UTILITIES & BILLS TRANSACTIONS (29,500 PKR Total) ---
        {
            "account": "Meezan Bank",
            "envelope": "Utilities & Bills",
            "merchant": "K-Electric / IESCO Electricity",
            "source": TransactionSource.WEB,
            "raw_input": "Monthly electricity consumption bill for 450 units",
            "transacted_at": datetime(2026, 8, 12, 10, 0, tzinfo=timezone.utc),
            "total_amount": Decimal("21500.00"),
            "line_items": [
                {"raw_name": "Residential Electricity Bill (450 units)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("18500.00"), "total": Decimal("18500.00"), "notes": "Peak summer consumption tariff"},
                {"raw_name": "Electricity Fuel Price Adjustment (FPA)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("3000.00"), "total": Decimal("3000.00"), "notes": "Monthly NEPRA FPA surcharge"},
            ],
        },
        {
            "account": "Sadapay",
            "envelope": "Utilities & Bills",
            "merchant": "PTCL Flash Fiber",
            "source": TransactionSource.MOBILE,
            "raw_input": "50Mbps Fiber internet and Smart TV package",
            "transacted_at": datetime(2026, 8, 5, 15, 30, tzinfo=timezone.utc),
            "total_amount": Decimal("5200.00"),
            "line_items": [
                {"raw_name": "50 Mbps Fiber Internet Subscription", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("4500.00"), "total": Decimal("4500.00"), "notes": "Monthly uncapped high speed fiber plan"},
                {"raw_name": "Smart TV HD Package Add-on", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("700.00"), "total": Decimal("700.00"), "notes": "Digital HD channels subscription"},
            ],
        },
        {
            "account": "Nayapay",
            "envelope": "Utilities & Bills",
            "merchant": "SNGPL Sui Gas",
            "source": TransactionSource.WHATSAPP,
            "raw_input": "Sui Gas monthly domestic meter bill",
            "transacted_at": datetime(2026, 8, 3, 11, 0, tzinfo=timezone.utc),
            "total_amount": Decimal("2800.00"),
            "line_items": [
                {"raw_name": "Domestic Gas Consumption Bill", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("2800.00"), "total": Decimal("2800.00"), "notes": "SNGPL meter bill"},
            ],
        },

        # --- DINING OUT TRANSACTIONS (24,800 PKR Total — OVERSPENT by 4,800 PKR!) ---
        {
            "account": "Meezan Bank",
            "envelope": "Dining Out",
            "merchant": "Kolachi Restaurant (Do Darya Karachi)",
            "source": TransactionSource.WHATSAPP,
            "raw_input": "Kolachi family dinner: Mutton karahi, reshmi kabab, prawns, naan & drinks",
            "transacted_at": datetime(2026, 8, 14, 21, 0, tzinfo=timezone.utc),
            "total_amount": Decimal("10800.00"),
            "line_items": [
                {"raw_name": "Mutton Karahi (Full)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("3600.00"), "total": Decimal("3600.00"), "notes": "Desi ghee special mutton karahi"},
                {"raw_name": "Chicken Reshmi Kabab (2 plates)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("1350.00"), "total": Decimal("2700.00"), "notes": "Charcoal grilled skewers"},
                {"raw_name": "Garlic Roghani Naan (8 pcs)", "canonical": None, "qty": Decimal("8.000"), "unit": "piece", "unit_price": Decimal("150.00"), "total": Decimal("1200.00"), "notes": "Fresh tandoori naans"},
                {"raw_name": "Prawn Tempura (Family Platter)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("2100.00"), "total": Decimal("2100.00"), "notes": "Crispy fried jumbo prawns"},
                {"raw_name": "Fresh Mint Lemonade & Soft Drinks", "canonical": None, "qty": Decimal("4.000"), "unit": "piece", "unit_price": Decimal("300.00"), "total": Decimal("1200.00"), "notes": "Chilled beverages"},
            ],
        },
        {
            "account": "Sadapay",
            "envelope": "Dining Out",
            "merchant": "Monal Islamabad (Pir Sohawa)",
            "source": TransactionSource.MOBILE,
            "raw_input": "Dinner at Monal: Chicken makhni handi, beef seekh kabab, biryani, falooda",
            "transacted_at": datetime(2026, 8, 7, 20, 30, tzinfo=timezone.utc),
            "total_amount": Decimal("8400.00"),
            "line_items": [
                {"raw_name": "Chicken Makhni Handi", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("2400.00"), "total": Decimal("2400.00"), "notes": "Creamy boneless handi"},
                {"raw_name": "Beef Seekh Kabab Platter", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("2100.00"), "total": Decimal("2100.00"), "notes": "Traditional spiced seekh"},
                {"raw_name": "Special Dum Biryani (2 platters)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("1200.00"), "total": Decimal("2400.00"), "notes": "Fragrant saffron rice platter"},
                {"raw_name": "Kulfi Falooda Desserts", "canonical": None, "qty": Decimal("3.000"), "unit": "piece", "unit_price": Decimal("500.00"), "total": Decimal("1500.00"), "notes": "Rabri malai falooda"},
            ],
        },
        {
            "account": "Wallet Cash",
            "envelope": "Dining Out",
            "merchant": "Espresso Coffee & Bistro",
            "source": TransactionSource.WEB,
            "raw_input": "Coffee and dessert meeting",
            "transacted_at": datetime(2026, 8, 1, 17, 0, tzinfo=timezone.utc),
            "total_amount": Decimal("5600.00"),
            "line_items": [
                {"raw_name": "Club Sandwich with Fries", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("1400.00"), "total": Decimal("2800.00"), "notes": "Toasted triple decker chicken sandwich"},
                {"raw_name": "Spanish Latte (Large)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("850.00"), "total": Decimal("1700.00"), "notes": "Espresso with condensed milk"},
                {"raw_name": "New York Cheesecake Slice", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("1100.00"), "total": Decimal("1100.00"), "notes": "Blueberry compote slice"},
            ],
        },

        # --- SHOPPING & PERSONAL TRANSACTIONS (18,200 PKR Total) ---
        {
            "account": "Meezan Bank",
            "envelope": "Shopping & Personal",
            "merchant": "Khaadi Prêt",
            "source": TransactionSource.MOBILE,
            "raw_input": "Khaadi summer apparel shopping",
            "transacted_at": datetime(2026, 8, 11, 15, 40, tzinfo=timezone.utc),
            "total_amount": Decimal("9500.00"),
            "line_items": [
                {"raw_name": "Embroidered Kurta Stitched", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("5800.00"), "total": Decimal("5800.00"), "notes": "Summer lawn embroidered tunic"},
                {"raw_name": "Cotton Silk Trousers", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("2500.00"), "total": Decimal("2500.00"), "notes": "Straight cut white trousers"},
                {"raw_name": "Printed Voile Dupatta", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("1200.00"), "total": Decimal("1200.00"), "notes": "Floral print scarf"},
            ],
        },
        {
            "account": "Sadapay",
            "envelope": "Shopping & Personal",
            "merchant": "Servis Shoes & Leather",
            "source": TransactionSource.WEB,
            "raw_input": "Formal leather shoes and accessory",
            "transacted_at": datetime(2026, 8, 6, 14, 15, tzinfo=timezone.utc),
            "total_amount": Decimal("5400.00"),
            "line_items": [
                {"raw_name": "Men's Casual Leather Loafers", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("4200.00"), "total": Decimal("4200.00"), "notes": "Slip-on brown leather loafers"},
                {"raw_name": "Genuine Leather Belt (Black)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("1200.00"), "total": Decimal("1200.00"), "notes": "Formal pin buckle belt"},
            ],
        },
        {
            "account": "Wallet Cash",
            "envelope": "Shopping & Personal",
            "merchant": "Saeed Ghani Natural Care",
            "source": TransactionSource.WHATSAPP,
            "raw_input": "Organic rose water, shampoo, and attar",
            "transacted_at": datetime(2026, 8, 2, 18, 50, tzinfo=timezone.utc),
            "total_amount": Decimal("3300.00"),
            "line_items": [
                {"raw_name": "Pure Organic Rose Water Spray (200ml)", "canonical": None, "qty": Decimal("2.000"), "unit": "piece", "unit_price": Decimal("450.00"), "total": Decimal("900.00"), "notes": "Natural skin toner"},
                {"raw_name": "Herbal Anti-Hairfall Shampoo (500ml)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("1100.00"), "total": Decimal("1100.00"), "notes": "Amla and reetha herbal formula"},
                {"raw_name": "Attar / Perfume Oil (Oud Maliki)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("1300.00"), "total": Decimal("1300.00"), "notes": "Alcohol-free concentrated fragrance"},
            ],
        },

        # --- VEHICLE MAINTENANCE TRANSACTIONS (7,000 PKR Total) ---
        {
            "account": "Nayapay",
            "envelope": "Vehicle Maintenance",
            "merchant": "Toyota Capital Motors (I-9 Islamabad)",
            "source": TransactionSource.MOBILE,
            "raw_input": "Periodic service: Engine oil and genuine oil filter replacement",
            "transacted_at": datetime(2026, 8, 9, 11, 20, tzinfo=timezone.utc),
            "total_amount": Decimal("5200.00"),
            "line_items": [
                {"raw_name": "Toyota Genuine Motor Oil 5W-30 (4L)", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("3800.00"), "total": Decimal("3800.00"), "notes": "Full synthetic motor oil"},
                {"raw_name": "Toyota OEM Oil Filter Replacement", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("1400.00"), "total": Decimal("1400.00"), "notes": "Genuine replacement cartridge"},
            ],
        },
        {
            "account": "Wallet Cash",
            "envelope": "Vehicle Maintenance",
            "merchant": "Speedy Wheel Alignment & Balancing",
            "source": TransactionSource.WEB,
            "raw_input": "3D wheel alignment and 4 wheel balancing",
            "transacted_at": datetime(2026, 8, 3, 16, 30, tzinfo=timezone.utc),
            "total_amount": Decimal("1800.00"),
            "line_items": [
                {"raw_name": "3D Computerized Wheel Alignment", "canonical": None, "qty": Decimal("1.000"), "unit": "piece", "unit_price": Decimal("1200.00"), "total": Decimal("1200.00"), "notes": "Front and rear camber alignment"},
                {"raw_name": "Dynamic Wheel Balancing (4 wheels)", "canonical": None, "qty": Decimal("4.000"), "unit": "piece", "unit_price": Decimal("150.00"), "total": Decimal("600.00"), "notes": "Lead weight balancing"},
            ],
        },
    ]

    total_transactions_created = 0
    total_line_items_created = 0

    for tx_spec in transactions_spec:
        account_obj = accounts_map[tx_spec["account"]]
        envelope_obj = envelopes_map[tx_spec["envelope"]]

        # Drive balances from the transactions (the seed doesn't route through
        # LedgerService to keep the 10 curated canonical items intact, so apply the
        # same account debit / envelope spend that LedgerService.create_transaction would).
        account_obj.current_balance -= tx_spec["total_amount"]
        envelope_obj.spent_amount += tx_spec["total_amount"]

        tx_obj = Transaction(
            household_id=household.id,
            account_id=account_obj.id,
            envelope_id=envelope_obj.id,
            total_amount=tx_spec["total_amount"],
            merchant=tx_spec["merchant"],
            source=tx_spec["source"],
            raw_input=tx_spec.get("raw_input"),
            transacted_at=tx_spec["transacted_at"],
        )
        db.add(tx_obj)
        await db.flush()
        total_transactions_created += 1

        for item_data in tx_spec["line_items"]:
            canonical_id = None
            if item_data.get("canonical"):
                canonical_item_obj = canonical_items_map.get(item_data["canonical"])
                if canonical_item_obj:
                    canonical_id = canonical_item_obj.id

            line_item_obj = LineItem(
                transaction_id=tx_obj.id,
                canonical_item_id=canonical_id,
                raw_item_name=item_data["raw_name"],
                quantity=item_data["qty"],
                unit=item_data["unit"],
                unit_price=item_data["unit_price"],
                total_price=item_data["total"],
                notes=item_data.get("notes"),
            )
            db.add(line_item_obj)
            total_line_items_created += 1

        await db.flush()

    print(f"✅ Created {total_transactions_created} Granular Transactions with {total_line_items_created} Line Items")

    # 7. Create Financial Goals & Sinking Funds (R4)
    # 1. Umrah 2027: Target-by-date (Target: 800,000 PKR, Target Date: 2027-06-01, Current: 160,000 PKR)
    # 2. Emergency Cushion: Target-cap (Target: 500,000 PKR, Current: 220,000 PKR)
    # 3. Vehicle Maintenance: Sinking-fund (Target: 100,000 PKR, Target Date: 2026-12-31, Current: 45,000 PKR)
    goals_data = [
        {
            "name": "Umrah 2027",
            "goal_type": GoalType.TARGET_BY_DATE,
            "target_amount": Decimal("800000.00"),
            "target_date": date(2027, 6, 1),
            "current_balance": Decimal("160000.00"),
            "envelope_name": "Umrah 2027",
        },
        {
            "name": "Emergency Cushion",
            "goal_type": GoalType.TARGET_CAP,
            "target_amount": Decimal("500000.00"),
            "target_date": None,
            "current_balance": Decimal("220000.00"),
            "envelope_name": "Emergency Cushion",
        },
        {
            "name": "Vehicle Maintenance",
            "goal_type": GoalType.SINKING_FUND,
            "target_amount": Decimal("100000.00"),
            "target_date": date(2026, 12, 31),
            "current_balance": Decimal("45000.00"),
            "envelope_name": "Vehicle Maintenance",
        },
    ]

    goals_map: Dict[str, Goal] = {}
    for g_spec in goals_data:
        env_obj = envelopes_map.get(g_spec["envelope_name"])
        goal_obj = Goal(
            household_id=household.id,
            envelope_id=env_obj.id if env_obj else None,
            name=g_spec["name"],
            goal_type=g_spec["goal_type"],
            target_amount=g_spec["target_amount"],
            target_date=g_spec["target_date"],
            current_balance=g_spec["current_balance"],
        )
        db.add(goal_obj)
        await db.flush()
        goals_map[g_spec["name"]] = goal_obj

    print(f"✅ Created {len(goals_map)} Financial Goals & Sinking Funds")

    # Commit all changes
    await db.commit()

    # 8. Compute and display ZBB & Data Verification Report
    zbb_summary = await ZBBService.get_zbb_summary(household_id=household.id, db=db)
    overspent_envs = await ZBBService.get_overspent_envelopes(household_id=household.id, db=db)
    cpi_trends = await CPIService.get_cpi_trends(household_id=household.id, db=db)

    print("\n" + "=" * 70)
    print("✨ TAZKIYAH DEMO DATASET SEEDING COMPLETE ✨")
    print("=" * 70)
    print(f"🏠 Household ID        : {household.id}")
    print(f"👤 Admin User           : {user.full_name} ({user.phone_number}, {user.email})")
    print(f"💵 Total Liquid Inflow  : PKR {zbb_summary.total_inflow:,.2f}")
    print(f"📋 Total Assigned       : PKR {zbb_summary.total_assigned:,.2f}")
    print(f"🎯 Unassigned Cash      : PKR {zbb_summary.unassigned_cash:,.2f}  <-- Zero-Based Budgeting Achieved!")
    print(f"🛒 Total Spent          : PKR {zbb_summary.total_spent:,.2f}")
    print(f"⚠️  Overspent Envelopes  : {len(overspent_envs)} ({', '.join(e.name for e in overspent_envs)})")
    print(f"📦 Canonical Staples    : {len(cpi_trends)} items tracked with historical CPI trends")
    print(f"💳 Transactions Seeded  : {total_transactions_created} transactions ({total_line_items_created} line items)")
    print(f"🎯 Goals Tracked        : {len(goals_map)} goals")
    print("=" * 70 + "\n")

    return {
        "household_id": household.id,
        "user_id": user.id,
        "accounts": {k: v.id for k, v in accounts_map.items()},
        "groups": {k: v.id for k, v in groups_map.items()},
        "envelopes": {k: v.id for k, v in envelopes_map.items()},
        "canonical_items": {k: v.id for k, v in canonical_items_map.items()},
        "goals": {k: v.id for k, v in goals_map.items()},
        "zbb_summary": zbb_summary.model_dump(),
        "total_transactions": total_transactions_created,
        "total_line_items": total_line_items_created,
    }


async def main():
    """CLI Entrypoint for running python apps/api/scripts/seed_demo_data.py"""
    async with engine.begin() as conn:
        # Ensure database tables exist
        await conn.run_sync(Base.metadata.create_all)
    
    await seed_demo_data()


if __name__ == "__main__":
    asyncio.run(main())
