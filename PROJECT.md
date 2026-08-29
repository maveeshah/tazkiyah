# Project: Tazkiyah (Daily Finance & Wealth OS)

## Architecture
Tazkiyah is a monorepo organized via `pnpm` workspaces and `turbo` (`apps/api`, `apps/web`, `apps/mobile`):
- **`apps/web`**: React 19 + Vite 6 + TypeScript + Tailwind CSS 3.4 single-page application dashboard delivering Zero-Based Budgeting (ZBB), Granular Transaction Ledger with receipt line items, Personal CPI & Staple Inflation trend visualizer, Financial Goals & Emergency Runway tracker, Liquid Accounts/Wallets summary, and a Users/household-management view (login/register/switch/member CRUD). Every core entity (transaction, account, envelope, group, goal) is editable and deletable. Session in `localStorage`; a `UserProvider` context supplies the active household.
- **`apps/api`**: Python 3.11+ FastAPI backend with SQLAlchemy 2.0 async ORM, PostgreSQL (port 5435), Alembic migrations, Pydantic v2 schemas, and business services (`zbb_service`, `ledger_service`, `cpi_service`, `goal_service`, `household_service`, `whatsapp_intake_service`, `parser_service`). Wired into the pnpm/turbo task graph via `apps/api/package.json` (`test` → pytest, `lint` → ruff).
- **`apps/mobile`**: Expo SDK 54 / React Native 0.81 / expo-router app — six tabs (Budget, Ledger, Log, Prices/CPI, Goals, Users) at feature parity with the web dashboard, plus a natural-language "Quick Text / AI" expense logger. Persists its session in AsyncStorage; talks to the same `/api/v1`.
- **Data Flow**:
  1. PostgreSQL stores relational entities (`households`, `users`, `accounts`, `envelope_groups`, `envelopes`, `transactions`, `line_items`, `canonical_items`, `price_history`, `goals`).
  2. FastAPI exposes `/api/v1` REST endpoints returning JSON data (CORS enabled for web).
  3. Frontend API client (`apps/web/src/services/api.ts`) communicates with `/api/v1` endpoints and manages reactive dashboard state.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Demo Seed Data Script | Standalone executable `seed_demo_data.py` populating realistic demo household, accounts, envelope groups, multi-month transactions, goals, and CPI price points | M1 | ORIGINAL_REQUEST R6 |
| 2 | Backend Verification Runner | Automated script verifying database seeding and all `/api/v1` API endpoint contracts | M1 | ORIGINAL_REQUEST R6 |
| 3 | Frontend Config & UI Primitives | Tailwind/PostCSS setup, SVG charts (`CPIChart`, `Sparkline`, `Gauge`), base components (`Card`, `Button`, `Modal`, `Input`, `Badge`, `Tabs`, `ProgressBar`) | M2 | Survey / Architecture |
| 4 | Frontend API Client & State Hook | Type-safe API client and `useDashboardData` hook connecting React 19 web app to FastAPI backend | M2 | Survey / Architecture |
| 5 | Liquid Accounts & Wallets Summary | Real-time balance cards, liquid vs illiquid breakdown, net liquid worth, overdrawn flags, and institution badges | M2 | ORIGINAL_REQUEST R5 |
| 6 | Create Account Modal | Interactive modal to add new bank / cash / wallet accounts | M2 | ORIGINAL_REQUEST R5 |
| 7 | ZBB Invariant Overview Bar | Real-time `Unassigned Cash = Total Inflow − Total Assigned + Total Spent` banner with `PKR 0.00` target balance indicator | M3 / M9 | ORIGINAL_REQUEST R1 |
| 8 | Grouped Envelope Budget Table | Hierarchical table of envelope groups and envelopes with Assigned, Spent, and Available balances | M3 | ORIGINAL_REQUEST R1 |
| 9 | Assign Income Modal | Modal to assign income to envelopes with live unassigned cash limit enforcement | M3 | ORIGINAL_REQUEST R1 |
| 10 | Envelope Rebalance Modal | Inter-envelope fund transfer modal to cover overspending or reallocate savings | M3 | ORIGINAL_REQUEST R1 |
| 11 | Add Envelope / Group Modals | Modals to create new envelope categories and groups | M3 | ORIGINAL_REQUEST R1 |
| 12 | Granular Transaction Ledger | Filterable and searchable transaction table showing date, merchant, source (`WHATSAPP`, `WEB`, `MOBILE`), account, envelope, amount | M4 | ORIGINAL_REQUEST R2 |
| 13 | Multi-Level Receipt Line-Item Explorer | Expandable table rows showing itemized receipt breakdown (raw name, canonical item, quantity, unit, unit price, total price, notes) | M4 | ORIGINAL_REQUEST R2 |
| 14 | Ledger Search & Filters | Real-time client-side search by merchant/item and filtering by account, category, and source tag | M4 | ORIGINAL_REQUEST R2 |
| 15 | Manual Transaction Logger | Modal form to log multi-line item transactions with account debiting and envelope deduction | M4 | ORIGINAL_REQUEST R2 |
| 16 | Personal CPI Staple Cards | Staple cards (`Potato`, `Milk`, `Eggs`, `Petrol`, `Flour`, `Cooking Oil`) with latest unit price and MoM % inflation rate | M5 | ORIGINAL_REQUEST R3 |
| 17 | Interactive CPI Historical Price Charts | Pure React 19 SVG multi-line time series chart showing price evolution across months with interactive tooltips | M5 | ORIGINAL_REQUEST R3 |
| 18 | Merchant Price Comparison Table | Breakdown of prices paid per staple across different vendors and dates | M5 | ORIGINAL_REQUEST R3 |
| 19 | Financial Goals & Sinking Fund Cards | Goal progress cards with visual progress bar (`current_balance / target_amount`) | M5 | ORIGINAL_REQUEST R4 |
| 20 | Dynamic Monthly Pacing Calculator | Target-date monthly savings contribution calculator (`monthly_pacing` from backend) | M5 | ORIGINAL_REQUEST R4 |
| 21 | Emergency Runway Gauge & Burn Rate | Household liquid runway in months (`Liquid Cash / Monthly Burn Rate`) with radial/arc meter | M5 | ORIGINAL_REQUEST R4 |
| 22 | Add Goal Modal | Form to create target-date or sinking-fund goals | M5 | ORIGINAL_REQUEST R4 |
| 23 | Monorepo Type Check & Production Build | Clean `pnpm run type-check` (0 errors) and `pnpm run build` production bundle generation | M6 | ORIGINAL_REQUEST Verification |
| 24 | End-to-End Test Suite & Verification | Automated test suite validating API integration, ZBB invariants, and all UI interactive workflows | M6 | ORIGINAL_REQUEST Verification |
| 25 | Mobile Budget & ZBB | Expo Budget tab — ZBB banner, wallets, envelope table, plus Assign Income / Rebalance / Add Envelope / Add Group modals (`apps/mobile/src/features/budget/`) | M7 | Mobile parity |
| 26 | Mobile Ledger & Log | Transaction list with expandable line items; structured multi-line logger + natural-language "Quick Text / AI" mode (`apps/mobile/app/(tabs)/{ledger,log}.tsx`) | M7 | Mobile parity |
| 27 | Mobile Prices / CPI | Staple cards with MoM inflation %, `react-native-svg` sparkline, tap-to-expand merchant price comparison (`apps/mobile/src/features/cpi/`) | M7 | Mobile parity |
| 28 | Mobile Goals & Runway | Goal cards using backend `monthly_pacing`, Add Goal modal, Emergency Runway section with milestone bars (`apps/mobile/src/features/goals/`) | M7 | Mobile parity |
| 29 | Mobile Users & Session | Login/register/switch-user/household management tab; AsyncStorage session persistence with optimistic restore (`apps/mobile/src/{context/UserContext,lib/storage}.ts`) | M7 | Mobile parity |
| 30 | CI Pipeline | `.github/workflows/ci.yml` — frontend (type-check, **eslint**, web build, mobile expo-doctor + bundle) and backend (ruff, `alembic upgrade` + `alembic check`, 129 pytest, installs from `requirements.lock`) jobs | M8 / M9 | Harden |
| 31 | Core-Entity CRUD | `GET/PATCH/DELETE` for transactions (balance-reversing), accounts, envelopes, groups, goals — backend + web + mobile UI; delete blocked when referenced | M9 | Audit follow-up |
| 32 | Web Users & Household UI | `context/UserContext` + `features/users/*` — login/register/logout/switch-user/switch-household/member CRUD/create-household, `localStorage` session | M9 | Web↔mobile parity |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Demo Seed Script & Data Verification | Implement `apps/api/scripts/seed_demo_data.py` with multi-month realistic demo data (households, accounts, envelopes, transactions, price history, goals) and verify API data seeding | none | DONE |
| M2 | Frontend Foundation, API Client, UI Primitives & Accounts Summary (R5) | Configure Tailwind/PostCSS, create typed API client & state hook, build UI primitives (`Card`, `Button`, `Modal`, `Badge`, `Gauge`), shell layout, and R5 Liquid Accounts Summary | M1 | DONE |
| M3 | Zero-Based Budget Allocation Table & Envelope Management (R1) | Implement ZBB Overview Bar, Grouped Envelope Table, Assign Income Modal, Rebalance Modal, and Add Envelope/Group Modals | M2 | DONE |
| M4 | Granular Line-Item Transaction Explorer & Receipt Breakdown (R2) | Implement Transaction Ledger, expandable multi-level line-item receipt view, search/filter bar, and Manual Transaction Logger modal | M3 | DONE |
| M5 | Personal CPI & Inflation Visualizer (R3) + Goals & Emergency Runway (R4) | Implement React 19 SVG `CPIChart`, Staple Basket Cards, Vendor Comparison, Goal Cards with Monthly Pacing, Emergency Runway Gauge, and Add Goal Modal | M4 | DONE |
| M6 | Monorepo Type-Check, Production Build & E2E Validation (R6) | `pnpm run type-check` (0 errors), `pnpm run build`, and the full E2E suite — **113 pytest tests green** across Tiers 1–4 + master + unit/smoke | M5 | DONE |
| M7 | Native Mobile App (Expo) | `apps/mobile` — expo-router 6-tab app at parity with web (Budget/ZBB editing, Ledger, Log + NL/AI, CPI/Prices, Goals + Emergency Runway, Users), AsyncStorage session persistence, placeholder brand assets, clean `expo-doctor` + iOS bundle export | M5 | DONE |
| M8 | Harden & Close Out | `apps/api` wired into pnpm/turbo (`test`→pytest, `lint`→ruff, ruff baseline `E9,F`); `.github/workflows/ci.yml` (frontend + backend jobs); `seed_demo_data.py` idempotent on duplicate households; `verify_demo_data.py` un-rotted; `COMPLETION_REPORT.md` | M6, M7 | DONE |
| M9 | Web parity, correctness & CRUD | **ZBB `unassigned_cash` = inflow − assigned + spent** (was missing `spent` → banner went "Over Budget" after any real transaction); seed reworked to debit accounts through the ledger loop; ledger input validation; WhatsApp zero-envelope crash fixed. **Full CRUD** — `GET/PATCH/DELETE` for transactions (balance-reversing), accounts, envelopes, groups, goals, with delete-blocked-when-referenced. **Web Users/household UI** ported from mobile (`context/UserContext`, `features/users/*`, 6th nav tab); web `bootstrap()` now hits `GET /households/bootstrap` (was creating an empty orphan household every load). Web + mobile edit/delete UI; mobile Add Account + dashboard resilience. Cleanup: deleted dead `packages/shared`, added ESLint gate, `requirements.lock`, `alembic check` in CI. **129 pytest tests.** | M6, M7 | DONE |

---

## Interface Contracts

### Backend API ↔ Frontend Web Client (`/api/v1`)
- **Base URL**: `http://localhost:8000/api/v1` (or the Vite dev proxy `/api/v1` → `VITE_API_PROXY_TARGET`, default `:8000`)
- **JSON Formatting**: FastAPI serializes models in snake_case. `apps/web/src/types/api.ts` provides explicit TypeScript interfaces matching these exact response shapes.

#### Endpoints:
1. `GET /health` -> `{"status": "healthy", "service": "tazkiyah-api", "version": "1.0.0"}`
2. `GET /households/{id}` -> `HouseholdResponse` (`id`, `name`, `base_currency`, `created_at`)
3. `POST /households` -> `HouseholdResponse`
4. `GET /accounts/household/{household_id}` -> `List[AccountResponse]` (`id`, `household_id`, `name`, `type`, `current_balance`, `is_active`, `is_overdrawn`, `created_at`)
5. `POST /accounts` -> `AccountResponse`
6. `GET /envelopes/groups/household/{household_id}` -> `List[EnvelopeGroupResponse]` (`id`, `name`, `sort_order`, `envelopes: List[EnvelopeResponse]`)
7. `GET /envelopes/summary/{household_id}` -> `ZBBSummaryResponse` (`total_inflow`, `total_assigned`, `unassigned_cash`, `total_spent`, `overspent_envelopes_count`). **`unassigned_cash = total_inflow − total_assigned + total_spent`** — spending a budgeted envelope does not move it; only assigning/income does.
8. `POST /envelopes/assign?household_id={id}` -> `EnvelopeResponse`
9. `POST /envelopes/rebalance?household_id={id}` -> `{"status": str, "message": str, "from_envelope": EnvelopeResponse, "to_envelope": EnvelopeResponse}` (rejects `from == to`)
10. `GET /envelopes/overspent/{household_id}` -> `List[EnvelopeResponse]`
11. `PATCH|DELETE /envelopes/{id}?household_id={id}` — rename / set target; delete blocked (409) when transactions reference it
12. `PATCH|DELETE /envelopes/groups/{id}?household_id={id}` — rename / sort; delete cascades unreferenced envelopes, blocked when any are referenced
13. `GET /transactions/household/{household_id}?limit=50` (capped ≤500) -> `List[TransactionResponse]` (with nested `line_items`)
14. `POST /transactions` -> `TransactionResponse` (rejects `total_amount ≤ 0` and line-item sums that don't match)
15. `GET|PATCH|DELETE /transactions/{id}?household_id={id}` — PATCH reverse-then-reapplies account/envelope deltas; DELETE reverts them (price-history kept — ADR 0005)
16. `GET /cpi/trends/{household_id}` -> `List[CPITrendItem]` (`canonical_item_id`, `name`, `category`, `standard_unit`, `latest_price`, `previous_price`, `inflation_rate_percentage`, `history: List[PricePointResponse]`)
17. `GET /goals/household/{household_id}` -> `List[GoalResponse]` (`id`, `name`, `goal_type`, `target_amount`, `target_date`, `current_balance`, `monthly_pacing`)
18. `POST /goals` -> `GoalResponse`
19. `GET|PATCH|DELETE /goals/{id}?household_id={id}` — linked-goal `current_balance` edits ignored (ADR 0002); foreign-household envelope link -> 404
20. `GET /households/bootstrap` -> `AuthResponse` (`{user, household}`) — get-or-create the demo household + user; the web client's entry point
21. `POST /users/login` / `POST /users/register` -> `AuthResponse`; `GET /users`, `PATCH|DELETE /users/{id}`, `GET|POST /households/{id}/users`

---

## Code Layout
```
tazkiyah/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── api/v1/               # FastAPI routers (accounts, envelopes, transactions, cpi, goals, households)
│   │   │   ├── core/                 # Config, Database engine
│   │   │   ├── models/               # SQLAlchemy models (account, envelope, transaction, canonical_item, goal, household)
│   │   │   ├── schemas/              # Pydantic validation schemas
│   │   │   ├── services/             # Domain services (zbb_service, ledger_service, cpi_service)
│   │   │   └── main.py               # FastAPI application entry & CORS
│   │   ├── scripts/
│   │   │   ├── seed_demo_data.py     # Demo database seed script (M1, idempotent)
│   │   │   └── verify_demo_data.py   # Standalone dataset verification (M1)
│   │   ├── package.json              # @tazkiyah/api — turbo test/lint entry (M8)
│   │   ├── requirements.lock         # pinned transitive deps (pip-compile; used by CI)
│   │   └── tests/                    # Backend pytest suite (129 tests, incl. test_crud.py)
│   ├── mobile/                       # Expo SDK 54 / expo-router native app (M7)
│   │   ├── app/(tabs)/               # Budget, ledger, log, cpi, goals, profile (Users) screens
│   │   └── src/
│   │       ├── context/UserContext.tsx   # Auth/household state + AsyncStorage session
│   │       ├── lib/storage.ts            # AsyncStorage session wrapper
│   │       ├── services/api.ts           # Fetch API client
│   │       ├── hooks/useDashboardData.ts # Data fetching + computed totals
│   │       ├── components/FormModal.tsx  # Shared modal chrome
│   │       └── features/{budget,cpi,goals}/  # Parity feature modules
│   └── web/
│       ├── postcss.config.js         # PostCSS configuration
│       ├── tailwind.config.js        # Tailwind CSS configuration
│       ├── vite.config.ts            # Vite config with API proxy
│       └── src/
│           ├── types/api.ts          # TypeScript interfaces matching backend models
│           ├── services/api.ts       # Fetch API client (incl. bootstrap + CRUD)
│           ├── context/UserContext.tsx  # Auth/household state + localStorage session
│           ├── lib/storage.ts        # localStorage session wrapper
│           ├── hooks/useDashboardData.ts # Data fetching + mutation/CRUD hooks
│           ├── components/
│           │   ├── ui/               # Cards, Buttons, Modals, ConfirmModal, ErrorBoundary, …
│           │   ├── layout/           # Header, Navigation
│           │   └── charts/           # Pure React 19 SVG CPIChart & Sparkline
│           └── features/
│               ├── accounts/         # R5: Accounts summary + Add/Edit modals
│               ├── budget/           # R1: ZBB table + Assign/Rebalance/Add/Edit modals
│               ├── ledger/           # R2: Transaction explorer + Log/Edit modals
│               ├── cpi/              # R3: Personal CPI & Staple Inflation Visualizer
│               ├── goals/            # R4: Goals & Emergency Runway + Add/Edit modals
│               └── users/            # M9: Users/household management view + modals
├── eslint.config.js                  # Flat ESLint config (web + mobile)
└── .github/workflows/ci.yml          # Frontend + backend CI (M8/M9)
```
