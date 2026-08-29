## 2026-08-22T15:21:15Z
<USER_REQUEST>
You are a teamwork_preview_worker for Milestone M1 (Backend Demo Seed Script & Data Verification).
Your working directory is: /home/mavee/tazkiyah/.agents/worker_m1_1
The project root is: /home/mavee/tazkiyah
The original user request is at: /home/mavee/tazkiyah/ORIGINAL_REQUEST.md
The project scope document is at: /home/mavee/tazkiyah/PROJECT.md
Backend survey report: /home/mavee/tazkiyah/.agents/spec_miner_backend_survey_1/handoff.md
Parent conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own:
- `apps/api/scripts/seed_demo_data.py`
- Any helper scripts in `apps/api/scripts/` or `scripts/` needed for data seeding and verification.

MISSION:
Implement `apps/api/scripts/seed_demo_data.py` to seed a rich, realistic, Pakistani Rupee (PKR) demo dataset in the database that fulfills all requirements R1–R6:

DATASET REQUIREMENTS:
1. **Household & Users**:
   - Household: "Mavee Household" (Currency: PKR)
   - User: "Mavee", phone: "+923001234567", email: "mavee@tazkiyah.app", role: "ADMIN"
2. **Accounts (R5)**:
   - "Wallet Cash" (CASH, 25,000 PKR)
   - "Meezan Bank" (BANK, 180,000 PKR)
   - "Sadapay" (EMI, 40,000 PKR)
   - "Nayapay" (EMI, 30,000 PKR)
   - Total Liquid Inflow = 275,000 PKR
3. **Envelope Groups & Envelopes (R1)**:
   - Group "Daily Living" (sort_order: 1):
     - "Grocery" (Assigned: 60,000, Spent: 42,500)
     - "Fuel & Commute" (Assigned: 35,000, Spent: 28,000)
     - "Utilities & Bills" (Assigned: 30,000, Spent: 29,500)
   - Group "Discretionary" (sort_order: 2):
     - "Dining Out" (Assigned: 20,000, Spent: 24,800 -> OVERSPENT by 4,800 PKR to demonstrate overspent alerts)
     - "Shopping & Personal" (Assigned: 25,000, Spent: 18,200)
   - Group "Savings & Sinking Funds" (sort_order: 3):
     - "Umrah 2027" (Assigned: 40,000, Spent: 0)
     - "Emergency Cushion" (Assigned: 50,000, Spent: 0)
     - "Vehicle Maintenance" (Assigned: 15,000, Spent: 7,000)
   - Total Assigned = 275,000 PKR -> Unassigned Cash = 0.00 PKR (Zero-Based Budget achieved!)
4. **Canonical Items & CPI Price Points (R3)**:
   - Items: `Potato` (Fresh Produce, kg), `Milk` (Dairy, liter), `Eggs` (Poultry & Dairy, dozen), `Petrol` (Fuel, liter), `Flour` (Grains & Staples, 10kg), `Cooking Oil` (Cooking Essentials, liter), `Onion` (Fresh Produce, kg), `Tomato` (Fresh Produce, kg), `Sugar` (Grains & Staples, kg), `Rice` (Grains & Staples, kg).
   - For each item, seed 4+ historical price points across May, June, July, August 2026 showing realistic price inflation (e.g. Petrol rising from 265 to 285 PKR/liter; Potato from 80 to 120 PKR/kg; Milk from 210 to 240 PKR/liter; Eggs from 280 to 340 PKR/dozen).
5. **Transactions & Granular Line Items (R2)**:
   - Seed 15+ multi-item transactions across accounts, envelopes, and diverse merchants (Imtiaz Super Market, Shell Fuel Station, Al-Fatah, Kolachi, Monal Islamabad, Total Parco, Aghas Supermarket, etc.).
   - Each transaction must have 2-5 line items with realistic quantities, units, unit prices, total prices, raw item names (including Roman Urdu like "Aaloo", "Doodh", "Anday"), and notes.
6. **Goals (R4)**:
   - "Umrah 2027" (TARGET_BY_DATE, target_amount: 800,000 PKR, target_date: 2027-06-01, current_balance: 160,000 PKR)
   - "Emergency Cushion" (TARGET_CAP, target_amount: 500,000 PKR, current_balance: 220,000 PKR)
   - "Vehicle Maintenance" (Sinking Fund, target_amount: 100,000 PKR, target_date: 2026-12-31, current_balance: 45,000 PKR)

VERIFICATION STEPS:
- Run `python apps/api/scripts/seed_demo_data.py` (or using appropriate python environment) to verify the script executes smoothly and seeds the database without error.
- Verify through queries or API calls that all seeded data is accessible.

DELIVERABLE:
Write a complete report to `/home/mavee/tazkiyah/.agents/worker_m1_1/handoff.md` with:
- Implementation details of `seed_demo_data.py`
- Execution logs and verification output
- Seeded household ID, accounts summary, envelope summary, CPI items summary, transactions count, and goals summary.

Send a message when your handoff is written.
</USER_REQUEST>
