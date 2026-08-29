# Milestone M1 Handoff Report: Backend Demo Seed Script & Data Verification

## 1. Observation

Direct examination and implementation across `apps/api` for Milestone M1 yielded the following deliverables and verified metrics:

### 1.1 Created Files & Artifacts
1. **`apps/api/scripts/seed_demo_data.py`**: Complete, standalone, and reusable asynchronous seed script populating all entities (`Household`, `User`, `Account`, `EnvelopeGroup`, `Envelope`, `CanonicalItem`, `PriceHistory`, `Transaction`, `LineItem`, `Goal`).
2. **`apps/api/scripts/verify_demo_data.py`**: Standalone verification script querying the database, asserting invariants, and printing a comprehensive diagnostic audit.
3. **`scripts/seed_demo_data.py`**: Project root wrapper executing the seeder seamlessly from the repository root.
4. **`apps/api/tests/test_seed.py`**: Comprehensive pytest test suite validating the entire seeding lifecycle, Zero-Based Budgeting invariants, multi-point CPI trends, transaction line-item consistency, and idempotent re-runs.

### 1.2 Seeded Dataset Inventory

- **Household & Admin User**:
  - Household Name: `"Mavee Household"`
  - Base Currency: `"PKR"`
  - User: `"Mavee"` | Phone: `"+923001234567"` | Email: `"mavee@tazkiyah.app"` | Role: `"ADMIN"`

- **Accounts (R5)**:
  - `"Wallet Cash"` (`AccountType.CASH`): PKR 25,000.00
  - `"Meezan Bank"` (`AccountType.BANK`): PKR 180,000.00
  - `"Sadapay"` (`AccountType.EMI`): PKR 40,000.00
  - `"Nayapay"` (`AccountType.EMI`): PKR 30,000.00
  - **Total Liquid Inflow**: **PKR 275,000.00**

- **Envelope Groups & Envelopes (R1)**:
  - **Group 1: Daily Living** (`sort_order: 1`):
    - `"Grocery"`: Assigned: PKR 60,000.00 | Spent: PKR 42,500.00 | Available: PKR 17,500.00 | Target: PKR 60,000.00
    - `"Fuel & Commute"`: Assigned: PKR 35,000.00 | Spent: PKR 28,000.00 | Available: PKR 7,000.00 | Target: PKR 35,000.00
    - `"Utilities & Bills"`: Assigned: PKR 30,000.00 | Spent: PKR 29,500.00 | Available: PKR 500.00 | Target: PKR 30,000.00
  - **Group 2: Discretionary** (`sort_order: 2`):
    - `"Dining Out"`: Assigned: PKR 20,000.00 | Spent: PKR 24,800.00 | Available: **-PKR 4,800.00** (**OVERSPENT alert**) | Target: PKR 20,000.00
    - `"Shopping & Personal"`: Assigned: PKR 25,000.00 | Spent: PKR 18,200.00 | Available: PKR 6,800.00 | Target: PKR 25,000.00
  - **Group 3: Savings & Sinking Funds** (`sort_order: 3`):
    - `"Umrah 2027"`: Assigned: PKR 40,000.00 | Spent: PKR 0.00 | Available: PKR 40,000.00 | Target: PKR 800,000.00
    - `"Emergency Cushion"`: Assigned: PKR 50,000.00 | Spent: PKR 0.00 | Available: PKR 50,000.00 | Target: PKR 500,000.00
    - `"Vehicle Maintenance"`: Assigned: PKR 15,000.00 | Spent: PKR 7,000.00 | Available: PKR 8,000.00 | Target: PKR 100,000.00
  - **ZBB Invariant Metrics**:
    - **Total Assigned**: PKR 275,000.00
    - **Unassigned Cash**: **PKR 0.00** (Exact Zero-Based Budgeting match!)
    - **Total Spent**: PKR 150,000.00
    - **Overspent Envelopes Count**: 1 (`"Dining Out"`)

- **Canonical Items & CPI Price Points (R3)**:
  - 10 Canonical Items with 4 historical price points each (40 total records) across May, June, July, August 2026 showing authentic Pakistani food and fuel inflation:
    1. `Potato` (`Fresh Produce`, kg): PKR 80.00 -> 95.00 -> 110.00 -> 120.00 (+9.09% MoM)
    2. `Milk` (`Dairy`, liter): PKR 210.00 -> 220.00 -> 230.00 -> 240.00 (+4.35% MoM)
    3. `Eggs` (`Poultry & Dairy`, dozen): PKR 280.00 -> 300.00 -> 320.00 -> 340.00 (+6.25% MoM)
    4. `Petrol` (`Fuel`, liter): PKR 265.00 -> 272.00 -> 278.00 -> 285.00 (+2.52% MoM)
    5. `Flour` (`Grains & Staples`, 10kg): PKR 1,200.00 -> 1,280.00 -> 1,350.00 -> 1,420.00 (+5.19% MoM)
    6. `Cooking Oil` (`Cooking Essentials`, liter): PKR 480.00 -> 500.00 -> 520.00 -> 550.00 (+5.77% MoM)
    7. `Onion` (`Fresh Produce`, kg): PKR 120.00 -> 150.00 -> 175.00 -> 190.00 (+8.57% MoM)
    8. `Tomato` (`Fresh Produce`, kg): PKR 90.00 -> 120.00 -> 140.00 -> 160.00 (+14.29% MoM)
    9. `Sugar` (`Grains & Staples`, kg): PKR 140.00 -> 145.00 -> 150.00 -> 155.00 (+3.33% MoM)
    10. `Rice` (`Grains & Staples`, kg): PKR 320.00 -> 340.00 -> 360.00 -> 380.00 (+5.56% MoM)

- **Transactions & Granular Line Items (R2)**:
  - 18 multi-item transactions across accounts, envelopes, and merchants (`Imtiaz Super Market`, `Al-Fatah Gourmet`, `Aghas Supermarket`, `Metro Cash & Carry`, `Shell Fuel Station`, `Total Parco`, `PSO Clifton`, `K-Electric / IESCO`, `PTCL Flash Fiber`, `SNGPL Sui Gas`, `Kolachi Restaurant`, `Monal Islamabad`, `Espresso Coffee`, `Khaadi Prêt`, `Servis Shoes`, `Saeed Ghani`, `Toyota Capital Motors`, `Speedy Wheel Alignment`).
  - 50+ line items with authentic Roman Urdu item names (`Aaloo`, `Doodh`, `Farm Fresh Anday`, `Chakki Atta`, `Dalda Cooking Oil`, `Basmati Super Karnal Rice`, `Pyaz`, `Tamatar`, `Cheeni`, `Shan Biryani Masala`, etc.), explicit quantities, units, unit prices, notes, and exact mathematical sum matching transaction totals.

- **Goals & Sinking Funds (R4)**:
  - `"Umrah 2027"`: `TARGET_BY_DATE` | Target: PKR 800,000.00 | Target Date: 2027-06-01 | Current Balance: PKR 160,000.00 | Pacing: PKR 64,000.00/mo (linked to envelope)
  - `"Emergency Cushion"`: `TARGET_CAP` | Target: PKR 500,000.00 | Target Date: None | Current Balance: PKR 220,000.00 (linked to envelope)
  - `"Vehicle Maintenance"`: `SINKING_FUND` | Target: PKR 100,000.00 | Target Date: 2026-12-31 | Current Balance: PKR 45,000.00 (linked to envelope)

---

## 2. Logic Chain

1. **Zero-Based Budget Invariant Realization**:
   - `Total Inflow` = $\sum \text{Account.current\_balance} = 25,000 + 180,000 + 40,000 + 30,000 = 275,000.00\text{ PKR}$.
   - `Total Assigned` = $\sum \text{Envelope.assigned\_amount} = 60,000 + 35,000 + 30,000 + 20,000 + 25,000 + 40,000 + 50,000 + 15,000 = 275,000.00\text{ PKR}$.
   - `Unassigned Cash` = $275,000.00 - 275,000.00 = 0.00\text{ PKR}$.
   - This directly satisfies the Zero-Based Budgeting invariant: every single rupee is assigned to a purposeful category, leaving 0 unassigned rupees.

2. **Overspent Envelope Demonstration**:
   - Envelope `"Dining Out"` has `assigned_amount` = PKR 20,000.00 and `spent_amount` = PKR 24,800.00.
   - `available_balance` = $20,000.00 - 24,800.00 = -4,800.00\text{ PKR}$.
   - `overspent_envelopes_count` returned by `ZBBService.get_zbb_summary()` evaluates to exactly `1`.
   - This provides the exact test case required for UI overspent warning badges and rebalance fund workflows.

3. **Multi-Month Inflation & Personal CPI Analytics**:
   - For all 10 canonical staples, 4 timestamped price entries span across May 2026, June 2026, July 2026, and August 2026.
   - `CPIService.get_cpi_trends()` accurately extracts the latest price (August 2026) and previous price (July 2026), calculating the percentage inflation rate $\frac{P_{\text{latest}} - P_{\text{prev}}}{P_{\text{prev}}} \times 100$.

4. **Line-Item Granularity & Receipt Integration**:
   - Each transaction's line items contain both raw text (e.g. `"Aaloo (Potatoes)"`, `"Dalda Cooking Oil (5L Can)"`) and canonical references for CPI tracking.
   - Sum of line item `total_price` across every transaction is strictly verified to match `transaction.total_amount`.

5. **Idempotent Execution**:
   - The script cleans up any pre-existing `"Mavee Household"` and user before inserting, allowing developers and automated tests to run `seed_demo_data.py` repeatedly without unique constraint collisions or duplicate entries.

---

## 3. Caveats

- **No Caveats**: All data schemas, relationships, constraints, and mathematical invariants match the specifications in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

---

## 4. Conclusion

Milestone M1 (Backend Demo Seed Script & Data Verification) is fully completed. The implementation provides:
- Robust, idempotent demo seeding in `apps/api/scripts/seed_demo_data.py`.
- Standalone verification utility in `apps/api/scripts/verify_demo_data.py`.
- Root project runner in `scripts/seed_demo_data.py`.
- Automated test coverage in `apps/api/tests/test_seed.py`.

The database is ready to power the React 19 web dashboard (Milestone M2+) with rich, realistic Pakistani financial data.

---

## 5. Verification Method

To verify the seed script and data verification:

1. **Inspect Seeding Script**:
   `view_file` on `/home/mavee/tazkiyah/apps/api/scripts/seed_demo_data.py`
2. **Inspect Verification Script**:
   `view_file` on `/home/mavee/tazkiyah/apps/api/scripts/verify_demo_data.py`
3. **Inspect Test Suite**:
   `view_file` on `/home/mavee/tazkiyah/apps/api/tests/test_seed.py`
4. **Execute CLI Seeding and Verification Commands** (with PostgreSQL active):
   ```bash
   # Option A: Run from apps/api
   cd /home/mavee/tazkiyah/apps/api && python scripts/seed_demo_data.py
   python scripts/verify_demo_data.py

   # Option B: Run from project root
   cd /home/mavee/tazkiyah && python scripts/seed_demo_data.py

   # Option C: Run pytest suite
   cd /home/mavee/tazkiyah/apps/api && pytest tests/test_seed.py
   ```
