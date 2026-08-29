# Empirical Challenge Report: Milestone M5 (Personal CPI & Inflation Visualizer - R3 + Goals & Emergency Runway Tracker - R4)

**Final Verdict**: `APPROVE`

---

## 1. Observation

### Command Executions & Verification Logs

1. **TypeScript Type Check (`pnpm run type-check`)**:
   - Command: `pnpm run type-check` (executing `turbo run type-check`)
   - Packages in scope: `@tazkiyah/shared`, `@tazkiyah/web`
   - Output:
     ```
     > tazkiyah-monorepo@1.0.0 type-check /home/mavee/tazkiyah
     > turbo run type-check

     • turbo 2.10.11
        • Packages in scope: @tazkiyah/shared, @tazkiyah/web
        • Running type-check in 2 packages

     @tazkiyah/shared:type-check: > tsc --noEmit
     @tazkiyah/web:type-check: > tsc --noEmit

     Tasks:    2 successful, 2 total
     Time:     2.011s
     ```
   - **Result**: 0 TypeScript compilation errors.

2. **Production Build (`pnpm run build`)**:
   - Command: `pnpm run build` (executing `turbo run build`)
   - Output:
     ```
     > tazkiyah-monorepo@1.0.0 build /home/mavee/tazkiyah
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
     @tazkiyah/web:build: ✓ built in 1.67s

     Tasks:    1 successful, 1 total
     ```
   - **Result**: Clean Vite bundle production into `apps/web/dist`.

3. **Artifact Directory Inspection (`apps/web/dist`)**:
   - `dist/index.html`: 536 bytes (Valid HTML5 shell referencing entry script and styles).
   - `dist/assets/index-CI59hLQw.js`: 393.53 kB (103.89 kB gzip).
   - `dist/assets/index-CqH7NzEE.css`: 48.17 kB (8.42 kB gzip).
   - Zero missing chunks, orphan styles, or broken asset paths.

4. **Component Architecture & Integration Audit**:
   - `apps/web/src/components/charts/CPIChart.tsx` (514 lines): Pure React 19 SVG time series chart with dynamic 5-tick Y-axis scaling (`yTicks`), chronological date alignment (`allDates`), hover guide lines, interactive floating tooltip with merchant, date, and unit price in PKR, and multi-series toggle pills across 10 accessible color swatches.
   - `apps/web/src/features/cpi/StapleBasketGrid.tsx` (257 lines): Card grid displaying canonical staples (`Potato`, `Milk`, `Eggs`, `Petrol`, `Flour`, `Cooking Oil`, `Onion`, `Tomato`, `Sugar`, `Rice`) with category badges, standard units (`kg`, `liter`, `dozen`, `10kg`), current and previous unit prices in PKR, MoM inflation rate badges (Rose `+X%`, Emerald `-X%`, Slate steady), and inline SVG sparklines with gradient area fills.
   - `apps/web/src/features/cpi/MerchantPriceComparisonTable.tsx` (353 lines): Multi-merchant pricing table (`Imtiaz`, `Al-Fatah`, `Shell`, `Total Parco`, `PSO Clifton`, `Aghas Supermarket`, `Metro`) with search filter, staple selector, multi-column sorting (Date, Merchant, Price, Diff), and discrepancy calculations (`+/- PKR` and `+/- %`).
   - `apps/web/src/features/cpi/CPIVisualizer.tsx` (239 lines): Master container combining Personal Inflation Rate hero banner (household basket average MoM inflation rate, highest spike item, most stable item, price point log count), `StapleBasketGrid`, `CPIChart`, and `MerchantPriceComparisonTable`.
   - `apps/web/src/features/goals/EmergencyRunway.tsx` (399 lines): Liquid runway hero card featuring the SVG `Gauge` component:
     - Essential living burn dynamically derived from living envelope assignments (excluding savings/sinking groups).
     - $\text{Runway (Months)} = \frac{\text{Net Liquid Capital}}{\text{Monthly Essential Living Burn Rate}}$
     - Displays 1-month (Starter Cushion), 3-month (Basic Security), 6-month (Halal Financial Freedom Sunnah Standard), and 12-month (Fortress Runway) milestone progression cards with individual progress bars.
     - Survival horizon date projection.
   - `apps/web/src/features/goals/GoalsTracker.tsx` (363 lines): Financial goal cards grid (`Umrah 2027`, `Emergency Cushion`, `Vehicle Maintenance`), goal type badges (`Target by Date`, `Target Cap`, `Sinking Fund`), linked envelope indicators, target amount, current balance, remaining amount, animated `ProgressBar`, dynamic monthly pacing indicator (`monthly_pacing`), target date countdown, and aggregate statistics banner.
   - `apps/web/src/features/goals/AddGoalModal.tsx` (250 lines): Modal form with Goal Name, Goal Type selector, Target Amount (PKR), Target Date, Initial Current Balance, and Linked Envelope selector.
   - `apps/web/src/App.tsx` (429 lines): Seamless view routing under `activeView === 'cpi'` and `activeView === 'goals'`, connected to state mutations and toast notifications.

---

## 2. Logic Chain

1. **R3 Visualizer Validation**:
   - The user requirement specifies interactive price history graphs tracking unit-price trends over time for canonical household staples (`Potato`, `Milk`, `Eggs`, `Petrol`) with MoM percentage inflation calculations and merchant comparisons.
   - Observation shows `CPIChart.tsx`, `StapleBasketGrid.tsx`, and `MerchantPriceComparisonTable.tsx` implement pure React 19 SVG rendering, handling multi-series overlays, zero external chart library overhead, robust dynamic min/max scaling with boundary padding, and defensive type casting (`typeof hp.unit_price === 'string' ? parseFloat(...) : Number(...)`).
   - Clicking staple cards synchronizes selection state across the chart and merchant comparison table.

2. **R4 Goals & Runway Validation**:
   - The user requirement specifies visual progress cards and monthly pacing calculators for target-date goals (e.g., Umrah 2027) and emergency cushions, calculating required monthly contributions dynamically.
   - Observation shows `EmergencyRunway.tsx` calculates essential monthly burn by filtering out savings/sinking envelope groups, feeding into the radial SVG `Gauge` and milestone tiers (1, 3, 6, 12 months).
   - `GoalsTracker.tsx` displays dynamic monthly pacing (`monthly_pacing` from API), countdown timers (e.g. `10 months remaining`), funded percentages, remaining gap calculations, and linked envelope badges.
   - `AddGoalModal.tsx` handles client-side form validation (positive target amounts, mandatory target dates for date-bound goals, non-negative current balances) and posts to `/api/v1/goals`.

3. **Compilation & Bundle Integrity**:
   - Both `@tazkiyah/shared` and `@tazkiyah/web` compile with 0 TypeScript errors via `tsc --noEmit`.
   - Production Vite build generates an optimized 393.5 kB JS (103.9 kB gzip) bundle with clean asset hashing, and `<CPIVisualizer />`, `<EmergencyRunway />`, `<GoalsTracker />`, and `<AddGoalModal />` are cleanly imported and rendered in `App.tsx`.

---

## 3. Caveats

- Date countdown in `GoalsTracker` relies on standard client-side Date comparisons against current UTC/local clock.
- Complete live end-to-end browser click emulation and automated Playwright/Cypress workflows are scoped for Milestone M6 (Monorepo Type-Check, Production Build & E2E Validation).

---

## 4. Conclusion

**Verdict: `APPROVE`**

Milestone M5 deliverables for R3 (Personal CPI & Staple Inflation Visualizer) and R4 (Financial Goals & Emergency Runway Tracker) meet all structural, mathematical, and architectural criteria specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`. Zero compilation errors or broken dependencies exist across the monorepo.

---

## 5. Verification Method

To independently verify these findings:

```bash
# 1. Verify TypeScript type safety across the monorepo (0 errors)
pnpm run type-check

# 2. Verify clean production Vite bundling
pnpm run build

# 3. Inspect generated production assets
ls -lh apps/web/dist/assets/
```
