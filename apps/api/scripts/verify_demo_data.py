"""
Tazkiyah Daily Finance & Wealth OS — Demo Data Verification Script
Independently verifies that the PostgreSQL database contains a complete,
valid, and consistent demo dataset fulfilling requirements R1–R6.
"""

import sys
import os
import asyncio
from decimal import Decimal

# Ensure apps/api directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.models.household import Household
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.goal import Goal
from app.services.zbb_service import ZBBService
from app.services.cpi_service import CPIService
from app.services.goal_service import GoalService


async def verify_demo_dataset() -> bool:
    print("🔍 Starting Tazkiyah Demo Data Verification...\n")
    all_passed = True

    async with AsyncSessionLocal() as db:
        # 1. Verify Household
        hh_res = await db.execute(
            select(Household)
            .options(selectinload(Household.users))
            .where(Household.name == "Mavee Household")
        )
        household = hh_res.scalar_one_or_none()
        if not household:
            print("❌ FAILED: Household 'Mavee Household' not found.")
            return False
        
        print(f"✅ Household: '{household.name}' ({household.id}) | Base Currency: {household.base_currency}")
        
        # Verify User
        if not household.users:
            print("❌ FAILED: No users found in household.")
            all_passed = False
        else:
            user = household.users[0]
            print(f"✅ Admin User: '{user.full_name}' | Phone: {user.phone_number} | Email: {user.email} | Role: {user.role}")

        # 2. Verify Accounts (R5)
        acc_res = await db.execute(
            select(Account).where(Account.household_id == household.id, Account.is_active == True)
        )
        accounts = acc_res.scalars().all()
        total_inflow = sum(a.current_balance for a in accounts)
        print(f"\n✅ Accounts Found: {len(accounts)}")
        for a in accounts:
            print(f"   - {a.name} ({a.type.value}): PKR {a.current_balance:,.2f} (Overdrawn: {a.is_overdrawn})")
        print(f"   -> Total Liquid Inflow: PKR {total_inflow:,.2f}")
        
        # Opening balances total 275,000; the 18 seeded transactions debit 150,000.
        if total_inflow != Decimal("125000.00"):
            print(f"❌ FAILED: Expected total liquid inflow PKR 125,000.00, got PKR {total_inflow:,.2f}")
            all_passed = False

        # 3. Verify Envelopes & ZBB Invariants (R1)
        zbb_summary = await ZBBService.get_zbb_summary(household.id, db)
        overspent_envs = await ZBBService.get_overspent_envelopes(household.id, db)
        
        print("\n✅ ZBB Summary:")
        print(f"   - Total Liquid Inflow  : PKR {zbb_summary.total_inflow:,.2f}")
        print(f"   - Total Assigned       : PKR {zbb_summary.total_assigned:,.2f}")
        print(f"   - Unassigned Cash      : PKR {zbb_summary.unassigned_cash:,.2f} (Target: PKR 0.00)")
        print(f"   - Total Spent          : PKR {zbb_summary.total_spent:,.2f}")
        print(f"   - Overspent Envelopes  : {zbb_summary.overspent_envelopes_count}")

        if zbb_summary.unassigned_cash != Decimal("0.00"):
            print(f"❌ FAILED: Unassigned cash must be 0.00, got {zbb_summary.unassigned_cash}")
            all_passed = False

        if zbb_summary.overspent_envelopes_count != 1:
            print(f"❌ FAILED: Expected 1 overspent envelope, got {zbb_summary.overspent_envelopes_count}")
            all_passed = False
        else:
            print(f"   -> Confirmed overspent envelope: '{overspent_envs[0].name}' (Available: PKR {overspent_envs[0].available_balance:,.2f})")

        # 4. Verify Canonical Items & CPI Trends (R3)
        cpi_trends = await CPIService.get_cpi_trends(household.id, db)
        print(f"\n✅ Canonical Staple Items: {len(cpi_trends)} items")
        for item in cpi_trends:
            inf_str = f"+{item.inflation_rate_percentage:.2f}%" if item.inflation_rate_percentage else "N/A"
            print(f"   - {item.name} ({item.category}, per {item.standard_unit}): Latest = PKR {item.latest_price} | Prev = PKR {item.previous_price} | Inflation = {inf_str} | History Points = {len(item.history)}")

        if len(cpi_trends) < 10:
            print(f"❌ FAILED: Expected 10 canonical items, found {len(cpi_trends)}")
            all_passed = False

        # 5. Verify Transactions & Line Items (R2)
        tx_res = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.line_items), selectinload(Transaction.account), selectinload(Transaction.envelope))
            .where(Transaction.household_id == household.id)
            .order_by(Transaction.transacted_at.desc())
        )
        transactions = tx_res.scalars().all()
        total_line_items = sum(len(t.line_items) for t in transactions)
        tx_total_amount = sum(t.total_amount for t in transactions)
        
        print(f"\n✅ Transactions: {len(transactions)} transactions ({total_line_items} line items, Total: PKR {tx_total_amount:,.2f})")
        if len(transactions) < 15:
            print(f"❌ FAILED: Expected >= 15 transactions, found {len(transactions)}")
            all_passed = False

        # Verify line-item sums equal transaction totals
        for t in transactions:
            li_sum = sum(li.total_price for li in t.line_items)
            if li_sum != t.total_amount:
                print(f"❌ FAILED: Transaction {t.id} total ({t.total_amount}) != sum of line items ({li_sum})")
                all_passed = False

        # 6. Verify Goals & Sinking Funds (R4)
        goals_res = await db.execute(
            select(Goal)
            .where(Goal.household_id == household.id)
            .options(selectinload(Goal.envelope))
        )
        goals = goals_res.scalars().all()
        print(f"\n✅ Financial Goals: {len(goals)} goals")
        for g in goals:
            pacing = GoalService.calculate_monthly_pacing(g, GoalService.resolve_current_balance(g))
            pacing_str = f"PKR {pacing:,.2f}/mo" if pacing is not None else "N/A"
            print(f"   - {g.name} ({g.goal_type.value}): Current = PKR {g.current_balance:,.2f} / Target = PKR {g.target_amount:,.2f} | Target Date: {g.target_date} | Monthly Pacing: {pacing_str}")

        if len(goals) != 3:
            print(f"❌ FAILED: Expected 3 goals, found {len(goals)}")
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("🎉 ALL DATASET VERIFICATION CHECKS PASSED PERFECTLY! 🎉")
    else:
        print("⚠️ SOME VERIFICATION CHECKS FAILED.")
    print("=" * 70 + "\n")
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(verify_demo_dataset())
    sys.exit(0 if success else 1)
