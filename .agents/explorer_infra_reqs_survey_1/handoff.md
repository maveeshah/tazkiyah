# Infrastructure & Requirements Survey Handoff Report

**Agent:** `teamwork_preview_explorer`  
**Working Directory:** `/home/mavee/tazkiyah/.agents/explorer_infra_reqs_survey_1`  
**Timestamp:** 2026-08-22T15:20:00Z  
**Parent Task ID:** `39560258-203d-400a-9860-b8fa3cd3d4a7`  
**Project Root:** `/home/mavee/tazkiyah`  

---

## 1. Observation

### 1.1 Monorepo Workspace Configuration & Toolchain
- **Package Manager & Workspace**: `pnpm@9.15.0` (as defined in root `package.json:16`). `pnpm-workspace.yaml` configures packages under `"apps/*"` and `"packages/*"`.
- **Build Orchestration**: `turbo@^2.4.0` with `turbo.json` defining tasks `build`, `lint`, `type-check`, `dev`, `test`.
  - `pnpm run type-check` runs `turbo run type-check` targeting `@tazkiyah/shared` and `@tazkiyah/web` (`tsc --noEmit`), exiting with code `0`.
  - `pnpm run build` runs `turbo run build` which invokes `@tazkiyah/web:build` (`tsc && vite build`), generating `dist/index.html` and bundled assets in `dist/assets/`, exiting with code `0`.
- **Packages Layout**:
  - `packages/shared`: `@tazkiyah/shared` defining domain models and TypeScript interfaces in `src/types.ts` (`Account`, `AccountType`, `EnvelopeGroup`, `Envelope`, `LineItem`, `Transaction`, `Goal`, `GoalType`, `CanonicalItem`, `PricePoint`, `ZBBSummary`).
  - `apps/web`: React 19 (`react@^19.0.0`, `react-dom@^19.0.0`), Vite 6 (`vite@^6.0.0`, `@vitejs/plugin-react@^4.3.4`), Tailwind CSS (`tailwindcss@^3.4.17`, `autoprefixer@^10.4.20`, `postcss@^8.4.49`), and icons (`lucide-react@^1.16.0`). Dev server runs on port `5173` with `host: true`.
  - `apps/api`: Python 3.11+ FastAPI application (`fastapi>=0.115.0`, `uvicorn[standard]>=0.32.0`, `pydantic>=2.10.0`, `sqlalchemy>=2.0.36`, `asyncpg>=0.30.0`, `alembic>=1.14.0`, `redis>=5.2.0`).
  - `apps/mobile`: Directory placeholder for future React Native/Expo integration.

### 1.2 Backend Architecture & Endpoints
- **Service Configuration**: `apps/api/app/core/config.py` specifies defaults:
  - Postgres: `localhost:5435`, database `tazkiyah_db`, user `postgres`, password `password`. Async URL: `postgresql+asyncpg://postgres:password@localhost:5435/tazkiyah_db`.
  - Redis: `localhost:6381`.
  - API Root: `/api/v1` with open CORS (`allow_origins=["*"]` in `app/main.py:14-20`).
- **Database Schema & Migrations**: Alembic migration `56922aff249f_initial_zbb_schema.py` establishes tables:
  - `households` (UUID pk, name, base_currency)
  - `users` (household_id FK, phone_number, full_name, email, role)
  - `accounts` (household_id FK, name, type `CASH|BANK|EMI|CREDIT`, current_balance, is_active)
  - `envelope_groups` (household_id FK, name, sort_order)
  - `envelopes` (group_id FK, name, assigned_amount, spent_amount, target_amount)
  - `canonical_items` (household_id FK, name, category, standard_unit, unique per household)
  - `price_history` (canonical_item_id FK, unit_price, unit, merchant, recorded_at)
  - `goals` (household_id FK, optional envelope_id FK, name, goal_type `TARGET_BY_DATE|TARGET_CAP|SINKING_FUND`, target_amount, target_date, current_balance)
  - `transactions` (household_id FK, account_id FK, envelope_id FK, total_amount, merchant, source `WHATSAPP|WEB|MOBILE`, raw_input, transacted_at)
  - `line_items` (transaction_id FK, canonical_item_id FK nullable, raw_item_name, quantity, unit, unit_price, total_price, notes)
- **API Endpoint Registry (`apps/api/app/api/v1/router.py`)**:
  - `GET /api/v1/health` -> Health status (`healthy`).
  - `POST /api/v1/households`, `GET /api/v1/households/{household_id}`, `POST /api/v1/households/{household_id}/users`.
  - `POST /api/v1/accounts`, `GET /api/v1/accounts/household/{household_id}`, `GET /api/v1/accounts/{account_id}`.
  - `POST /api/v1/envelopes/groups`, `GET /api/v1/envelopes/groups/household/{household_id}`.
  - `POST /api/v1/envelopes`, `GET /api/v1/envelopes/summary/{household_id}`.
  - `POST /api/v1/envelopes/assign`, `POST /api/v1/envelopes/rebalance`, `GET /api/v1/envelopes/overspent/{household_id}`.
  - `POST /api/v1/transactions`, `GET /api/v1/transactions/household/{household_id}?limit=50`.
  - `GET /api/v1/cpi/trends/{household_id}`.
  - `POST /api/v1/goals`, `GET /api/v1/goals/household/{household_id}`.
  - `GET /api/v1/webhook/whatsapp`, `POST /api/v1/webhook/whatsapp`, `POST /api/v1/webhook/simulate`.

### 1.3 Frontend State (`apps/web`)
- Currently `apps/web/src/App.tsx` contains static placeholder cards.
- Directory structure exists (`src/components/ui/`, `src/features/budget/`, `src/features/cpi/`, `src/features/goals/`, `src/features/ledger/`).
- Package dependencies already include `lucide-react`, `react`, `react-dom`, `@tazkiyah/shared`.

---

## 2. Logic Chain

1. **Monorepo Readiness**: The build system is fully linked. `turbo` orchestrates `pnpm run build` and `pnpm run type-check`. Shared types in `packages/shared` compile cleanly and can be consumed by `apps/web`.
2. **Backend API Completeness**: All required backend endpoints, validation schemas, business logic (ZBB calculation, account debiting, receipt line-item canonicalization, MoM inflation calculation, monthly pacing) are fully implemented in FastAPI and backed by SQLAlchemy models and Alembic migrations.
3. **Frontend Implementation Scope**: The web dashboard needs full UI implementations across all 5 core feature modules (Zero-Based Budgeting, Transaction Ledger with receipt breakdown, CPI inflation charts, Financial Goals runway tracker, and Accounts & Wallets summary), connecting via standard `fetch`/`ky`/`axios` or custom API client to `http://localhost:8000/api/v1`.
4. **Seed Script Scope**: While test fixtures exist in `apps/api/tests/conftest.py`, a dedicated standalone script `apps/api/scripts/seed_demo_data.py` must be written to populate rich multi-month transactions, multi-account structures, envelope groups, goals, and CPI price points for immediate visual and end-to-end verification.
5. **Automated Verification**: End-to-end integration verification can be performed by running a dedicated integration test suite or verification script that boots or connects to the API, validates all endpoints against real payloads, and asserts that frontend data contracts match backend responses.

---

## 3. Exhaustive Feature Inventory & Requirements Matrix (R1 - R6)

| Req ID | Feature Name | Description & Sub-components | Backend Dependencies (APIs / Models) | Frontend Components (`apps/web`) | Acceptance Criteria & Verification Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R1.1** | **ZBB Invariant Header & Summary** | Live indicator of `Unassigned Cash = Total Inflow - Total Assigned`. Displays Total Inflow, Total Assigned, Total Spent, and Overspent Count. | `GET /api/v1/envelopes/summary/{household_id}` (`ZBBSummaryResponse`) | `ZBBSummaryBanner`, `UnassignedIndicator` | Displays exact unassigned balance in PKR (`PKR 0.00` target). Updates in real-time when assignments change. |
| **R1.2** | **Envelope Allocation Table** | Hierarchical group view (`Daily Living`, `Discretionary`, `Sinking Funds`) listing envelopes with Assigned, Spent, and Available amounts. | `GET /api/v1/envelopes/groups/household/{household_id}` (`EnvelopeGroupResponse`) | `EnvelopeTable`, `EnvelopeGroupCard`, `EnvelopeRow` | Renders all groups and envelopes. Calculates available balance (`assigned - spent`). Visual badge for overspent envelopes (`spent > assigned`). |
| **R1.3** | **Assign Income Modal** | Modal to set/update assigned amount for an envelope with validation against available unassigned cash. | `POST /api/v1/envelopes/assign?household_id={id}` (`EnvelopeAssign`) | `AssignIncomeModal` | Submits new assigned amount. Prevents assigning more than available unassigned cash. Recalculates ZBB summary immediately. |
| **R1.4** | **Envelope Rebalance Modal** | Modal to transfer allocated money from one envelope to another. | `POST /api/v1/envelopes/rebalance?household_id={id}` (`EnvelopeRebalance`) | `RebalanceModal` | Select source and target envelopes, enter amount. Validates source envelope has sufficient assigned funds. Updates both envelope balances. |
| **R1.5** | **Envelope / Group Management** | Ability to add new envelope groups and new envelopes with optional target monthly amounts. | `POST /api/v1/envelopes/groups`, `POST /api/v1/envelopes` | `CreateEnvelopeModal`, `CreateGroupModal` | Creates new group/envelope, refreshes envelope table. |
| **R2.1** | **Granular Transaction Ledger** | Master transaction list showing date, merchant, source tag (`WHATSAPP`, `WEB`, `MOBILE`), account, envelope, total PKR amount. | `GET /api/v1/transactions/household/{household_id}?limit=50` (`TransactionResponse`) | `TransactionLedger`, `TransactionRow`, `SourceBadge` | Lists all transactions sorted by `transacted_at` desc. Displays source badge and associated accounts/envelopes. |
| **R2.2** | **Expandable Receipt & Line-Item Explorer** | Row expansion revealing granular item breakdown (`raw_item_name`, `canonical_name`, `quantity`, `unit`, `unit_price`, `total_price`, notes) and raw input text. | `LineItemResponse` nested in `TransactionResponse` | `ReceiptDetailDrawer`, `LineItemList`, `RawInputPreview` | Clicking row toggles line-item table. Shows itemized pricing (e.g. `1.25 kg Potato @ 100/kg -> 125 PKR`). |
| **R2.3** | **Ledger Filtering & Search** | Real-time search by merchant/item name and filtering by Account, Envelope category, and Source. | Client-side & query filtering | `LedgerFilterBar`, `SearchInput` | Typing or selecting dropdowns immediately filters the visible transaction list without page reload. |
| **R2.4** | **Manual Transaction Logger** | Modal form to log a transaction with multiple dynamic line items directly from the web interface. | `POST /api/v1/transactions` (`TransactionCreate`) | `ManualTransactionModal`, `LineItemInputRow` | Allows dynamic line-item addition. Debits selected account and increments envelope spent amount upon submission. |
| **R3.1** | **Staple Price Cards & MoM Inflation** | Cards for core staples (`Potato`, `Milk`, `Eggs`, `Petrol`, etc.) showing current unit price, previous price, and calculated MoM inflation %. | `GET /api/v1/cpi/trends/{household_id}` (`CPITrendItem`) | `CPIStapleCard`, `InflationBadge` | Displays unit price (e.g. `PKR 120/kg`) and inflation badge (green for drop, red for increase). |
| **R3.2** | **Interactive Historical Price Charts** | Visual time-series graph displaying price evolution across recorded dates for selected staple items. | `PricePointResponse` history list from `CPITrendItem` | `CPIPriceChart`, `ItemSelectorTabs` | Renders trend line of price points over time. Supports switching between tracked items. |
| **R3.3** | **Merchant Comparison Table** | Comparison view showing prices paid across different vendors (`Imtiaz`, `Local Vendor`, `Shell`, `Total Parco`). | `history` array in `CPITrendItem` | `MerchantPriceComparisonTable` | Lists vendor, unit price, date recorded, and unit for transparent grocery/fuel price tracking. |
| **R4.1** | **Goal Progress & Sinking Fund Cards** | Cards for target-date goals (e.g. `Umrah 2027`), sinking funds, and emergency cushions with visual progress bar (`current_balance / target_amount`). | `GET /api/v1/goals/household/{household_id}` (`GoalResponse`) | `GoalCard`, `GoalProgressBar`, `GoalTypeBadge` | Renders percentage completed, current balance vs target amount in PKR. |
| **R4.2** | **Dynamic Monthly Pacing Calculator** | Real-time calculation of required monthly savings contribution based on remaining balance and months until target date. | Server-calculated `monthly_pacing` field in `GoalResponse` | `MonthlyPacingBadge`, `TargetDateCountdown` | Shows `PKR X / month needed` dynamically calculated server-side until `target_date`. |
| **R4.3** | **Emergency Runway Calculator** | Calculates household runway in months based on total liquid balances vs monthly budgeted burn rate. | Derived from `accounts.current_balance` & `envelopes.assigned_amount` | `EmergencyRunwayCard`, `RunwayMeter` | Displays total liquid cushion in months (e.g. `4.2 months runway`). |
| **R4.4** | **Goal Creation Modal** | Form to create a new financial goal with name, type (`TARGET_BY_DATE`, `TARGET_CAP`, `SINKING_FUND`), target amount, target date, and initial balance. | `POST /api/v1/goals` (`GoalCreate`) | `CreateGoalModal` | Creates new goal, computes monthly pacing, updates goals grid. |
| **R5.1** | **Liquid Accounts & Wallets Grid** | Overview cards for `Wallet Cash`, `Meezan Bank`, `Sadapay`, `Nayapay`, displaying current balance, account type, and overdrawn status. | `GET /api/v1/accounts/household/{household_id}` (`AccountResponse`) | `AccountCard`, `AccountTypeIcon`, `NetWorthBanner` | Displays accounts with distinct type icons (`CASH`, `BANK`, `EMI`, `CREDIT`), formatted PKR balances, and overdrawn warning. |
| **R5.2** | **Add / Manage Account Modal** | Modal to create a new liquid account with name, type, and opening balance. | `POST /api/v1/accounts` (`AccountCreate`) | `CreateAccountModal` | Submits new account, updates total liquid inflow and unassigned cash pool. |
| **R6.1** | **Comprehensive Demo Seed Script** | Executable script (`apps/api/scripts/seed_demo_data.py`) populating sample household, users, accounts, envelope groups, multi-month transactions, and CPI price points. | SQLAlchemy models / async session in `apps/api` | `apps/api/scripts/seed_demo_data.py` | Running script seeds complete demo data for immediate visual and API demonstration. |
| **R6.2** | **Automated Integration & Contract Verification** | Automated script/test verifying end-to-end API communication from frontend perspectives, ZBB invariants, and type compatibility. | FastAPI TestClient / httpx / TypeScript verification | `apps/api/tests/` & `scripts/verify_monorepo.ts` | Validates API status, data serialization, typecheck (`0 errors`), and build (`pnpm run build`). |

---

## 4. System Dependency Graph

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database (5435)                      │
│                                                                        │
│  [Households] ──┬──► [Users]                                           │
│                 ├──► [Accounts] ──────┐                                │
│                 ├──► [EnvelopeGroups] ├──► [Transactions]              │
│                 │          │          │          │                     │
│                 │          ▼          │          ▼                     │
│                 │     [Envelopes] ────┴────► [LineItems]               │
│                 │          │                     │                     │
│                 │          ▼                     ▼                     │
│                 ├──► [Goals] (linked)      [CanonicalItems]            │
│                 │                                │                     │
│                 └────────────────────────────────┴──► [PriceHistory]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend (/api/v1)                       │
│                                                                        │
│  • ZBBService (Summary, Assign, Rebalance, Overspent Check)            │
│  • LedgerService (Transaction creation, Account & Envelope debits)     │
│  • CPIService (Item canonicalization, Synonym match, MoM Inflation)    │
│  • WhatsAppIntakeService & ParserService (Text parsing & simulation)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Shared Domain Layer (@tazkiyah/shared)               │
│                                                                        │
│  TypeScript Types: Account, Envelope, LineItem, Transaction, Goal,     │
│                    CanonicalItem, PricePoint, ZBBSummary               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      React 19 + Vite Frontend (apps/web)               │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ R1. ZBB Allocation      │  │ R2. Granular Ledger & Receipts      │  │
│  │ • Unassigned Cash Banner│  │ • Searchable Transaction Table      │  │
│  │ • Envelope Group Table  │  │ • Expandable Line-Item Receipt view │  │
│  │ • Assign & Move Modals  │  │ • Manual Transaction Modal          │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ R3. Personal CPI Trends │  │ R4. Goals & Emergency Runway        │  │
│  │ • Staple Cards & MoM %  │  │ • Goal Progress Cards & Pacing      │  │
│  │ • Price History Charts  │  │ • Emergency Cushion Calculator      │  │
│  │ • Vendor Comparisons    │  │ • Goal Creation Modal               │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ R5. Accounts & Wallets  │  │ R6. Seed Data & Verification        │  │
│  │ • Liquid Balance Cards  │  │ • seed_demo_data.py                 │  │
│  │ • Add Account Modal     │  │ • Automated API Verification Script │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Strategy & Build Pipeline

1. **Static Analysis & Type Checking**:
   - Command: `pnpm run type-check` (runs `turbo run type-check`).
   - Criteria: `0` type errors across `@tazkiyah/shared` and `@tazkiyah/web`.
2. **Production Bundle Build**:
   - Command: `pnpm run build` (runs `turbo run build`).
   - Criteria: Vite produces production assets in `apps/web/dist` with 0 build errors.
3. **Backend Test Suite**:
   - Command: `pytest` in `apps/api/tests/`.
   - Criteria: All unit and integration test modules (`test_api.py`, `test_zbb.py`, `test_ledger.py`, `test_cpi.py`, `test_parser.py`, `test_webhook.py`, `test_whatsapp_intake.py`) pass.
4. **Seed Demonstration Execution**:
   - Command: `python apps/api/scripts/seed_demo_data.py`.
   - Criteria: Populates sample household with realistic Pakistani Rupee (PKR) accounts, envelopes, transactions, and CPI trends without throwing exceptions.
5. **End-to-End API Communication**:
   - Criteria: React dashboard at `http://localhost:5173` successfully fetches and mutates data from `http://localhost:8000/api/v1` with live reactive updates across accounts, envelopes, unassigned cash, and CPI charts.

---

## 6. Caveats
- No caveats. Codebase exploration is complete and all requirement dependencies are fully mapped.

---

## 7. Conclusion
The monorepo infrastructure is clean, well-configured, and fully prepared for feature development. The backend FastAPI layer has robust domain services and schemas for ZBB, ledger transactions, CPI tracking, and goals. The primary tasks ahead are:
1. Writing the demo seed script (`apps/api/scripts/seed_demo_data.py`).
2. Implementing the React 19 web frontend feature views, interactive modals, and data hooks under `apps/web/src/features/`.
3. Validating the full integration through automated typechecking, build verification, and API testing.
