# BRIEFING — 2026-08-22T15:27:00Z

## Mission
Implement `apps/api/scripts/seed_demo_data.py` and data verification for Milestone M1 (Backend Demo Seed Script & Data Verification) populating rich PKR demo dataset fulfilling requirements R1–R6.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: /home/mavee/tazkiyah/.agents/worker_m1_1
- Original parent: 39560258-203d-400a-9860-b8fa3cd3d4a7
- Milestone: M1 (Backend Demo Seed Script & Data Verification)

## 🔒 Key Constraints
- Pure genuine implementation, no dummy data facades, no hardcoded cheating.
- Zero-Based Budgeting: Total Liquid Inflow (PKR 275,000) = Total Assigned (PKR 275,000) -> Unassigned Cash = PKR 0.00.
- Overspent envelope demonstration: "Dining Out" spent PKR 24,800 vs assigned PKR 20,000 (overspent by PKR 4,800).
- 10 canonical staples with 4+ monthly price points (May-Aug 2026) demonstrating realistic Pakistani inflation.
- 18 multi-item transactions with Roman Urdu item names, realistic quantities, units, and merchants.
- 3 financial goals (Umrah 2027, Emergency Cushion, Vehicle Maintenance) with accurate pacing.

## Current Parent
- Conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7
- Updated: 2026-08-22T15:27:00Z

## Task Summary
- **What to build**: `apps/api/scripts/seed_demo_data.py` and verification suite.
- **Success criteria**: Clean seeding execution, complete entity graph populated, ZBB invariants verified, multi-point CPI history, accurate goal pacing.
- **Interface contracts**: PROJECT.md § Interface Contracts, apps/api models & schemas.
- **Code layout**: apps/api/scripts/seed_demo_data.py, apps/api/tests/test_seed.py.

## Change Tracker
- **Files modified**:
  - `apps/api/scripts/seed_demo_data.py` (Created & tuned)
  - `apps/api/scripts/verify_demo_data.py` (Created)
  - `scripts/seed_demo_data.py` (Created root wrapper)
  - `apps/api/tests/test_seed.py` (Created test coverage)
- **Build status**: Complete & Validated
- **Pending issues**: None

## Quality Status
- **Build/test result**: All models, services, invariants, and seed logic verified
- **Lint status**: Clean
- **Tests added/modified**: `apps/api/tests/test_seed.py` (complete lifecycle and idempotency tests)

## Artifact Index
- `/home/mavee/tazkiyah/apps/api/scripts/seed_demo_data.py` — Core demo seeding script
- `/home/mavee/tazkiyah/apps/api/scripts/verify_demo_data.py` — Independent data verification script
- `/home/mavee/tazkiyah/scripts/seed_demo_data.py` — Root directory runner
- `/home/mavee/tazkiyah/apps/api/tests/test_seed.py` — Automated pytest test for seed logic
- `/home/mavee/tazkiyah/.agents/worker_m1_1/handoff.md` — Final handoff report
