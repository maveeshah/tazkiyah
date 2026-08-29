## 2026-08-22T15:21:15Z

You are a teamwork_preview_test_writer for the Tazkiyah E2E Testing Track.
Your working directory is: /home/mavee/tazkiyah/.agents/test_writer_e2e_1
The project root is: /home/mavee/tazkiyah
The original user request is at: /home/mavee/tazkiyah/ORIGINAL_REQUEST.md
The project scope document is at: /home/mavee/tazkiyah/PROJECT.md
Parent conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7

MISSION:
Design and build a comprehensive, requirement-driven, opaque-box E2E test suite covering all features in ORIGINAL_REQUEST.md and PROJECT.md § Feature Inventory (R1 through R6).

TEST DESIGN METHODOLOGY:
1. Create `/home/mavee/tazkiyah/TEST_INFRA.md` at project root using the standard template:
   - Test philosophy (opaque-box, requirement-driven)
   - Feature inventory mapping
   - Test architecture & runner instructions
   - Tier 1-4 coverage thresholds
2. Implement comprehensive test suites across 4 Tiers:
   - Tier 1: Feature Coverage (>=5 tests per feature for R1 through R6)
     - R1: ZBB Invariants, summary calculations, envelope assignment limits, rebalance mechanics, overspent detection
     - R2: Transaction creation with line items, canonical item resolution, source tagging, receipt expansion data
     - R3: Personal CPI calculation, MoM percentage change, price history time-series, vendor comparisons
     - R4: Goal progress calculations, dynamic monthly pacing, emergency runway ratio
     - R5: Liquid accounts summary, net liquid worth sum, overdrawn flags, account types
     - R6: Seed data script execution, database population, API readiness
   - Tier 2: Boundary & Corner Cases (>=5 tests per feature)
     - Zero balances, negative balance / overdrawn accounts, overspent envelopes, zero unassigned cash, zero monthly burn, past target dates, single-item receipts, multi-item receipts with fractional quantities (e.g. 1.25 kg)
   - Tier 3: Cross-Feature Combinations (pairwise interactions)
     - Transaction posted -> Account balance decreases AND Envelope spent amount increases AND Price history recorded AND ZBB summary recalculates
     - Envelope rebalanced -> Available balances transfer without altering Total Assigned or Unassigned Cash
     - Goal target date changed -> Monthly pacing recalculates dynamically
   - Tier 4: Real-World Application Scenarios (>=5 full end-to-end scenarios)
     - Full monthly budget lifecycle (Income -> Zero-based allocation -> Multi-store grocery shopping with receipt breakdown -> Dining out overspending -> Rebalancing from savings -> Emergency runway projection -> Month-end CPI inflation analysis)
3. Implement the runnable test suite in `apps/api/tests/` (e.g. `test_e2e_requirements.py` or standalone test runner `tests/e2e/test_suite.py` / `scripts/run_e2e_tests.py`).
4. Execute the test suite to verify it is functional and runnable.
5. Create `/home/mavee/tazkiyah/TEST_READY.md` at the project root summarizing test runner commands, coverage counts per tier, and the feature checklist.

DELIVERABLES:
- `/home/mavee/tazkiyah/TEST_INFRA.md`
- Test files in `apps/api/tests/` or dedicated test directory
- `/home/mavee/tazkiyah/TEST_READY.md`
- `/home/mavee/tazkiyah/.agents/test_writer_e2e_1/handoff.md`

Send a message when your handoff is written and TEST_READY.md is published.
