# Forensic Audit Report: Milestone M2

**Work Product**: Milestone M2 (Frontend Foundation, API Client, UI Primitives & Liquid Accounts Summary)  
**Auditor**: `auditor_m2_1`  
**Profile**: General Project (Integrity Mode: `development`)  
**Verdict**: **`CLEAN`**  
**Parent Conversation ID**: `39560258-203d-400a-9860-b8fa3cd3d4a7`  
**Date**: 2026-08-22  

---

## 1. Observation

A line-by-line forensic investigation was performed across all Milestone M2 deliverables in `apps/web`:

1. **API Client & Backend Communication (`apps/web/src/services/api.ts`)**:
   - Implements native `fetch` requests via `request<T>(endpoint, options)`.
   - Dynamic `API_BASE_URL` resolved from `import.meta.env.VITE_API_URL || '/api/v1'`.
   - Communicates with all mandated FastAPI REST endpoints:
     - Health (`/health`)
     - Households (`/households`, `/households/{id}`, `/households/{id}/users`)
     - Accounts (`/accounts`, `/accounts/household/{id}`, `/accounts/{id}`)
     - Envelopes (`/envelopes/groups`, `/envelopes/groups/household/{id}`, `/envelopes`, `/envelopes/summary/{id}`, `/envelopes/assign`, `/envelopes/rebalance`, `/envelopes/overspent/{id}`)
     - Transactions (`/transactions`, `/transactions/household/{id}`)
     - Personal CPI (`/cpi/trends/{id}`)
     - Goals (`/goals`, `/goals/household/{id}`)
   - Custom `ApiClientError` correctly parses backend error responses (both JSON `detail` object and fallback text).
   - **No mock data, no hardcoded responses, no fake bypasses.**

2. **TypeScript Type System & Strictness (`apps/web/src/types/api.ts`, `apps/web/tsconfig.json`)**:
   - `apps/web/src/types/api.ts` contains 232 lines of exact TypeScript interface definitions matching FastAPI snake_case response and request payloads.
   - Comprehensive grep search for suppression directives (`@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`) in `apps/web/src`: **0 occurrences found**.
   - Comprehensive regex search for untyped escape hatches (`: any`, `as any`, `<any>`) in `apps/web/src`: **0 occurrences found**.
   - `tsconfig.json` enforces strict compiler settings: `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`.

3. **Reactive State Machine & Mathematical Invariants (`apps/web/src/hooks/useDashboardData.ts`)**:
   - `useDashboardData` orchestrates concurrent data fetching via `Promise.all` across accounts, ZBB summary, envelope groups, transactions, CPI trends, goals, and overspent categories.
   - Computes financial aggregations dynamically:
     - `netLiquidWorth`: sums active account balances with `parseFloat` / `Number` coercion and `isNaN` protection.
     - `totalCash`, `totalBank`, `totalEmi`, `totalCredit`: categorical liquid sub-totals filtered on `is_active && type === '...'`.
     - `unassignedCash`: extracted from `zbbSummary.unassigned_cash`.
     - `isZeroBalanced`: floating-point tolerance check `Math.abs(unassignedCash) < 0.01`.
   - Exposes genuine mutation callbacks (`createAccount`, `assignBudget`, `rebalanceEnvelopes`, `logTransaction`, `createGoal`, `createEnvelope`, `createEnvelopeGroup`) that execute API calls and automatically trigger reactive data refresh.

4. **Component Implementation & Dynamic Rendering (`apps/web/src/features/accounts/`)**:
   - `AccountsSummary.tsx`:
     - Dynamically renders `accounts` prop with active filtering (`accounts.filter(a => a.is_active)`).
     - Pakistani banking & fintech theming (`getInstitutionTheme`): dedicated visual gradients and badges for Meezan Bank (Islamic banking), Sadapay (EMI), Nayapay (EMI), Cash wallets, and generic bank/credit accounts.
     - Overdrawn state handling: dynamically flags accounts if `account.is_overdrawn === true` or `current_balance < 0` with high-contrast alert borders, `AlertTriangle` warning icon, and rose text.
     - Asset allocation breakdown bar: safe division guarded by `netLiquidWorth > 0` preventing `0/0` (NaN) rendering.
   - `AddAccountModal.tsx`:
     - Fully interactive controlled form (`name`, `type`, `balance`) with quick presets (Meezan Bank, Sadapay, Nayapay, Wallet Cash), client-side required validation, number validation, loading spinner state, and error message rendering.

5. **Reusable UI Primitives & Layout (`apps/web/src/components/`)**:
   - `Card.tsx`: Glassmorphic layout container with header, title, description, content, footer.
   - `Button.tsx`: Multi-variant styling (`primary`, `emerald`, `secondary`, `outline`, `ghost`, `danger`), loading spinner (`Loader2`), icon slots.
   - `Modal.tsx`: Accessible dialog with backdrop blur, ESC key event listener, body scroll lock, and zoom animations.
   - `Input.tsx` & `Select`: Prefix text (e.g., `PKR`), helper text, error styling.
   - `Badge.tsx`: Status and entity badges (`cash`, `bank`, `emi`, `credit`, `whatsapp`, `web`, `mobile`).
   - `ProgressBar.tsx`: Clamped progress math `(value / (max || 1)) * 100` with auto color thresholds.
   - `Gauge.tsx`: Zero-dependency SVG arc geometry path generator with normalized angle calculations and color bands.
   - `Tabs.tsx`: Segmented, underline, and pill tab switchers with icon and badge support.
   - `Header.tsx` & `Navigation.tsx`: Brand logo (`تزكية`), reactive live Unassigned Cash pill (`ZBB Balanced` / `To Assign` / `Overassigned`), and 5-view tab switching.

---

## 2. Logic Chain

1. **Authenticity Check**: The frontend API service (`api.ts`) contains genuine HTTP fetch calls targeting the `/api/v1` backend endpoints with full JSON/FormData payload support and error propagation. No hardcoded or dummy response objects exist in `api.ts` or `useDashboardData.ts`.
2. **Type Rigor Check**: The types in `types/api.ts` are comprehensive and strictly aligned with backend schemas. No `@ts-ignore` flags or `any` type casts exist in the entire web codebase.
3. **Component Integrity Check**: `AccountsSummary.tsx` and `AddAccountModal.tsx` genuinely consume and manipulate dynamic props and state without hardcoded mock arrays.
4. **Defensive Programming Check**: Math calculations across hooks and UI primitives include defensive guards (`isNaN`, zero-division checks `netLiquidWorth > 0`, `max || 1`, bounding `Math.min/max`).

---

## 3. Caveats

- **Runtime Backend Requirement**: Live interactive end-to-end testing in the browser requires the FastAPI backend running on port 8000.
- **Preview Views for M3–M5**: In `App.tsx`, the Budget, Ledger, CPI, and Goals tabs display live data previews from the dashboard hook while awaiting their full feature module implementations in subsequent milestones.

---

## 4. Conclusion

**Verdict: `CLEAN`**

Milestone M2 contains zero integrity violations:
- No hardcoded test results or mock data bypasses.
- No facade implementations or dummy placeholder functions.
- No `@ts-ignore` or `any` shortcuts.
- Fully genuine React 19 UI primitives, typed API service, reactive dashboard hook, and Liquid Accounts & Wallets Summary component.

---

## 5. Verification Method

To independently verify the audit conclusions:

1. **Verify Absence of TypeScript Suppression Directives**:
   ```bash
   grep -rn "@ts-" apps/web/src/
   ```
   *Expected Output*: 0 matches.

2. **Verify Absence of `any` Type Annotations / Casts**:
   ```bash
   grep -rEn ":\s*any\b|\bas\s+any\b|<any>" apps/web/src/
   ```
   *Expected Output*: 0 matches.

3. **Verify Strict Monorepo Type-Check**:
   ```bash
   pnpm --filter @tazkiyah/web run type-check
   ```
   *Expected Output*: 0 errors, Exit Code 0.

4. **Verify Clean Production Bundle Build**:
   ```bash
   pnpm --filter @tazkiyah/web run build
   ```
   *Expected Output*: Production assets generated in `apps/web/dist/`.
