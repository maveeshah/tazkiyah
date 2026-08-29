# Milestone M2 Review & Adversarial Audit Report

**Agent**: `reviewer_m2_1`  
**Milestone**: M2 (Frontend Foundation, API Client, UI Primitives & Liquid Accounts Summary)  
**Parent Conversation ID**: `39560258-203d-400a-9860-b8fa3cd3d4a7`  
**Date**: 2026-08-22  
**Target Workspace**: `apps/web`  

---

## Review Summary

**Verdict**: `APPROVE`  
**Integrity Status**: `VERIFIED_GENUINE` (No hardcoded test outputs, no facade stubs, genuine API communication & state handling)

---

## 1. Observation

1. **TypeScript Type-Checking & Production Build**:
   - Executed `pnpm run build` (`turbo run build` -> `tsc && vite build`):
     - Transformed 1,831 modules cleanly.
     - Emitted production artifacts `dist/index.html` (0.54 kB), `dist/assets/index-Cox4QiNi.css` (33.86 kB), `dist/assets/index-CvymKjVy.js` (255.14 kB).
     - Execution succeeded with exit code 0 and 0 errors.
   - Executed `pnpm run type-check` (`turbo run type-check` -> `tsc --noEmit` across `@tazkiyah/shared` and `@tazkiyah/web`):
     - Completed with 0 type errors.

2. **Tooling & Styling Configuration**:
   - `apps/web/postcss.config.js`: Correctly exports `tailwindcss` and `autoprefixer` plugins.
   - `apps/web/tailwind.config.js`: Accurately scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`, customizes Islamic emerald brand scale (`brand-50` to `brand-950`), and configures clean typography.
   - `apps/web/vite.config.ts`: Configures `@vitejs/plugin-react` and sets development proxy from `/api` to `http://localhost:8000`.
   - `apps/web/src/index.css`: Defines glassmorphism (`glass-panel`, `glass-card`), emerald glow accents, and custom dark scrollbars.

3. **API Contracts & Type Definitions (`apps/web/src/types/api.ts`)**:
   - Full 1:1 parity with FastAPI schemas in `apps/api/app/schemas/`:
     - Account models: `AccountCreate`, `AccountResponse`, `AccountType` (`CASH`, `BANK`, `EMI`, `CREDIT`).
     - Envelope & ZBB models: `EnvelopeGroupCreate`, `EnvelopeGroupResponse`, `EnvelopeCreate`, `EnvelopeResponse`, `EnvelopeAssign`, `EnvelopeRebalance`, `RebalanceResponse`, `ZBBSummaryResponse`.
     - Transaction & Ledger models: `TransactionCreate`, `TransactionResponse`, `LineItemCreate`, `LineItemResponse`, `TransactionSource` (`WHATSAPP`, `WEB`, `MOBILE`).
     - CPI models: `CPITrendItem`, `PricePointResponse`.
     - Goal models: `GoalCreate`, `GoalResponse`, `GoalType`.

4. **API Service Client (`apps/web/src/services/api.ts`)**:
   - Clean native `fetch` implementation without bulky third-party HTTP wrappers.
   - Handles custom error parsing with `ApiClientError` (extracting backend `detail` fields).
   - Household bootstrapping & local storage persistence mechanism (`bootstrapHousehold`, `setActiveHouseholdId`, `getActiveHouseholdId`).

5. **Reactive State Hook (`apps/web/src/hooks/useDashboardData.ts`)**:
   - Multi-resource concurrent fetching with `Promise.all` across accounts, ZBB summary, envelope groups, transactions, CPI trends, goals, and overspent envelopes.
   - Individual catch handlers per endpoint to guarantee partial degraded operation rather than catastrophic total page crashes if one endpoint fails.
   - Live memoized calculations: `netLiquidWorth`, `totalCash`, `totalBank`, `totalEmi`, `totalCredit`, `unassignedCash`, `isZeroBalanced`.
   - Lifecycle cleanup with `isMounted` flag preventing state updates after unmount.

6. **UI Primitives (`apps/web/src/components/ui/`)**:
   - `Card.tsx`: Glassmorphic styled container with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`.
   - `Button.tsx`: Supports variants (`primary`, `emerald`, `secondary`, `outline`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`, `icon`), loading spinners, and forward refs.
   - `Modal.tsx`: Accessible dialog supporting `Escape` key listeners, backdrop clicks, and `document.body.style.overflow` scroll-locking with cleanup.
   - `Input.tsx` & `Select`: Prefix/suffix currency indicators (`PKR`), error message displays, helper texts, and forward refs.
   - `Badge.tsx`: Variant styles for statuses, account types (`cash`, `bank`, `emi`, `credit`), and transaction sources (`whatsapp`, `web`, `mobile`).
   - `ProgressBar.tsx`: Proportional progress bar with dynamic threshold colors (`emerald`, `blue`, `amber`, `rose`).
   - `Gauge.tsx`: Zero-dependency SVG arc meter for runway and emergency cushion visualization.
   - `Tabs.tsx`: Flexible tab switcher with segmented, underline, and pill variants.

7. **Feature Implementation (R5 - Liquid Accounts & Wallets Summary)**:
   - `AccountsSummary.tsx`:
     - Net Liquid Worth Hero Card (`PKR 275,000.00`) with breakdown by Bank, Wallets, and Cash.
     - Proportional asset allocation bar with division-by-zero guards.
     - Account cards styled per Pakistani banking & fintech institutions (Meezan Bank, Sadapay, Nayapay, Cash).
     - Overdrawn warning flags and border highlights when balance is negative or `is_overdrawn` is true.
   - `AddAccountModal.tsx`:
     - Quick preset buttons (`Meezan Bank`, `Sadapay`, `Nayapay`, `Wallet Cash`).
     - Validation for account name and numeric opening balance.
     - Submits real API mutation via `useDashboardData.createAccount`.

8. **Dashboard Shell Integration (`apps/web/src/App.tsx`)**:
   - Integrated Header with live Unassigned Cash indicator (`✓ Unassigned: PKR 0.00 (ZBB Balanced)` / `To Assign` / `Overassigned`).
   - Toast notification feedback system for user mutations.
   - Live wireframe previews for subsequent milestones (M3 Budget, M4 Ledger, M5 CPI & Goals).

---

## 2. Logic Chain

1. **Integrity & Authenticity**:
   - No mock facades or hardcoded return strings exist in `apps/web/src/services/api.ts` or `apps/web/src/hooks/useDashboardData.ts`.
   - State flows directly from the FastAPI backend through the typed client into React 19 state and re-renders components reactively upon mutation.

2. **React 19 Compatibility**:
   - Eliminating external canvas/charting libraries in favor of pure SVG components (`Gauge.tsx`, `ProgressBar.tsx`) eliminates React 19 peer dependency conflicts and ensures instant, lightweight client-side rendering.

3. **Domain Alignment with Project Scope**:
   - Deliverables fulfill every requirement for Milestone M2 as defined in `PROJECT.md` and R5 in `ORIGINAL_REQUEST.md`.

---

## 3. Adversarial Challenges & Edge Cases

### Challenge 1: Division by Zero on Zero Balance
- **Assumption**: Net liquid worth might be PKR 0 on fresh households with no accounts.
- **Audit**: In `AccountsSummary.tsx`:
  ```ts
  const cashShare = netLiquidWorth > 0 ? (totalCash / netLiquidWorth) * 100 : 0;
  const bankShare = netLiquidWorth > 0 ? (totalBank / netLiquidWorth) * 100 : 0;
  const emiShare = netLiquidWorth > 0 ? (totalEmi / netLiquidWorth) * 100 : 0;
  ```
- **Result**: PASSED. Safely returns `0%` without producing `NaN` or crashing React.

### Challenge 2: Floating-Point Tolerance on ZBB Balance Pill
- **Assumption**: Decimal fractions could cause `0.0000001` to appear as unbalanced.
- **Audit**: In `useDashboardData.ts` & `Header.tsx`:
  ```ts
  const isBalanced = Math.abs(unassignedCash) < 0.01;
  ```
- **Result**: PASSED. Correctly identifies balanced state within Pakistani rupee cent precision.

### Challenge 3: Network Disconnection / Partial API Failure
- **Assumption**: If one backend endpoint errors out, the entire dashboard could fail.
- **Audit**: `useDashboardData.ts` wraps all sub-requests inside `.catch(...)` returning default fallback arrays/objects, while populating a global banner with a "Retry Connection" button.
- **Result**: PASSED.

---

## 4. Caveats

1. **Subsequent Milestone Tabs**: In `App.tsx`, the Budget (M3), Ledger (M4), CPI (M5), and Goals (M5) tabs display preview wireframes populated with live data from the hook. Dedicated interactive features and modals for these views will be implemented in milestones M3 through M5.
2. **Backend Requirement**: Local interactive testing requires the FastAPI backend running on port 8000.

---

## 5. Conclusion

Milestone M2 meets all architectural, design, quality, and functional criteria. TypeScript type checking and production builds compile with 0 errors. All deliverables are approved for progression to Milestone M3 (Zero-Based Budget Allocation Table & Envelope Management).

**Final Verdict**: `APPROVE`

---

## 6. Verification Method

To independently verify this milestone:

1. **Type-Check Verification**:
   ```bash
   pnpm --filter @tazkiyah/web run type-check
   ```
   *Expected Result*: Exits 0 with 0 errors.

2. **Production Bundle Compilation**:
   ```bash
   pnpm --filter @tazkiyah/web run build
   ```
   *Expected Result*: Exits 0 and outputs production bundle in `apps/web/dist/`.

3. **Interactive Verification**:
   ```bash
   # Terminal 1 - API
   cd apps/api && uv run uvicorn app.main:app --port 8000
   
   # Terminal 2 - Web
   pnpm --filter @tazkiyah/web run dev
   ```
   - Open `http://localhost:5173`.
   - Verify Header, Accounts Summary, Hero Card (PKR 275,000.00), Account Cards (Meezan Bank, Sadapay, Nayapay, Wallet Cash), and Add Account modal.
