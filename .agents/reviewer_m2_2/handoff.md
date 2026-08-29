# Milestone M2 Code & Contract Review Report: Frontend Foundation, API Client, UI Primitives & Liquid Accounts Summary

**Agent**: `reviewer_m2_2`  
**Milestone**: M2 (Frontend Foundation, API Client, UI Primitives & Liquid Accounts Summary)  
**Parent Conversation ID**: `39560258-203d-400a-9860-b8fa3cd3d4a7`  
**Date**: 2026-08-22  
**Target Workspace**: `apps/web`  
**Verdict**: `APPROVE`

---

## 1. Observation

A line-by-line inspection of Milestone M2 deliverables was performed against FastAPI `/api/v1` backend schemas and project contracts:

1. **API Schema Parity (`apps/web/src/types/api.ts` vs `apps/api/app/schemas/*`)**:
   - `AccountType` (`CASH`, `BANK`, `EMI`, `CREDIT`) matches `apps/api/app/models/account.py:8-12`.
   - `AccountResponse`, `AccountCreate` match `apps/api/app/schemas/account.py:14,23`.
   - `HouseholdResponse`, `HouseholdCreate`, `UserResponse`, `UserCreate` match `apps/api/app/schemas/household.py`.
   - `EnvelopeGroupResponse`, `EnvelopeGroupCreate`, `EnvelopeResponse`, `EnvelopeCreate`, `EnvelopeAssign`, `EnvelopeRebalance`, `ZBBSummaryResponse` match `apps/api/app/schemas/envelope.py`.
   - `TransactionResponse`, `TransactionCreate`, `LineItemResponse`, `LineItemCreate`, `TransactionSource` (`WHATSAPP`, `WEB`, `MOBILE`) match `apps/api/app/schemas/transaction.py`.
   - `CPITrendItem`, `PricePointResponse` match `apps/api/app/schemas/cpi.py`.
   - `GoalResponse`, `GoalCreate`, `GoalUpdate`, `GoalType` match `apps/api/app/schemas/goal.py`.
   - `HealthResponse` matches `apps/api/app/api/v1/health.py`.
   - Currency fields are typed as `number | string` to account for both string-serialized Decimal and floating-point JSON representations.

2. **API Service Client (`apps/web/src/services/api.ts`)**:
   - Implements native `fetch` client using `import.meta.env.VITE_API_URL || '/api/v1'`.
   - Maps to all FastAPI endpoints:
     - Health: `GET /health`
     - Households: `POST /households`, `GET /households/{id}`, `POST /households/{id}/users`
     - Accounts: `POST /accounts`, `GET /accounts/household/{id}`, `GET /accounts/{id}?household_id={id}`
     - Envelopes: `POST /envelopes/groups`, `GET /envelopes/groups/household/{id}`, `POST /envelopes`, `GET /envelopes/summary/{id}`, `POST /envelopes/assign?household_id={id}`, `POST /envelopes/rebalance?household_id={id}`, `GET /envelopes/overspent/{id}`
     - Transactions: `POST /transactions`, `GET /transactions/household/{id}?limit=50`
     - CPI: `GET /cpi/trends/{id}`
     - Goals: `POST /goals`, `GET /goals/household/{id}`
   - Implements `ApiClientError` with parsing of FastAPI `{ detail: "..." }` exception payloads.
   - Implements `bootstrapHousehold()` with localStorage caching (`tazkiyah_active_household_id`) and automated fallback creation when cached IDs are invalidated.

3. **Reactive State Hook (`apps/web/src/hooks/useDashboardData.ts`)**:
   - Executes parallel multi-domain fetching (`Promise.all`) across accounts, ZBB summary, envelope groups, transactions, CPI trends, goals, and overspent envelopes.
   - Wraps individual domain queries in `.catch()` fallbacks, ensuring resilience against partial backend failures (a failure in CPI or goals does not break account summary or budgeting).
   - Computes live financial metrics: `netLiquidWorth`, `totalCash`, `totalBank`, `totalEmi`, `totalCredit`, `unassignedCash`, `isZeroBalanced`.
   - Exposes clean mutation methods (`createAccount`, `assignBudget`, `rebalanceEnvelopes`, `logTransaction`, `createGoal`, `createEnvelope`, `createEnvelopeGroup`) that automatically trigger background state re-synchronization (`refresh`).

4. **Reusable UI Primitives (`apps/web/src/components/ui/`)**:
   - `Card.tsx`: Glassmorphism and dark styling with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`.
   - `Button.tsx`: Fully typed variants (`primary`, `emerald`, `secondary`, `outline`, `ghost`, `danger`), sizes, loading spinner, and icon slots.
   - `Modal.tsx`: Accessible dialog with backdrop click, Escape keydown listener, body scroll lock, and cleanup.
   - `Input.tsx`: Input and Select components with PKR prefix formatting, error messages, and helper text.
   - `Badge.tsx`: Status, account type (`cash`, `bank`, `emi`, `credit`), and transaction source (`whatsapp`, `web`, `mobile`) badge variants.
   - `ProgressBar.tsx`: Multi-threshold animated progress bar with auto-color calculation (`emerald`, `blue`, `amber`, `rose`).
   - `Gauge.tsx`: Zero-dependency SVG arc gauge for financial runway and health indicators with bounded arc calculations.
   - `Tabs.tsx`: Flexible segmented, pill, and underline navigation tabs.

5. **Liquid Accounts & Wallets Summary (R5) (`apps/web/src/features/accounts/`)**:
   - `AccountsSummary.tsx`:
     - Net liquid capital hero banner with live active accounts count.
     - Quick breakdown cards for Bank, Wallets, Cash, and Credit liabilities.
     - Dynamic liquid asset distribution bar with guarded percentage calculation (`bankShare`, `emiShare`, `cashShare`).
     - Pakistani banking & fintech institution branding with custom themes for Meezan Bank (Islamic banking), Sadapay (EMI), Nayapay (EMI), Cash, and general banks.
     - Explicit overdrawn indicator (`AlertTriangle`, red border, negative balance alert).
     - Empty account list state with illustration, helper message, and CTA.
   - `AddAccountModal.tsx`:
     - Quick suggestion presets (Meezan Bank, Sadapay, Nayapay, Wallet Cash).
     - Account name validation (`name.trim()`).
     - Opening balance numeric validation (`!isNaN(numBalance)`).
     - Form submission with error feedback and loading state.

6. **Integrity & Authenticity Check**:
   - No hardcoded test responses or fake mocks in application code paths.
   - Direct integration between React state, API client, and FastAPI endpoints.
   - Clean architectural layout matching `PROJECT.md`.

---

## 2. Logic Chain

1. **Schema & Endpoint Symmetry**: The frontend models in `types/api.ts` directly correspond with FastAPI Pydantic schemas in `apps/api/app/schemas/`. Both query parameters (such as `household_id` on `/accounts/{id}`, `/envelopes/assign`, `/envelopes/rebalance`) and path parameters match exactly.
2. **Resilience & Fault Tolerance**: In `useDashboardData.ts`, each domain query is guarded with `.catch()` default fallbacks. If a specific domain endpoint fails or returns an error, other dashboard features continue functioning without crashing the React component tree.
3. **Edge Case Safety**:
   - Zero-balance and empty account list states do not trigger `NaN` or divide-by-zero errors in distribution percentages (`cashShare`, `bankShare`, `emiShare`).
   - Overdrawn accounts (`is_overdrawn === true` or balance < 0) are highlighted with high-contrast warning cues.
   - Invalid or expired household IDs in `localStorage` are automatically purged and replaced during bootstrapping.
4. **Zero External Charting Bloat**: `Gauge.tsx` and `ProgressBar.tsx` use pure React 19 SVG calculations, ensuring zero dependency conflicts.

---

## 3. Caveats

1. **Backend Uvicorn Service Dependency**: The web app communicates with `http://localhost:8000/api/v1` via Vite's proxy (`/api`). To view live data, the FastAPI backend must be running.
2. **Subsequent Feature Views**: In `App.tsx`, the Budget, Ledger, CPI, and Goals tabs present rich live previews from `useDashboardData` while full interactive workflows for those specific features will be developed in Milestones M3–M5.

---

## 4. Conclusion

Milestone M2 deliverables meet all design, contract, and functional requirements:
- **API Schema Parity**: 100% match with backend FastAPI `/api/v1` contracts.
- **Error Handling**: Graceful network error catching, empty state fallbacks, form validation, and overdrawn balance handling.
- **UI & Feature Completeness**: Full Liquid Accounts & Wallets Summary (R5), Add Account modal, header with live ZBB Unassigned Cash indicator, and reusable UI primitives.
- **Integrity**: Zero shortcuts, dummy facades, or hardcoded cheating.

**Verdict**: `APPROVE`

---

## 5. Verification Method

### 5.1 Static Type & Parity Inspection
Inspect interfaces and types:
- `apps/web/src/types/api.ts`
- `apps/web/src/services/api.ts`
- `apps/web/src/hooks/useDashboardData.ts`
- `apps/web/src/features/accounts/AccountsSummary.tsx`
- `apps/web/src/features/accounts/AddAccountModal.tsx`

### 5.2 Build & Type-Check Commands
Run in terminal:
```bash
# Type check web application
pnpm --filter @tazkiyah/web run type-check

# Compile production bundle
pnpm --filter @tazkiyah/web run build
```

### 5.3 Live Dashboard Verification
1. Start backend:
   ```bash
   cd apps/api && uv run uvicorn app.main:app --port 8000
   ```
2. Start frontend:
   ```bash
   pnpm --filter @tazkiyah/web run dev
   ```
3. Open `http://localhost:5173`:
   - Verify Header shows brand `تزكية Tazkiyah / Mavee Household` and dynamic ZBB pill.
   - Verify Liquid Accounts view shows active cards (Wallet Cash, Meezan Bank, Sadapay, Nayapay) with asset distribution bar.
   - Click "Add Account" to test modal presets, validation, and submission.
