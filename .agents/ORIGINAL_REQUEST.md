# Original User Request

## Initial Request — 2026-08-22T15:13:36Z

Build a responsive, modern React 19 + Vite web dashboard for Tazkiyah (Daily Finance & Wealth OS) connected to the existing FastAPI backend and PostgreSQL database, with complete Zero-Based Budgeting, granular line-item receipt explorer, personal CPI inflation graphs, and goal runway tracking.

Working directory: /home/mavee/tazkiyah
Integrity mode: development

## Requirements

### R1. Zero-Based Budget Allocation Table
Interactive envelope budgeting interface in `apps/web` displaying total liquid inflow, assigned amounts, and a live Unassigned Cash indicator (`Unassigned = PKR 0`). Includes intuitive modals to assign monthly income to envelopes and rebalance funds between envelopes with immediate API updates.

### R2. Granular Line-Item Transaction Explorer
Searchable and filterable transaction ledger displaying purchases logged via WhatsApp, Web, or Mobile. Clicking a transaction expands its granular line items (`qty`, `unit`, `unit_price`, `total_price`), with filtering by account, merchant, or envelope category.

### R3. Personal CPI & Staple Inflation Visualizer
Interactive price history graphs tracking unit-price trends over time for household staples (`Potato`, `Milk`, `Eggs`, `Petrol`) with month-over-month percentage inflation calculations and merchant comparisons.

### R4. Financial Goals & Emergency Runway Tracker
Visual progress cards and monthly pacing calculators for target-date goals (e.g., Umrah 2027) and emergency cushions, calculating required monthly contributions dynamically.

### R5. Liquid Accounts & Wallets Summary
Real-time balance cards across active accounts (`Wallet Cash`, `Meezan Bank`, `Sadapay`, `Nayapay`) with quick-action transfer/log entry.

### R6. Verification & Seed Data
Provide a seed data script (`apps/api/scripts/seed_demo_data.py` or similar) to populate sample households, accounts, envelopes, multi-month transactions, and CPI price points for instant visual demonstration.

## Acceptance Criteria

### Functionality & Data Flow
- [ ] Dashboard runs on `http://localhost:5173` and successfully fetches data from FastAPI backend on `http://localhost:8000/api/v1`.
- [ ] Assigning and rebalancing envelopes updates the backend database and recalculates the Unassigned Cash balance in real-time.
- [ ] Transactions display granular line-item breakdowns with expandable receipt details.
- [ ] CPI inflation charts render historical price points from `/api/v1/cpi/trends`.
- [ ] TypeScript type checks (`pnpm run type-check`) and production build (`pnpm run build`) pass cleanly with 0 errors across the monorepo.
- [ ] Automated integration test or verification script demonstrates working API communication from the frontend.
