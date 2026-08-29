## 2026-08-22T15:31:22Z

You are a teamwork_preview_worker for Milestone M2 (Frontend Foundation, API Client, UI Primitives & Liquid Accounts Summary).
Your working directory is: /home/mavee/tazkiyah/.agents/worker_m2_1
The project root is: /home/mavee/tazkiyah
The original user request is at: /home/mavee/tazkiyah/ORIGINAL_REQUEST.md
The project scope document is at: /home/mavee/tazkiyah/PROJECT.md
Frontend survey report: /home/mavee/tazkiyah/.agents/explorer_frontend_survey_1/handoff.md
Parent conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own:
- `apps/web/postcss.config.js`
- `apps/web/tailwind.config.js`
- `apps/web/vite.config.ts`
- `apps/web/src/types/api.ts`
- `apps/web/src/services/api.ts`
- `apps/web/src/hooks/useDashboardData.ts`
- `apps/web/src/components/ui/*`
- `apps/web/src/components/layout/*`
- `apps/web/src/features/accounts/*`
- `apps/web/src/App.tsx`
- `apps/web/src/index.css`

MISSION & REQUIREMENTS:
1. Setup PostCSS and Tailwind:
   - Create `apps/web/postcss.config.js` and `apps/web/tailwind.config.js` (content paths: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`).
   - Update `apps/web/vite.config.ts` with `/api` proxy to `http://localhost:8000`.
2. Type Definitions (`apps/web/src/types/api.ts`):
   - Define exact interfaces matching FastAPI `/api/v1` snake_case payloads: `HouseholdResponse`, `AccountResponse`, `AccountType`, `EnvelopeGroupResponse`, `EnvelopeResponse`, `ZBBSummaryResponse`, `TransactionResponse`, `LineItemResponse`, `CPITrendItem`, `PricePointResponse`, `GoalResponse`, `GoalType`.
3. API Client (`apps/web/src/services/api.ts`):
   - Implement typed HTTP client for `/health`, `/households`, `/accounts`, `/envelopes`, `/transactions`, `/cpi/trends`, `/goals`. Include demo household bootstrapping/discovery.
4. Reactive Data Hook (`apps/web/src/hooks/useDashboardData.ts`):
   - Fetch accounts, ZBB summary, envelope groups, transactions, CPI trends, and goals.
   - Provide mutation functions (`createAccount`, `assignBudget`, `rebalanceEnvelopes`, `logTransaction`, `createGoal`).
5. Reusable UI Primitives (`apps/web/src/components/ui/`):
   - `Card.tsx`, `Button.tsx`, `Modal.tsx`, `Input.tsx`, `Badge.tsx`, `ProgressBar.tsx`, `Gauge.tsx`, `Tabs.tsx`.
6. Layout Components (`apps/web/src/components/layout/`):
   - `Header.tsx`: Brand logo, live unassigned cash pill, quick actions.
   - `Navigation.tsx`: Navigation bar switching between Accounts, Budget, Ledger, CPI, Goals.
7. Feature: Liquid Accounts & Wallets Summary (R5) (`apps/web/src/features/accounts/`):
   - `AccountsSummary.tsx`: Total net liquid worth, account cards (`Wallet Cash`, `Meezan Bank`, `Sadapay`, `Nayapay`), institution logos/badges, overdrawn indicator, liquid asset distribution.
   - `AddAccountModal.tsx`: Form to add new account with type, opening balance, and live validation.
8. Shell & State Integration (`apps/web/src/App.tsx`):
   - Integrate Header, Navigation, Accounts summary, placeholder views for upcoming modules, and notification toasts.
9. Verification:
   - Run `pnpm run type-check` (must pass with 0 errors).
   - Run `pnpm run build` (must compile cleanly into `dist/`).

DELIVERABLE:
Write a complete report to `/home/mavee/tazkiyah/.agents/worker_m2_1/handoff.md` detailing all implemented components, type check results, build results, and verification commands.

Send a message when your handoff is written.
