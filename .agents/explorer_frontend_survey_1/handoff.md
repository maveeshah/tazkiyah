# Frontend Survey & Architecture Handoff Report

**Agent**: `explorer_frontend_survey_1`  
**Date**: 2026-08-22  
**Target Application**: `apps/web` (React 19 + Vite dashboard)  
**Parent Conversation ID**: `39560258-203d-400a-9860-b8fa3cd3d4a7`  

---

## 1. Observation

### 1.1 Tech Stack & Workspace Configuration
- **Monorepo Structure**: Managed via `pnpm` (v9.15.0) workspaces (`pnpm-workspace.yaml` includes `apps/*`, `packages/*`) and Turbo (`turbo.json` v2.4.0).
- **Web App (`apps/web/package.json`)**:
  - `react`: `^19.0.0`
  - `react-dom`: `^19.0.0`
  - `lucide-react`: `^1.16.0`
  - `@tazkiyah/shared`: `workspace:*`
  - `vite`: `^6.0.0` with `@vitejs/plugin-react` (`^4.3.4`)
  - `tailwindcss`: `^3.4.17`
  - `postcss`: `^8.4.49`
  - `autoprefixer`: `^10.4.20`
  - `typescript`: `^5.7.0`
- **Missing Configuration Files**:
  - `apps/web/tailwind.config.js` and `apps/web/postcss.config.js` are currently **missing**. Because `index.css` contains `@tailwind base; @tailwind components; @tailwind utilities;`, PostCSS and Tailwind require standard config files to compile utility classes into the build.
- **Vite Configuration (`apps/web/vite.config.ts`)**:
  - Dev server port is `5173` with `host: true`. Currently lacks an explicit `/api` proxy or `VITE_API_URL` configuration fallback.
- **TypeScript Configuration (`apps/web/tsconfig.json`)**:
  - Target `ES2022`, module `ESNext`, `moduleResolution: "bundler"`, `strict: true`, `jsx: "react-jsx"`.

### 1.2 Existing Frontend Codebase (`apps/web/src`)
- `src/main.tsx`: Entry point mounting `<App />` to `#root`.
- `src/App.tsx`: Minimal placeholder landing page with basic grid cards for ZBB, Granular Line Items, and Goals.
- `src/index.css`: Tailwind directive imports and `:root { color-scheme: dark; }`.
- `src/components/ui/`: Empty directory scaffolded for reusable UI primitives.
- `src/features/budget/`: Empty directory for Zero-Based Budgeting.
- `src/features/ledger/`: Empty directory for Transaction Explorer & Line Items.
- `src/features/cpi/`: Empty directory for Personal CPI & Staple Inflation.
- `src/features/goals/`: Empty directory for Financial Goals & Emergency Runway.

### 1.3 Shared Types vs FastAPI Backend Schemas
Direct observation of `packages/shared/src/types.ts` vs backend schemas in `apps/api/app/schemas/`:

| Shared Interface (`packages/shared/src/types.ts`) | FastAPI Schema (`apps/api/app/schemas/`) | Casing & Field Differences |
| :--- | :--- | :--- |
| `ZBBSummary` (`totalInflow`, `totalAssigned`, `unassignedCash`, `totalSpent`, `envelopesOverspentCount`) | `ZBBSummaryResponse` (`total_inflow`, `total_assigned`, `unassigned_cash`, `total_spent`, `overspent_envelopes_count`) | camelCase in shared types vs **snake_case** in API responses; field name `overspent_envelopes_count` vs `envelopesOverspentCount`. |
| `Account` (`householdId`, `currentBalance`, `isActive`) | `AccountResponse` (`household_id`, `current_balance`, `is_active`, `is_overdrawn`) | `is_overdrawn` (bool) exists in API but is missing in `types.ts`. |
| `Envelope` (`groupId`, `assignedAmount`, `spentAmount`, `availableBalance`) | `EnvelopeResponse` (`group_id`, `assigned_amount`, `spent_amount`, `available_balance`) | camelCase vs **snake_case**. |
| `Transaction` (`accountId`, `envelopeId`, `totalAmount`, `transactedAt`, `lineItems`) | `TransactionResponse` (`account_id`, `envelope_id`, `total_amount`, `transacted_at`, `line_items`) | camelCase vs **snake_case**. |
| `LineItem` (`transactionId`, `canonicalItemId`, `rawItemName`, `unitPrice`, `totalPrice`) | `LineItemResponse` (`transaction_id`, `canonical_item_id`, `raw_item_name`, `unit_price`, `total_price`) | camelCase vs **snake_case**. |
| `CPITrendItem` (`canonical_item_id`, `latest_price`, `previous_price`, `inflation_rate_percentage`, `history`) | `CPITrendItem` (`canonical_item_id`, `latest_price`, `previous_price`, `inflation_rate_percentage`, `history`) | Present in backend `cpi.py` schema with `PricePointResponse` history. |
| `Goal` (`householdId`, `envelopeId`, `goalType`, `targetAmount`, `targetDate`, `currentBalance`, `monthlyPacing`) | `GoalResponse` (`household_id`, `envelope_id`, `goal_type`, `target_amount`, `target_date`, `current_balance`, `monthly_pacing`) | camelCase vs **snake_case** with dynamic `monthly_pacing` calculation in FastAPI. |

### 1.4 Available FastAPI Backend Endpoints (`apps/api/app/api/v1/`)
- **Health**: `GET /api/v1/health`
- **Households**:
  - `POST /api/v1/households` (create household)
  - `GET /api/v1/households/{household_id}`
  - `POST /api/v1/households/{household_id}/users`
- **Accounts**:
  - `POST /api/v1/accounts` (create account)
  - `GET /api/v1/accounts/household/{household_id}` (list active accounts)
  - `GET /api/v1/accounts/{account_id}?household_id={id}`
- **Envelopes & ZBB**:
  - `POST /api/v1/envelopes/groups` (create envelope group)
  - `GET /api/v1/envelopes/groups/household/{household_id}` (list groups with nested envelopes)
  - `POST /api/v1/envelopes` (create envelope)
  - `GET /api/v1/envelopes/summary/{household_id}` (get `ZBBSummaryResponse`)
  - `POST /api/v1/envelopes/assign?household_id={id}` (assign envelope budget)
  - `POST /api/v1/envelopes/rebalance?household_id={id}` (rebalance funds between envelopes)
  - `GET /api/v1/envelopes/overspent/{household_id}` (list overspent envelopes)
- **Transactions & Ledger**:
  - `POST /api/v1/transactions` (create transaction with nested line items)
  - `GET /api/v1/transactions/household/{household_id}?limit=50` (list transactions with line items)
- **Personal CPI**:
  - `GET /api/v1/cpi/trends/{household_id}` (returns list of `CPITrendItem` with price history and inflation rate)
- **Goals & Sinking Funds**:
  - `POST /api/v1/goals` (create goal)
  - `GET /api/v1/goals/household/{household_id}` (list goals with computed `monthly_pacing`)
- **Webhook & Intake**:
  - `POST /api/v1/webhook/whatsapp` (WhatsApp message intake and webhook)

---

## 2. Logic Chain

1. **Frontend Requirements Mapping (R1 - R5)**:
   - **R1 (Zero-Based Budget Allocation Table)**: Requires interactive envelope budgeting, displaying total liquid inflow, assigned amounts, live unassigned cash indicator (`Unassigned = PKR 0.00`), assign modal, rebalance modal, and overspent indicator.
     - *Backend Match*: `GET /api/v1/envelopes/summary/{id}`, `GET /api/v1/envelopes/groups/household/{id}`, `POST /api/v1/envelopes/assign`, `POST /api/v1/envelopes/rebalance`.
   - **R2 (Granular Line-Item Transaction Explorer)**: Requires multi-level expandable rows for receipt line items (`qty`, `unit`, `unit_price`, `total_price`), search filter (merchant, item, raw text), category/account filter, and source badges (WhatsApp, Web, Mobile).
     - *Backend Match*: `GET /api/v1/transactions/household/{id}`, `POST /api/v1/transactions`.
   - **R3 (Personal CPI & Staple Inflation Visualizer)**: Requires interactive price history graphs over time for staples (`Potato`, `Milk`, `Eggs`, `Petrol`, `Flour`, `Cooking Oil`), month-over-month % inflation calculations, and merchant comparisons.
     - *Backend Match*: `GET /api/v1/cpi/trends/{id}`.
   - **R4 (Financial Goals & Emergency Runway Tracker)**: Requires target-date goal progress cards (e.g. Umrah 2027), dynamic monthly pacing calculator, emergency cushion gauge, and runway months projection (`Liquid Cash / Monthly Burn Rate`).
     - *Backend Match*: `GET /api/v1/goals/household/{id}`, `POST /api/v1/goals`.
   - **R5 (Liquid Accounts & Wallets Summary)**: Requires real-time balance cards across active accounts (`Wallet Cash`, `Meezan Bank`, `Sadapay`, `Nayapay`), liquid vs illiquid breakdown, net liquid worth, and quick-action transfer / log entry.
     - *Backend Match*: `GET /api/v1/accounts/household/{id}`, `POST /api/v1/accounts`.

2. **React 19 & Charting Strategy**:
   - Standard chart packages (like older Recharts builds) often have React 19 peer dependency conflicts during `pnpm install`.
   - Building a native, zero-dependency SVG chart component (`CPIChart.tsx`, `Sparkline.tsx`, `Gauge.tsx`) ensures:
     - 100% React 19 compatibility with zero peer dependency issues.
     - Fast bundle size and instant rendering.
     - Seamless integration with Tailwind CSS dark-mode styling, gradients, tooltips, and interactive point hover.

3. **State Management & Network Layer**:
   - An API client module (`apps/web/src/services/api.ts`) using standard `fetch` with typed methods.
   - A reactive state hook / store (`useTazkiyahState.ts` or React Context) that encapsulates active household ID, fetches all dashboard domains simultaneously, and provides mutation triggers (`assignBudget`, `rebalanceEnvelopes`, `logTransaction`, `createGoal`, `createAccount`) that immediately re-fetch/update the ZBB balance and UI state.

4. **Design System & Theme**:
   - Dark-first aesthetic (`slate-950` background, `slate-900` cards, `slate-800` borders).
   - Emerald primary accent (`emerald-400`/`emerald-500`) for zero-based budget equilibrium and halal wealth management.
   - Distinctive institution/type badges:
     - `Meezan Bank`: Blue / Islamic banking shield.
     - `Sadapay`: Teal / Peach fintech badge.
     - `Nayapay`: Orange / Coral wallet badge.
     - `Wallet Cash`: Emerald banknote badge.
   - Clear status indicators:
     - Overspent / Deficit: Red (`rose-400` / `rose-900/30`).
     - Unassigned Surplus: Blue / Amber.
     - Zero Balanced: Bright Emerald (`emerald-400` / `bg-emerald-950`).

---

## 3. Caveats

1. **Active Household Resolution**: The backend requires `household_id` (UUID) for almost every query. The frontend needs an automated discovery/fallback mechanism (e.g. check local storage, discover first household via `GET /api/v1/households/{id}`, or create a default demo household if none exists, or use the seeded demo household).
2. **Field Casing Alignment**: `packages/shared/src/types.ts` is in camelCase while the FastAPI backend returns snake_case. The frontend API client should either use dedicated API interface types (`apps/web/src/types/api.ts`) matching FastAPI's exact JSON payloads or normalize responses.
3. **Tailwind Config Generation**: `tailwind.config.js` and `postcss.config.js` must be created in `apps/web` so that Vite compiles Tailwind CSS classes during build and dev.
4. **Mobile Package (`apps/mobile`)**: Currently an empty directory and out of scope for the web dashboard deliverable.

---

## 4. Conclusion & Recommended Architecture

### 4.1 Recommended File & Component Organization

```
apps/web/
├── postcss.config.js                 # [Needed] PostCSS config for Tailwind
├── tailwind.config.js                # [Needed] Tailwind content & theme config
├── vite.config.ts                    # Vite config with API proxy support
└── src/
    ├── main.tsx                      # App entry
    ├── App.tsx                       # Main Dashboard Shell (Header, Navigation Tabs, Notifications)
    ├── index.css                     # Tailwind CSS base
    ├── types/
    │   └── api.ts                    # Exact TypeScript types matching FastAPI responses
    ├── services/
    │   └── api.ts                    # Type-safe Fetch API client for all backend endpoints
    ├── hooks/
    │   └── useDashboardData.ts       # Unified data fetching, caching, and mutation state hook
    ├── components/
    │   ├── ui/
    │   │   ├── Badge.tsx             # Status, source, and institution badges
    │   │   ├── Button.tsx            # Primary, secondary, outline buttons
    │   │   ├── Card.tsx              # Glassmorphic card container
    │   │   ├── Modal.tsx             # Accessible backdrop modal / dialog
    │   │   ├── Input.tsx             # Number, text, select inputs
    │   │   ├── ProgressBar.tsx       # Animated progress / pacing bar
    │   │   ├── Gauge.tsx             # Radial / arc gauge for emergency runway
    │   │   └── Tabs.tsx              # Dashboard view switcher tabs
    │   ├── layout/
    │   │   ├── Header.tsx            # Top bar with Logo, Live Unassigned Pill, Inflow, Quick Actions
    │   │   └── Navigation.tsx        # Tab bar (Accounts, Budget, Ledger, CPI, Goals)
    │   └── charts/
    │       ├── CPIChart.tsx          # Pure React 19 SVG multi-line/area inflation chart with tooltips
    │       └── Sparkline.tsx         # Compact inline sparkline for staple price trends
    └── features/
        ├── accounts/                 # [R5: Liquid Accounts & Wallets Summary]
        │   ├── AccountsSummary.tsx   # Account cards grid, net liquid worth, liquid breakdown
        │   └── AddAccountModal.tsx   # Create new bank / cash / wallet account
        ├── budget/                   # [R1: Zero-Based Budget Allocation Table]
        │   ├── ZBBOverviewBar.tsx    # Live Unassigned Cash banner, Total Inflow vs Assigned
        │   ├── BudgetTable.tsx       # Grouped envelope table with subtotals and expandable rows
        │   ├── AssignIncomeModal.tsx # Income assignment modal with live balance check
        │   ├── RebalanceModal.tsx    # Inter-envelope fund transfer modal
        │   └── AddEnvelopeModal.tsx  # Create envelope / group modal
        ├── ledger/                   # [R2: Granular Line-Item Transaction Explorer]
        │   ├── TransactionLedger.tsx # Searchable table with expandable multi-level receipt rows
        │   ├── ReceiptDetail.tsx     # Granular line-item breakdown (qty, unit, unit_price, total)
        │   ├── LedgerFilterBar.tsx   # Account, category, source, search filters
        │   └── LogTransactionModal.tsx # Manual transaction logger with line-item builder
        ├── cpi/                      # [R3: Personal CPI & Staple Inflation Visualizer]
        │   ├── CPIVisualizer.tsx     # Interactive inflation trend graph & metrics
        │   ├── StapleBasketGrid.tsx  # Staple cards (Potato, Milk, Eggs, Petrol) with MoM % changes
        │   └── PriceHistoryModal.tsx # Detailed price points history per merchant
        └── goals/                    # [R4: Financial Goals & Emergency Runway Tracker]
            ├── GoalsTracker.tsx      # Target-date goal cards with pacing calculator
            ├── EmergencyRunway.tsx   # Monthly burn rate, liquid runway gauge (e.g. 4.2 mos)
            └── AddGoalModal.tsx      # Add goal with target date and pacing calculation
```

### 4.2 Feature-by-Feature Implementation Plan

1. **Environment & Tooling Setup**:
   - Create `apps/web/postcss.config.js` and `apps/web/tailwind.config.js`.
   - Update `apps/web/vite.config.ts` to support API proxying to `http://localhost:8000`.
   - Define exact API types in `apps/web/src/types/api.ts`.
2. **Network & State Layer (`apps/web/src/services/api.ts`)**:
   - Implement type-safe HTTP client covering `/households`, `/accounts`, `/envelopes`, `/transactions`, `/cpi/trends`, `/goals`.
   - Build custom hook `useDashboardData` with auto-polling/refresh and optimistic state triggers.
3. **Core UI Primitives (`apps/web/src/components/ui/`)**:
   - Build responsive cards, modals, buttons, input fields, progress bars, and SVG chart components (`CPIChart`, `Sparkline`, `Gauge`).
4. **Feature Modules (R1 - R5)**:
   - Implement `features/budget/` (R1: Envelope table, assign/rebalance modals, live zero-based indicator).
   - Implement `features/ledger/` (R2: Transaction ledger with expandable line items, search, filters).
   - Implement `features/cpi/` (R3: Personal CPI visualizer, staple basket cards, MoM percentage indicators).
   - Implement `features/goals/` (R4: Financial goal cards, monthly pacing calculator, emergency runway gauge).
   - Implement `features/accounts/` (R5: Liquid accounts summary, institution badges, quick actions).
5. **Dashboard Shell & Integration (`apps/web/src/App.tsx`)**:
   - Assemble header with live Unassigned Cash badge (`Unassigned = PKR 0.00`), quick action modals, tabbed navigation, and notifications.

---

## 5. Verification Method

To independently verify the frontend survey and validate the web application build and type checking:

1. **Verify Config & Type Check**:
   ```bash
   pnpm --filter @tazkiyah/web run type-check
   # Or monorepo type-check
   pnpm run type-check
   ```
2. **Verify Production Build**:
   ```bash
   pnpm --filter @tazkiyah/web run build
   # Or monorepo build
   pnpm run build
   ```
3. **Verify Dev Server & API Integration**:
   - Backend running on `http://localhost:8000` (FastAPI with OpenAPI docs at `http://localhost:8000/api/v1/docs`).
   - Frontend running on `http://localhost:5173` (Vite).
   - Test health check: `curl -s http://localhost:8000/api/v1/health`.
   - Check all 5 views (Zero-Based Budget, Transaction Explorer, CPI Visualizer, Goals Tracker, Liquid Accounts) render correctly and update upon user interaction.
