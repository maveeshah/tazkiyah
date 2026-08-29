# Review Handoff Report: Milestone M5 (Personal CPI & Inflation Visualizer - R3 + Goals & Emergency Runway Tracker - R4)

**Reviewer Role**: `teamwork_preview_reviewer` (Reviewer & Adversarial Critic)  
**Milestone**: M5  
**Final Verdict**: **`APPROVE`**

---

## 1. Observation

### Reviewed Deliverables & Exact Paths:
1. **`apps/web/src/components/charts/CPIChart.tsx`** (514 lines):
   - Pure React 19 SVG multi-line time series chart rendering with dynamic auto-scaling Y-axis grid lines (`yTicks`), chronological date alignment (`allDates`), hover guide lines, interactive floating tooltip with merchant, date, and unit price in PKR, and multi-series toggle pills.
   - Line 97–102: Handles edge case of single price point or constant price across history (`min === max`) by expanding range with $\pm 50$ buffer.
   - Line 145–149: Handles $N \le 1$ date points by centering $X$ coordinate (`padding.left + chartWidth / 2`) avoiding division-by-zero on `(allDates.length - 1)`.
2. **`apps/web/src/features/cpi/StapleBasketGrid.tsx`** (257 lines):
   - Card grid rendering all 10 canonical Pakistani staples (`Potato`, `Milk`, `Eggs`, `Petrol`, `Flour`, `Cooking Oil`, `Onion`, `Tomato`, `Sugar`, `Rice`).
   - Line 54–120: Inline SVG mini sparklines with gradient area fills for trend visualization.
   - Line 206–227: Month-over-Month (MoM) inflation rate badges (Rose `+X%` for inflation, Emerald `-X%` for deflation, Slate for steady, and "No trend" fallback).
3. **`apps/web/src/features/cpi/MerchantPriceComparisonTable.tsx`** (353 lines):
   - Flattened historical price points across Pakistani merchants (`Imtiaz Super Market`, `Al-Fatah`, `Shell Fuel Station`, `Total Parco`, `PSO Clifton`, `Aghas Supermarket`, `Metro Cash & Carry`).
   - Search filter by vendor/staple, staple dropdown selector, sort by date/price/difference vs baseline average, and relative price discrepancy calculations (`+/- PKR` and `+/- %`).
4. **`apps/web/src/features/cpi/CPIVisualizer.tsx`** (239 lines):
   - Container component combining Personal Inflation Rate hero banner (household basket average MoM inflation rate, highest spike item, most stable item, price point log count), `StapleBasketGrid`, `CPIChart`, and `MerchantPriceComparisonTable`.
5. **`apps/web/src/features/cpi/index.ts`** (4 lines):
   - Barrel exports for all CPI visualizer components.
6. **`apps/web/src/features/goals/EmergencyRunway.tsx`** (399 lines):
   - Liquid runway hero card featuring the SVG `Gauge` component:
     $$\text{Runway (Months)} = \frac{\text{Net Liquid Capital}}{\text{Monthly Essential Living Burn Rate}}$$
   - Line 50–90: Dynamically derives essential living burn from living envelope assignments (excluding savings/sinking groups).
   - Line 93–96: Guards against zero/negative burn rates: `if (essentialMonthlyBurn <= 0) return 0;`.
   - Line 114–148: 1-month (Starter Cushion), 3-month (Basic Security), 6-month (Halal Financial Freedom Sunnah Standard), and 12-month (Fortress Runway) milestone progression cards with individual progress bars.
   - Line 99–111: Survival horizon date projection (e.g. funds sustain through future date without additional income).
7. **`apps/web/src/features/goals/GoalsTracker.tsx`** (363 lines):
   - Financial goal cards grid (`Umrah 2027`, `Emergency Cushion`, `Vehicle Maintenance`, etc.).
   - Goal type badges (`Target by Date`, `Target Cap`, `Sinking Fund`), linked envelope indicators, target amount, current balance, remaining amount, animated `ProgressBar`, dynamic monthly pacing indicator (`monthly_pacing` from backend), and target date countdown (e.g. `10 months remaining`).
   - Aggregate statistics banner (Total Target Capital, Total Accumulated, Remaining Funding Gap, Active Portfolios).
8. **`apps/web/src/features/goals/AddGoalModal.tsx`** (250 lines):
   - Modal form with Goal Name, Goal Type selector (`TARGET_BY_DATE`, `TARGET_CAP`, `SINKING_FUND`), Target Amount (PKR), Target Date, Initial Current Balance, and Linked Envelope selector.
9. **`apps/web/src/features/goals/index.ts`** (4 lines):
   - Barrel exports for all goals components.
10. **`apps/web/src/App.tsx`** (429 lines):
    - Integrated `<CPIVisualizer />` under `activeView === 'cpi'`.
    - Integrated `<EmergencyRunway />` and `<GoalsTracker />` under `activeView === 'goals'`.
    - Connected `createGoal` mutation handler and mounted `<AddGoalModal />`.
    - Integrated toast notifications for user feedback on all operations.

### Build and Type-Check Tool Outputs:
- **`pnpm run type-check`**:
```
> turbo run type-check
• turbo 2.10.11
   • Packages in scope: @tazkiyah/shared, @tazkiyah/web
   • Running type-check in 2 packages
@tazkiyah/web:type-check: > tsc --noEmit
@tazkiyah/shared:type-check: > tsc --noEmit
 Tasks:    2 successful, 2 total
Cached:   2 cached, 2 total
```
- **`pnpm run build`**:
```
> turbo run build
• turbo 2.10.11
   • Packages in scope: @tazkiyah/shared, @tazkiyah/web
   • Running build in 2 packages
@tazkiyah/web:build: > tsc && vite build
@tazkiyah/web:build: vite v6.4.3 building for production...
@tazkiyah/web:build: ✓ 1852 modules transformed.
@tazkiyah/web:build: dist/index.html                   0.54 kB │ gzip:   0.36 kB
@tazkiyah/web:build: dist/assets/index-CqH7NzEE.css   48.17 kB │ gzip:   8.42 kB
@tazkiyah/web:build: dist/assets/index-CI59hLQw.js   393.53 kB │ gzip: 103.89 kB
@tazkiyah/web:build: ✓ built in 1.75s
 Tasks:    1 successful, 1 total
```

---

## 2. Logic Chain

1. **Evaluation Criterion 1: API Schema Parity**
   - Verified `GoalCreate` schema in `apps/api/app/schemas/goal.py` (fields: `household_id: UUID`, `envelope_id: Optional[UUID]`, `name: str`, `goal_type: GoalType`, `target_amount: Decimal`, `target_date: Optional[date]`, `current_balance: Decimal`).
   - Verified `GoalCreate` interface in `apps/web/src/types/api.ts` and dispatch payload in `apps/web/src/features/goals/AddGoalModal.tsx` (`name`, `goal_type`, `target_amount`, `target_date`, `current_balance`, `envelope_id`).
   - Verified `CPITrendItem` schema in `apps/api/app/schemas/cpi.py` and consumption across `CPIChart.tsx`, `StapleBasketGrid.tsx`, and `MerchantPriceComparisonTable.tsx`.
   - Invariant holds: 100% schema alignment across frontend and backend models.

2. **Evaluation Criterion 2: Error Handling & UX Stress Testing**
   - **Empty Goals List (`goals: []`)**: `GoalsTracker.tsx` gracefully renders aggregate statistics (PKR 0.00, 0 active goals) and an empty grid without runtime exceptions or divide-by-zero crashes.
   - **0 Burn Rate Runway Protection**: `EmergencyRunway.tsx` implements explicit fallback logic (`essentialMonthlyBurn <= 0` guard, default living envelope baseline, and `runwayMonths = 0` protection), preventing `NaN` or `Infinity` in the `Gauge` or milestone progress bars.
   - **Single / Zero Price Point CPI Items**: `CPIChart.tsx` explicitly guards zero-spread Y-axis scaling (`min === max`) with padding buffers and centers single-date time series without dividing by zero on `(allDates.length - 1)`. `StapleBasketGrid.tsx` suppresses sparklines when fewer than 2 price points exist.
   - **Toast Notifications**: `App.tsx` provides immediate visual confirmation for all mutations (`createGoal`, `createAccount`, `assignBudget`, `rebalanceEnvelopes`, `logTransaction`, and `refresh`) with auto-dismissal and manual close controls.

3. **Evaluation Criterion 3: Verification**
   - Executed `pnpm run type-check` with 0 TypeScript compilation errors across monorepo packages.
   - Executed `pnpm run build` with Vite producing an optimized production bundle in `apps/web/dist/`.

4. **Integrity & Quality Assessment**
   - Verified absence of hardcoded dummy facades or bypassed implementations: charts and gauges use dynamic SVG coordinate calculations; data flows genuinely through `useDashboardData` and `/api/v1` endpoints.

---

## 3. Caveats

- Date countdown arithmetic uses standard calendar month offsets against client timestamp; historical mock time series data spans May to August 2026.
- No caveats regarding milestone deliverables, code correctness, or contract parity.

---

## 4. Conclusion

**Verdict: `APPROVE`**

Milestone M5 deliverables (`apps/web/src/features/cpi/*`, `apps/web/src/features/goals/*`, and `apps/web/src/App.tsx`) meet all specification criteria defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`. The implementation demonstrates robust schema parity with FastAPI endpoints, resilient edge-case handling, pure React 19 SVG data visualization, and zero compilation errors.

---

## 5. Verification Method

To independently reproduce and verify this review:
1. **Type Checking**:
   ```bash
   pnpm run type-check
   ```
   *Expected output*: `Tasks: 2 successful, 2 total` (0 errors in `@tazkiyah/shared` and `@tazkiyah/web`).
2. **Production Bundle Build**:
   ```bash
   pnpm run build
   ```
   *Expected output*: Vite transforms and emits production bundle into `apps/web/dist/`.
3. **Inspect Component Contracts**:
   - `apps/web/src/components/charts/CPIChart.tsx`
   - `apps/web/src/features/cpi/StapleBasketGrid.tsx`
   - `apps/web/src/features/cpi/MerchantPriceComparisonTable.tsx`
   - `apps/web/src/features/cpi/CPIVisualizer.tsx`
   - `apps/web/src/features/goals/EmergencyRunway.tsx`
   - `apps/web/src/features/goals/GoalsTracker.tsx`
   - `apps/web/src/features/goals/AddGoalModal.tsx`
   - `apps/web/src/App.tsx`
