# Forensic Integrity Audit Report: Milestone M1 (Backend Demo Seed Script & Data Verification)

**Work Product**: `apps/api/scripts/seed_demo_data.py`, `apps/api/scripts/verify_demo_data.py`, `apps/api/tests/test_seed.py`, `scripts/seed_demo_data.py`  
**Profile**: General Project  
**Integrity Mode**: Development (from `ORIGINAL_REQUEST.md`)  
**Verdict**: **`CLEAN`**

---

## 1. Observation

Direct forensic source code inspection, entity relationship mapping, and invariant analysis were performed across all Milestone M1 files:

### 1.1 Source File Observations
1. **`apps/api/scripts/seed_demo_data.py` (739 lines)**:
   - Contains async entrypoint `seed_demo_data(session: Optional[AsyncSession] = None)`.
   - Directly instantiates SQLAlchemy 2.0 ORM models: `Household`, `User`, `Account`, `EnvelopeGroup`, `Envelope`, `CanonicalItem`, `PriceHistory`, `Transaction`, `LineItem`, and `Goal`.
   - Uses `db.add()`, `db.flush()`, `db.delete()`, and `db.commit()` on genuine `AsyncSession` instances.
   - Cleans up pre-existing demo households and orphan users before populating to ensure idempotency.
   - Computes and verifies live database state via `ZBBService.get_zbb_summary()`, `ZBBService.get_overspent_envelopes()`, and `CPIService.get_cpi_trends()`.

2. **`apps/api/scripts/verify_demo_data.py` (157 lines)**:
   - Standalone execution script querying the live database via `AsyncSessionLocal()`.
   - Runs independent `SELECT` queries across `Household`, `User`, `Account`, `EnvelopeGroup`, `Envelope`, `CanonicalItem`, `PriceHistory`, `Transaction`, `LineItem`, and `Goal`.
   - Mathematically verifies `sum(li.total_price for li in t.line_items) == t.total_amount` for every transaction.
   - Validates that `unassigned_cash == Decimal("0.00")` and `overspent_envelopes_count == 1`.
   - Returns exit code 0 on complete success, 1 on failure.

3. **`apps/api/tests/test_seed.py` (193 lines)**:
   - Pytest test suite using real `db_session` async fixture from `conftest.py`.
   - Executes `test_seed_demo_data_complete_lifecycle` testing 9 distinct verification phases:
     1. Seeder execution.
     2. `Household` & `User` insertion and schema integrity.
     3. 4 `Account` entities totaling PKR 275,000.00.
     4. 3 `EnvelopeGroup` and 8 `Envelope` records.
     5. Zero-Based Budgeting invariants via `ZBBService` (Inflow: 275k, Assigned: 275k, Unassigned: 0.00, Spent: 150k, Overspent: 1).
     6. 10 `CanonicalItem` entities with 4+ monthly price points each showing positive MoM inflation.
     7. 18 `Transaction` records with 50+ itemized `LineItem` instances matching exact transaction sums.
     8. 3 `Goal` records (TARGET_BY_DATE, TARGET_CAP, SINKING_FUND) with correct attributes.
     9. Idempotency test (re-executing `seed_demo_data` on existing session without error).

4. **`scripts/seed_demo_data.py` (28 lines)**:
   - Root project wrapper that initializes database tables via `Base.metadata.create_all` and executes `seed_demo_data()`.

---

## 2. Logic Chain

### 2.1 Check 1: Authenticity of Database Insertions
- **Observation**: `apps/api/scripts/seed_demo_data.py` lines 52–693 construct ORM models and execute database operations via `db.add()` and `db.flush()`.
- **Reasoning**: No dummy mocks, mock return values, or bypassed sessions exist in `seed_demo_data.py`. When passed a session (such as `db_session` from pytest), it executes all SQL DDL and DML on the live async connection.
- **Verdict**: **PASS**

### 2.2 Check 2: Line-Item Integrity & Foreign Key Consistency
- **Observation**: Lines 325–640 of `seed_demo_data.py` define 18 multi-item transactions. Lines 604–638 insert `Transaction` objects and iterate through each item to insert `LineItem` objects with `transaction_id=tx_obj.id` and `canonical_item_id=canonical_id`.
- **Reasoning**:
  - All 18 transactions contain between 1 and 10 granular line items with authentic Roman Urdu names (`Aaloo`, `Doodh`, `Farm Fresh Anday`, `Chakki Atta`, `Dalda Cooking Oil`, `Mutton Karahi`, `Shell V-Power Petrol`, etc.).
  - The sum of `LineItem.total_price` across every transaction equals `Transaction.total_amount` down to the exact paisa (Decimal arithmetic).
  - Total transaction expenditure across all 18 transactions equals PKR 150,000.00, which precisely matches the sum of envelope spent amounts across categories (`Grocery`: 42.5k, `Fuel`: 28k, `Utilities`: 29.5k, `Dining Out`: 24.8k, `Shopping`: 18.2k, `Vehicle`: 7k).
- **Verdict**: **PASS**

### 2.3 Check 3: CPI Price History & Canonical Item Linkage
- **Observation**: Lines 176–314 of `seed_demo_data.py` define 10 canonical items with 4 historical price points each spanning May 2026 to August 2026.
- **Reasoning**:
  - `CanonicalItem` records are created with standard units (`kg`, `liter`, `dozen`, `10kg`).
  - `PriceHistory` records are created with explicit `canonical_item_id`, `unit_price`, `unit`, `merchant`, and `recorded_at` timestamps.
  - `CPIService.get_cpi_trends()` queries these tables via SQL `SELECT ... WHERE canonical_item_id == item.id ORDER BY recorded_at DESC` and computes real MoM inflation percentages.
- **Verdict**: **PASS**

### 2.4 Check 4: Test Suite Authenticity
- **Observation**: `apps/api/tests/test_seed.py` does not import `unittest.mock` or `pytest-mock`.
- **Reasoning**:
  - All test assertions execute direct SQLAlchemy queries (`db_session.execute(select(...))`) and service methods against the PostgreSQL/SQLite test database.
  - Assertions check database records directly (verifying primary keys, foreign keys, decimal balances, and joined collections via `selectinload`).
  - The test suite is fully authentic and verifiable.
- **Verdict**: **PASS**

### 2.5 Phase 1 & Phase 2 Forensic Profile Analysis
| Forensic Check | Observed Reality | Mode Rule (Development) | Verdict |
|---|---|---|---|
| Hardcoded test results | No hardcoded test responses or bypasses | Prohibited | **PASS** |
| Facade implementation | Authentic SQLAlchemy ORM models, relationships, and queries | Prohibited | **PASS** |
| Fabricated verification outputs | No pre-populated log files or fake output artifacts | Prohibited | **PASS** |
| Self-certifying mock tests | Real async queries and mathematical assertions against DB state | Prohibited | **PASS** |
| Framework & Library usage | Standard FastAPI, SQLAlchemy, Pydantic, Pytest stack | Permitted | **PASS** |

---

## 3. Caveats

- **No Caveats**: All data models, relationships, mathematical invariants, and verification scripts operate with authentic database transactions and meet all criteria in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

---

## 4. Conclusion

The forensic audit of Milestone M1 (Backend Demo Seed Script & Data Verification) confirms that the implementation is genuine, mathematically rigorous, and fully compliant with project standards.

**Final Verdict**: **`CLEAN`**

---

## 5. Verification Method

To independently verify this audit:
1. View seeder implementation: `view_file` on `apps/api/scripts/seed_demo_data.py`
2. View standalone verifier: `view_file` on `apps/api/scripts/verify_demo_data.py`
3. View test suite: `view_file` on `apps/api/tests/test_seed.py`
4. Run CLI verification:
   ```bash
   cd apps/api && python scripts/seed_demo_data.py
   python scripts/verify_demo_data.py
   pytest tests/test_seed.py -v
   ```
