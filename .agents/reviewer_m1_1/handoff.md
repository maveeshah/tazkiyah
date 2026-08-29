# Milestone M1 Review & Adversarial Challenge Report

**Milestone**: M1 — Backend Demo Seed Script & Data Verification  
**Reviewer Role**: `reviewer`, `critic`  
**Verdict**: `APPROVE`  
**Integrity Audit**: PASSED (0 integrity violations, 0 facade implementations)

---

## 1. Observation

A comprehensive, multi-angle code and data inspection was conducted across all deliverables produced for Milestone M1:

### 1.1 Deliverable Files Inspected
1. **`apps/api/scripts/seed_demo_data.py`** (739 lines):
   - Standalone asynchronous seeder using SQLAlchemy 2.0 async engine and ORM models.
   - Cleans up pre-existing `"Mavee Household"` and orphaned admin user `+923001234567` (lines 56–73).
   - Creates `Household` ("Mavee Household", PKR) and `User` ("Mavee", Admin) (lines 75–91).
   - Creates 4 liquid accounts totaling PKR 275,000.00:
     - `Wallet Cash` (`CASH`): PKR 25,000.00
     - `Meezan Bank` (`BANK`): PKR 180,000.00
     - `Sadapay` (`EMI`): PKR 40,000.00
     - `Nayapay` (`EMI`): PKR 30,000.00
   - Creates 3 `EnvelopeGroup` instances ("Daily Living", "Discretionary", "Savings & Sinking Funds") and 8 `Envelope` instances with exact allocation matching Total Liquid Inflow:
     - Total Assigned = 60,000 + 35,000 + 30,000 + 20,000 + 25,000 + 40,000 + 50,000 + 15,000 = **PKR 275,000.00**.
     - Envelope `"Dining Out"` assigned PKR 20,000.00 vs spent PKR 24,800.00 -> available balance = **-PKR 4,800.00** (Overspent alert demonstration).
   - Creates 10 `CanonicalItem` entities with 4 historical `PriceHistory` entries each (40 records total) across May, June, July, August 2026 showing realistic Pakistani inflation:
     - Potato, Milk, Eggs, Petrol, Flour, Cooking Oil, Onion, Tomato, Sugar, Rice.
   - Creates 18 `Transaction` records with 50+ itemized `LineItem` records across diverse merchants (`Imtiaz Super Market`, `Al-Fatah Gourmet`, `Aghas Supermarket`, `Metro Cash & Carry`, `Shell Fuel Station`, `Total Parco`, `PSO Clifton`, `K-Electric / IESCO`, `PTCL Flash Fiber`, `SNGPL Sui Gas`, `Kolachi Restaurant`, `Monal Islamabad`, `Espresso Coffee`, `Khaadi Prêt`, `Servis Shoes`, `Saeed Ghani`, `Toyota Capital Motors`, `Speedy Wheel Alignment`).
   - Creates 3 `Goal` records with linked envelopes (`Umrah 2027` [TARGET_BY_DATE], `Emergency Cushion` [TARGET_CAP], `Vehicle Maintenance` [SINKING_FUND]).
   - Includes CLI entrypoint `main()` that creates database tables automatically if missing (`Base.metadata.create_all`).

2. **`apps/api/scripts/verify_demo_data.py`** (157 lines):
   - Standalone diagnostic audit querying the live database via `AsyncSessionLocal`.
   - Asserts all 6 core requirements (R1–R6), ZBB invariants, line item sums, CPI trend lengths, and goal pacing formulas.
   - Exits with status code 0 on success and 1 on failure.

3. **`scripts/seed_demo_data.py`** (28 lines):
   - Monorepo root wrapper dynamically resolving Python path and executing `seed_demo_data()`.

4. **`apps/api/tests/test_seed.py`** (193 lines):
   - Asynchronous pytest test suite executing the complete seeder lifecycle against `db_session`.
   - Rigorously validates account balances, envelope allocations, ZBB invariant calculations via `ZBBService`, CPI trend calculations via `CPIService`, 100% mathematical equality between transaction totals and sum of line items, financial goal properties, and idempotent re-runs.

---

## 2. Logic Chain

1. **Zero-Based Budget Invariant Verification**:
   - Total Inflow = $\sum \text{Account.current\_balance} = 25,000 + 180,000 + 40,000 + 30,000 = 275,000.00\text{ PKR}$.
   - Total Assigned = $\sum \text{Envelope.assigned\_amount} = 60,000 + 35,000 + 30,000 + 20,000 + 25,000 + 40,000 + 50,000 + 15,000 = 275,000.00\text{ PKR}$.
   - Unassigned Cash = $\text{Total Inflow} - \text{Total Assigned} = 275,000.00 - 275,000.00 = 0.00\text{ PKR}$.
   - Overspent Envelope: `"Dining Out"` has `spent_amount` (24,800.00) > `assigned_amount` (20,000.00), yielding an available balance of `-4,800.00 PKR` and exactly `1` overspent envelope returned by `ZBBService.get_overspent_envelopes()`.
   - **Conclusion**: The Zero-Based Budget invariant is strictly satisfied.

2. **Transaction Line-Item Mathematical Consistency**:
   - Every single transaction was manually verified against its individual line items:
     - Imtiaz Super Market: $600 + 2400 + 680 + 1420 + 2750 + 3800 + 950 + 800 + 465 + 985 = 14,850.00\text{ PKR}$.
     - Al-Fatah Gourmet: $1700 + 2900 + 1440 + 1020 + 3700 + 440 = 11,200.00\text{ PKR}$.
     - Aghas Supermarket: $480 + 760 + 480 + 3500 + 2400 + 1230 + 600 = 9,450.00\text{ PKR}$.
     - Metro Cash & Carry: $1100 + 700 + 3700 + 1500 = 7,000.00\text{ PKR}$.
     - Shell Fuel Station: $40 \times 285 = 11,400.00\text{ PKR}$.
     - Total Parco: $30 \times 285 = 8,550.00\text{ PKR}$.
     - PSO Clifton: $7125 + 925 = 8,050.00\text{ PKR}$.
     - K-Electric / IESCO: $18500 + 3000 = 21,500.00\text{ PKR}$.
     - PTCL Flash Fiber: $4500 + 700 = 5,200.00\text{ PKR}$.
     - SNGPL Sui Gas: $2,800.00\text{ PKR}$.
     - Kolachi Restaurant: $3600 + 2700 + 1200 + 2100 + 1200 = 10,800.00\text{ PKR}$.
     - Monal Islamabad: $2400 + 2100 + 2400 + 1500 = 8,400.00\text{ PKR}$.
     - Espresso Coffee: $2800 + 1700 + 1100 = 5,600.00\text{ PKR}$.
     - Khaadi Prêt: $5800 + 2500 + 1200 = 9,500.00\text{ PKR}$.
     - Servis Shoes: $4200 + 1200 = 5,400.00\text{ PKR}$.
     - Saeed Ghani: $900 + 1100 + 1300 = 3,300.00\text{ PKR}$.
     - Toyota Capital Motors: $3800 + 1400 = 5,200.00\text{ PKR}$.
     - Speedy Wheel Alignment: $1200 + 600 = 1,800.00\text{ PKR}$.
   - Sum of all transactions = **PKR 150,000.00**, exactly matching the sum of envelope spent amounts ($42,500 + 28,000 + 29,500 + 24,800 + 18,200 + 7,000 = 150,000.00\text{ PKR}$).
   - **Conclusion**: Transaction data is internally consistent with zero rounding discrepancies.

3. **CPI Staple Inflation Realism**:
   - All 10 staples have 4 distinct historical price points spanning May, June, July, and August 2026.
   - Month-over-month price evolution reflects real Pakistani consumer price index dynamics (e.g. Potato +9.09%, Tomato +14.29%, Onion +8.57%, Petrol +2.52%).
   - `CPIService.get_cpi_trends` correctly resolves latest price, previous price, and inflation percentage.

4. **Idempotency & Cascade Deletion**:
   - `Household` model defines `cascade="all, delete-orphan"` across all child relationships (`users`, `accounts`, `envelope_groups`, `canonical_items`, `transactions`, `goals`).
   - When `seed_demo_data.py` deletes `existing_hh`, SQLAlchemy ORM and PostgreSQL foreign key cascade triggers cleanly clean up all existing records.
   - A subsequent run creates clean new records with new UUIDs without unique constraint violations.

---

## 3. Adversarial Stress-Test & Challenge Analysis

### Challenge 1: Idempotency under multiple existing households with same name
- **Assumption**: The database only contains at most one household named `"Mavee Household"`.
- **Attack Scenario**: If manual SQL queries or corrupted tests inserted two households named `"Mavee Household"`, `scalar_one_or_none()` on line 59 would raise `MultipleResultsFound`.
- **Blast Radius**: Low. The demo seeder manages its own dedicated demo household, and test fixtures use clean databases.
- **Mitigation Suggestion**: In future iterations, `scalars().all()` in a loop or `delete(Household).where(Household.name == "Mavee Household")` could be used for extra resilience.

### Challenge 2: Decimal vs Float Precision in Envelope Available Balance
- **Assumption**: `Envelope.available_balance` property returns `float`.
- **Stress-Test**: Because `assigned_amount` and `spent_amount` are stored as `Numeric(15, 2)` (Python `Decimal`), converting to `float` in `@property def available_balance` is fine for display, but database services (`ZBBService`) calculate totals using SQL aggregate functions and `Decimal`, avoiding floating-point drift.
- **Result**: PASSED. Real budget math operates on `Decimal`.

---

## 4. Integrity Audit

- **Hardcoded Test Results**: None found. All test assertions query the database session or service methods dynamically.
- **Dummy / Facade Logic**: None found. Full ORM entities, relationships, line items, and services are implemented.
- **Shortcuts / Task Bypassing**: None found. Multi-month historical data, rich Roman Urdu line items, and detailed merchant metadata are fully authored.
- **Self-Certifying Work**: None found. Both automated test suite (`test_seed.py`) and standalone CLI verifier (`verify_demo_data.py`) independently query and validate the database.

---

## 5. Caveats

- **No Caveats**: All criteria from `ORIGINAL_REQUEST.md` (R1–R6) and `PROJECT.md` Feature 1 & Feature 2 are fully met and verified.

---

## 6. Conclusion & Verdict

**Verdict**: `APPROVE`

Milestone M1 (Backend Demo Seed Script & Data Verification) is completed to an exceptional standard. The demo dataset fulfills all requirements for Zero-Based Budgeting, granular line-item receipt breakdown, personal CPI inflation trends, liquid accounts summary, and financial goal pacing.

---

## 7. Verification Method

To independently verify:
1. Inspect seeder code:
   `view_file /home/mavee/tazkiyah/apps/api/scripts/seed_demo_data.py`
2. Inspect verification code:
   `view_file /home/mavee/tazkiyah/apps/api/scripts/verify_demo_data.py`
3. Inspect pytest suite:
   `view_file /home/mavee/tazkiyah/apps/api/tests/test_seed.py`
4. Run CLI commands:
   ```bash
   cd /home/mavee/tazkiyah && python scripts/seed_demo_data.py
   cd /home/mavee/tazkiyah/apps/api && python scripts/verify_demo_data.py
   cd /home/mavee/tazkiyah/apps/api && pytest tests/test_seed.py
   ```
