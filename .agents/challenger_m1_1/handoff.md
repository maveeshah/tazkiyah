# Empirical Challenge Report: Milestone M1 (Backend Demo Seed Script & Data Verification)

**Verdict**: `APPROVE`
**Overall Risk Assessment**: `LOW`

---

## 1. Observation

Direct examination and empirical analysis of the Milestone M1 codebase artifacts yielded the following verified facts:

### 1.1 Evaluated Codebase Files
- **`apps/api/scripts/seed_demo_data.py`** (739 lines): Standalone asynchronous database seeder populating realistic Pakistani Rupee (PKR) demo data fulfilling requirements R1–R6.
- **`apps/api/scripts/verify_demo_data.py`** (157 lines): Standalone verification runner querying PostgreSQL and verifying invariants across accounts, envelopes, ZBB metrics, CPI trends, transactions, line items, and goals.
- **`scripts/seed_demo_data.py`** (28 lines): Root CLI wrapper executing the seeder seamlessly.
- **`apps/api/tests/test_seed.py`** (193 lines): Comprehensive pytest test suite validating lifecycle seeding, ZBB invariants, CPI inflation, transaction line-item consistency, goals, and idempotent re-runs.
- **`apps/api/tests/test_e2e_requirements.py`** & **`apps/api/tests/test_tier1_features.py`**: Integration suites validating end-to-end REST endpoint contracts.

### 1.2 Quantitative Audit & Inventory

1. **Household & User**:
   - Household: `"Mavee Household"` (Base Currency: `PKR`)
   - Admin User: `"Mavee"`, Phone: `"+923001234567"`, Email: `"mavee@tazkiyah.app"`, Role: `"ADMIN"`

2. **Liquid Accounts (R5)**:
   - `"Wallet Cash"` (`AccountType.CASH`): PKR 25,000.00
   - `"Meezan Bank"` (`AccountType.BANK`): PKR 180,000.00
   - `"Sadapay"` (`AccountType.EMI`): PKR 40,000.00
   - `"Nayapay"` (`AccountType.EMI`): PKR 30,000.00
   - $\sum \text{Account.current\_balance} = 25,000 + 180,000 + 40,000 + 30,000 = \mathbf{275,000.00\text{ PKR}}$.

3. **Envelope Groups & Envelopes (R1)**:
   - **Group 1: Daily Living**:
     - `Grocery`: Assigned PKR 60,000.00 | Spent PKR 42,500.00 | Available PKR 17,500.00 | Target PKR 60,000.00
     - `Fuel & Commute`: Assigned PKR 35,000.00 | Spent PKR 28,000.00 | Available PKR 7,000.00 | Target PKR 35,000.00
     - `Utilities & Bills`: Assigned PKR 30,000.00 | Spent PKR 29,500.00 | Available PKR 500.00 | Target PKR 30,000.00
   - **Group 2: Discretionary**:
     - `Dining Out`: Assigned PKR 20,000.00 | Spent PKR 24,800.00 | Available **-PKR 4,800.00** (**OVERSPENT**) | Target PKR 20,000.00
     - `Shopping & Personal`: Assigned PKR 25,000.00 | Spent PKR 18,200.00 | Available PKR 6,800.00 | Target PKR 25,000.00
   - **Group 3: Savings & Sinking Funds**:
     - `Umrah 2027`: Assigned PKR 40,000.00 | Spent PKR 0.00 | Available PKR 40,000.00 | Target PKR 800,000.00
     - `Emergency Cushion`: Assigned PKR 50,000.00 | Spent PKR 0.00 | Available PKR 50,000.00 | Target PKR 500,000.00
     - `Vehicle Maintenance`: Assigned PKR 15,000.00 | Spent PKR 7,000.00 | Available PKR 8,000.00 | Target PKR 100,000.00
   - $\sum \text{Envelope.assigned\_amount} = 60,000 + 35,000 + 30,000 + 20,000 + 25,000 + 40,000 + 50,000 + 15,000 = \mathbf{275,000.00\text{ PKR}}$.
   - $\text{Unassigned Cash} = 275,000.00 - 275,000.00 = \mathbf{0.00\text{ PKR}}$ (**Exact Zero-Based Budgeting Match**).
   - $\sum \text{Envelope.spent\_amount} = 42,500 + 28,000 + 29,500 + 24,800 + 18,200 + 7,000 = \mathbf{150,000.00\text{ PKR}}$.
   - `overspent_envelopes_count` = 1 (`Dining Out`, available = -4,800.00 PKR).

4. **Canonical Staples & CPI Trends (R3)**:
   - 10 items (`Potato`, `Milk`, `Eggs`, `Petrol`, `Flour`, `Cooking Oil`, `Onion`, `Tomato`, `Sugar`, `Rice`) each with 4 chronological price points spanning May, June, July, and August 2026 across major Pakistani merchants (`Imtiaz`, `Al-Fatah`, `Aghas`, `Metro`, `Shell`, `Total Parco`, `PSO`).
   - Month-over-month inflation rates calculated accurately via $\frac{P_{\text{Aug}} - P_{\text{Jul}}}{P_{\text{Jul}}} \times 100$:
     - Potato: PKR 110 $\to$ 120 (+9.09%)
     - Milk: PKR 230 $\to$ 240 (+4.35%)
     - Eggs: PKR 320 $\to$ 340 (+6.25%)
     - Petrol: PKR 278 $\to$ 285 (+2.52%)
     - Flour: PKR 1,350 $\to$ 1,420 (+5.19%)
     - Cooking Oil: PKR 520 $\to$ 550 (+5.77%)
     - Onion: PKR 175 $\to$ 190 (+8.57%)
     - Tomato: PKR 140 $\to$ 160 (+14.29%)
     - Sugar: PKR 150 $\to$ 155 (+3.33%)
     - Rice: PKR 360 $\to$ 380 (+5.56%)

5. **Granular Transactions & Line Items (R2)**:
   - 18 transactions across accounts, envelopes, and merchants totaling PKR 150,000.00.
   - 50+ line items with exact mathematical line-item reconciliation ($\sum \text{LineItem.total\_price} = \text{Transaction.total\_amount}$).
   - Per-envelope transaction totals match envelope spent amounts exactly:
     - Grocery: $14,850 + 11,200 + 9,450 + 7,000 = 42,500\text{ PKR}$
     - Fuel & Commute: $11,400 + 8,550 + 8,050 = 28,000\text{ PKR}$
     - Utilities & Bills: $21,500 + 5,200 + 2,800 = 29,500\text{ PKR}$
     - Dining Out: $10,800 + 8,400 + 5,600 = 24,800\text{ PKR}$
     - Shopping & Personal: $9,500 + 5,400 + 3,300 = 18,200\text{ PKR}$
     - Vehicle Maintenance: $5,200 + 1,800 = 7,000\text{ PKR}$

6. **Financial Goals & Sinking Funds (R4)**:
   - `"Umrah 2027"`: `TARGET_BY_DATE`, Target PKR 800,000.00, Target Date 2027-06-01, Current PKR 160,000.00, Pacing PKR 64,000.00/mo.
   - `"Emergency Cushion"`: `TARGET_CAP`, Target PKR 500,000.00, Current PKR 220,000.00.
   - `"Vehicle Maintenance"`: `SINKING_FUND`, Target PKR 100,000.00, Target Date 2026-12-31, Current PKR 45,000.00.

---

## 2. Logic Chain

1. **Zero-Based Budget Invariant Integrity**:
   - Total liquid inflow is calculated dynamically from active accounts ($\sum \text{Account.current\_balance} = 275,000.00$).
   - Total assigned is calculated from all envelopes ($\sum \text{Envelope.assigned\_amount} = 275,000.00$).
   - The subtraction $275,000.00 - 275,000.00 = 0.00$ leaves zero unassigned cash, fulfilling the fundamental zero-based budget contract.
   
2. **Budget Alert Realism**:
   - Envelope `"Dining Out"` assigned PKR 20,000.00 has actual expenditures of PKR 24,800.00.
   - Available balance evaluates to $-4,800.00\text{ PKR}$.
   - `ZBBService.get_overspent_envelopes()` accurately isolates this single envelope, enabling immediate overspent badges and fund rebalancing workflows in the UI.

3. **Idempotency & Re-run Robustness**:
   - In `apps/api/scripts/seed_demo_data.py`, lines 56–73 perform pre-execution lookup and deletion of existing demo households and orphan users.
   - Cascading foreign key configurations (`cascade="all, delete-orphan"`, `ondelete="CASCADE"`) guarantee that re-running the seed script does not cause unique constraint violations on `users.phone_number`, `users.email`, or `canonical_items.uq_household_canonical_item_name`.

4. **Line-Item Mathematical Consistency**:
   - Every single line item in all 18 transactions defines unit price, quantity, and total price where $\text{unit\_price} \times \text{quantity} = \text{total\_price}$.
   - Summing line item total prices for each transaction matches `transaction.total_amount` with zero rounding error.
   - Summing transaction total amounts per category matches `envelope.spent_amount` with zero discrepancy.

---

## 3. Adversarial Stress-Testing & Challenges

### Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| **Idempotent Re-runs** | Clean deletion of pre-existing records and re-population without unique key collision | Deletes household and user by phone if present; re-creates cleanly | **PASS** |
| **ZBB Invariant ($Total Inflow - Total Assigned = 0$)** | Unassigned cash == Decimal("0.00") | Evaluates to Decimal("0.00") | **PASS** |
| **Overspent Envelope Flagging** | Exactly 1 envelope detected with negative balance | `Dining Out` detected with -PKR 4,800.00 | **PASS** |
| **CPI MoM Calculation** | Latest (August) vs previous (July) price percentage change | Correctly computes positive MoM inflation across all 10 staples | **PASS** |
| **Line-Item Price Sum vs Transaction Total** | $\sum \text{LineItem.total} = \text{Transaction.total}$ for all 18 transactions | Exact match across all 18 transactions | **PASS** |
| **Envelope Spent vs Transaction Sum** | $\sum \text{Transaction.total} = \text{Envelope.spent}$ for all categories | Exact match across all 6 active spending categories | **PASS** |
| **Goal Monthly Pacing** | Dynamic monthly contribution for `TARGET_BY_DATE` | Calculates dynamic monthly pacing ($\text{remaining} / \text{months}$) | **PASS** |

---

## 4. Caveats

- **No Caveats**: The dataset and verification scripts fully satisfy all requirements R1–R6 and interface contracts defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

---

## 5. Conclusion

**Verdict: APPROVE**

Milestone M1 (Backend Demo Seed Script & Data Verification) satisfies all requirements with 100% mathematical consistency, full idempotency, realistic Pakistani domain data, and comprehensive test coverage.

---

## 6. Verification Method

To independently verify the implementation:

1. **Inspect Seeder Implementation**:
   `view_file` on `/home/mavee/tazkiyah/apps/api/scripts/seed_demo_data.py`
2. **Inspect Verification Runner**:
   `view_file` on `/home/mavee/tazkiyah/apps/api/scripts/verify_demo_data.py`
3. **Inspect Pytest Test Suite**:
   `view_file` on `/home/mavee/tazkiyah/apps/api/tests/test_seed.py`
4. **CLI Execution**:
   ```bash
   cd /home/mavee/tazkiyah/apps/api && python scripts/seed_demo_data.py
   python scripts/verify_demo_data.py
   pytest tests/test_seed.py
   ```
