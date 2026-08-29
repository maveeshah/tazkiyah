# Milestone M2 Empirical Challenger Report

**Challenger**: `challenger_m2_2`  
**Milestone**: M2 (Frontend Foundation, API Client, UI Primitives & Liquid Accounts Summary)  
**Parent Conversation ID**: `39560258-203d-400a-9860-b8fa3cd3d4a7`  
**Verdict**: **`APPROVE`**  
**Date**: 2026-08-22  

---

## 1. Observation

Direct code and artifact observations conducted across `apps/web/`:

1. **Net Liquid Worth Calculation (`apps/web/src/hooks/useDashboardData.ts:229-236`)**:
   ```typescript
   const netLiquidWorth = useMemo(() => {
     return accounts
       .filter((a) => a.is_active)
       .reduce((sum, a) => {
         const bal = typeof a.current_balance === 'string' ? parseFloat(a.current_balance) : Number(a.current_balance);
         return sum + (isNaN(bal) ? 0 : bal);
       }, 0);
   }, [accounts]);
   ```
   - Filters strictly for `a.is_active === true`.
   - Handles both string-serialized Decimals (e.g. `"180000.00"`) and JavaScript numbers (`180000`).
   - Includes fallback `isNaN(bal) ? 0 : bal` guarding against invalid data inputs.

2. **Categorical Liquid Totals (`apps/web/src/hooks/useDashboardData.ts:238-260`)**:
   - `totalCash`: Filters `a.is_active && a.type === 'CASH'`, sums current balances.
   - `totalBank`: Filters `a.is_active && a.type === 'BANK'`, sums current balances.
   - `totalEmi`: Filters `a.is_active && a.type === 'EMI'`, sums current balances (e.g. Sadapay, Nayapay).
   - `totalCredit`: Filters `a.is_active && a.type === 'CREDIT'`, sums balances.

3. **Asset Allocation & Percentage Calculations (`apps/web/src/features/accounts/AccountsSummary.tsx:170-172`)**:
   ```typescript
   const cashShare = netLiquidWorth > 0 ? (totalCash / netLiquidWorth) * 100 : 0;
   const bankShare = netLiquidWorth > 0 ? (totalBank / netLiquidWorth) * 100 : 0;
   const emiShare = netLiquidWorth > 0 ? (totalEmi / netLiquidWorth) * 100 : 0;
   ```
   - **Zero-Division & Negative Guard**: The predicate `netLiquidWorth > 0` prevents `0 / 0` (which would produce `NaN`) and negative net worth division (which would produce negative or inverted percentages).
   - If `netLiquidWorth <= 0`, all percentage shares evaluate strictly to `0`.

4. **Overdrawn Trigger & Visual Indicators (`apps/web/src/features/accounts/AccountsSummary.tsx:328-382`)**:
   ```typescript
   const balanceNum =
     typeof account.current_balance === 'string'
       ? parseFloat(account.current_balance)
       : Number(account.current_balance);
   const isOverdrawn = account.is_overdrawn || balanceNum < 0;
   ```
   - Evaluates to `true` if backend sets `is_overdrawn === true` OR if `balanceNum < 0`.
   - When overdrawn:
     - Applies high-contrast rose alert border: `border-rose-600/80 shadow-rose-950/40`.
     - Displays `Overdrawn` badge with `<AlertTriangle className="w-3 h-3" />`.
     - Highlights numeric balance text in rose: `text-rose-400`.

5. **Zero-Based Budget Status & Epsilon Tolerance (`apps/web/src/hooks/useDashboardData.ts:268-270` & `Header.tsx:35-36`)**:
   - `isZeroBalanced`: `Math.abs(unassignedCash) < 0.01` handles floating-point precision differences gracefully.
   - Header visual pill switches dynamically:
     - Balanced (`|unassigned| < 0.01`): `Unassigned: PKR 0.00 (ZBB Balanced)` (Emerald).
     - Surplus (`unassigned > 0.01`): `To Assign: PKR X.XX` (Amber).
     - Deficit (`unassigned < -0.01`): `Overassigned: PKR X.XX` (Rose).

6. **UI Component Defensive Math**:
   - `ProgressBar.tsx:24`: `(value / (max || 1)) * 100` prevents zero-division if max target is 0, clamped cleanly to `[0, 100]`.
   - `Gauge.tsx:30-31`: `Math.min(Math.max(value, min), max)` and `(normalizedValue - min) / (max - min)` prevents out-of-bounds rendering.

7. **Production Build Artifacts**:
   - Built files verified present in `apps/web/dist/` (`dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`).

---

## 2. Logic Chain

1. **Active Filtering Parity**:
   - Both the aggregate calculations in `useDashboardData.ts` and the UI card render mapping in `AccountsSummary.tsx` strictly filter `is_active === true`. Inactive or archived accounts do not pollute liquid net worth or hero metrics.

2. **Mathematical Robustness & Zero-Division Invariants**:
   - Scenario A: `netLiquidWorth = 0` (e.g. empty account list or all balances 0).
     - `netLiquidWorth > 0` returns `false` -> `cashShare = 0`, `bankShare = 0`, `emiShare = 0`.
     - The allocation bar conditions `{bankShare > 0 && <div ... />}`, etc., ensure no broken CSS elements (`width: 0%` or `width: NaN%`) are rendered.
   - Scenario B: Standard demo seed data (Meezan: 180k, Sadapay: 40k, Nayapay: 30k, Cash: 25k -> Total = 275k).
     - `bankShare = (180000 / 275000) * 100 = 65.45%` (rendered as `65.5%` / `65%`).
     - `emiShare = (70000 / 275000) * 100 = 25.45%` (rendered as `25.5%` / `25%`).
     - `cashShare = (25000 / 275000) * 100 = 9.09%` (rendered as `9.1%` / `9%`).
     - Sum = 100.00%.

3. **Overdrawn State Handling**:
   - When an account balance drops below 0 (e.g. `-500.00`), `balanceNum < 0` triggers `isOverdrawn = true` regardless of whether the API response already computed the boolean flag.

4. **Type-Safety & Backend Schema Alignment**:
   - `apps/web/src/types/api.ts` maps all backend models (`AccountResponse`, `ZBBSummaryResponse`, `EnvelopeGroupResponse`, `TransactionResponse`, `CPITrendItem`, `GoalResponse`) in exact snake_case schema.

---

## 3. Caveats

- **Runtime API Connection**: Live end-to-end browser workflows require the FastAPI server running on port 8000 with CORS/proxy configuration.
- **Milestone Preview Views**: The Budget, Ledger, CPI, and Goals tabs in `App.tsx` render live previews from the seeded dashboard hook to provide context while their dedicated feature modules are completed in Milestones M3-M5.

---

## 4. Conclusion

**Verdict: `APPROVE`**

Milestone M2 meets all mathematical, architectural, and visual requirements:
- Net Liquid Worth correctly aggregates active liquid accounts.
- Percentage and share calculations are protected against zero-division and negative bounds.
- Overdrawn account balances trigger warning states accurately.
- Pure React 19 UI primitives and Pakistani fintech/banking themes (Meezan Bank, Sadapay, Nayapay, Cash) are cleanly styled and integrated.

---

## 5. Verification Method

To independently re-verify:

1. **TypeScript Type-Check**:
   ```bash
   pnpm --filter @tazkiyah/web run type-check
   ```
2. **Production Build**:
   ```bash
   pnpm --filter @tazkiyah/web run build
   ```
3. **Inspect Core Math & Components**:
   - `apps/web/src/hooks/useDashboardData.ts` (lines 228-271)
   - `apps/web/src/features/accounts/AccountsSummary.tsx` (lines 158-174, 328-382)
   - `apps/web/src/components/ui/ProgressBar.tsx` (line 24)
   - `apps/web/src/components/ui/Gauge.tsx` (lines 30-32)
