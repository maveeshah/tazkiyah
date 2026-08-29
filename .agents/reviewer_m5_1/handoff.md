# Quality & Adversarial Review Report: Milestone M5

**Target Deliverables**:
- `apps/web/src/components/charts/CPIChart.tsx`
- `apps/web/src/components/ui/Gauge.tsx`
- `apps/web/src/features/cpi/*` (`CPIVisualizer.tsx`, `StapleBasketGrid.tsx`, `MerchantPriceComparisonTable.tsx`, `index.ts`)
- `apps/web/src/features/goals/*` (`GoalsTracker.tsx`, `EmergencyRunway.tsx`, `AddGoalModal.tsx`, `index.ts`)
- `apps/web/src/App.tsx`

**Verdict**: **APPROVE**

---

## 1. Observation

### Build & Type-Check Execution:
1. **Production Build (`pnpm run build --force`)**:
   ```
   > turbo run build --force
   • Packages in scope: @tazkiyah/shared, @tazkiyah/web
   • Running build in 2 packages
   @tazkiyah/web:build: > tsc && vite build
   @tazkiyah/web:build: vite v6.4.3 building for production...
   @tazkiyah/web:build: ✓ 1852 modules transformed.
   @tazkiyah/web:build: dist/index.html                   0.54 kB │ gzip:   0.36 kB
   @tazkiyah/web:build: dist/assets/index-CqH7NzEE.css   48.17 kB │ gzip:   8.42 kB
   @tazkiyah/web:build: dist/assets/index-CI59hLQw.js   393.53 kB │ gzip: 103.89 kB
   @tazkiyah/web:build: ✓ built in 1.75s
   Tasks: 1 successful, 1 total
   ```
2. **TypeScript Compilation (`pnpm run type-check`)**:
   - Zero TypeScript compilation errors across `@tazkiyah/shared` and `@tazkiyah/web`.

### Code & Component Verification:
1. **`apps/web/src/components/charts/CPIChart.tsx`**:
   - Implements pure React 19 SVG rendering (zero 3rd-party charting library dependencies).
   - Generates `<svg>`, `<defs>`, `<linearGradient>`, `<line>`, `<path>`, `<circle>`, `<text>` elements.
   - Dynamic auto-scaling Y-axis (`yTicks`) with 10% padding to prevent clipping of peak and trough values.
   - Dynamic chronological date alignment (`allDates`) with normalized X-coordinates (`getX`).
   - Interactive hover tracking with vertical dotted guide lines, pulsing radial hit zones (`r=14` hit area, `r=8` pulse), and floating backdrop-blur tooltip displaying staple name, date, unit price in PKR, unit, and merchant vendor.
   - 10 distinct color palettes (`SERIES_COLORS`) with multi-series toggle pills, "All" and "Reset" selectors.
2. **`apps/web/src/components/ui/Gauge.tsx`**:
   - Pure React 19 SVG semi-circle arc gauge using polar-to-cartesian trigonometry (`describeArc`, `polarToCartesian`).
   - Clamps values safely `[min, max]`, with dynamic status badge coloring across danger (`#f43f5e`), warning (`#f59e0b`), safe (`#0ea5e9`), and optimal (`#10b981`).
3. **`apps/web/src/features/cpi/StapleBasketGrid.tsx`**:
   - Renders 10 canonical staple cards (`Potato`, `Milk`, `Eggs`, `Petrol`, `Flour`, `Cooking Oil`, `Onion`, `Tomato`, `Sugar`, `Rice`).
   - Includes inline SVG mini sparklines with gradient area fills (`renderSparkline`), previous and current unit prices in PKR, and MoM inflation rate badges (Rose `+X%` for inflation, Emerald `-X%` for deflation).
4. **`apps/web/src/features/cpi/MerchantPriceComparisonTable.tsx`**:
   - Flattens all historical price points across Pakistani vendors (`Imtiaz Super Market`, `Al-Fatah`, `Shell Fuel Station`, `Total Parco`, `PSO Clifton`, `Aghas Supermarket`, `Metro Cash & Carry`).
   - Computes dynamic baseline item averages in-memory (`averagePriceForItem`), calculating exact monetary and percentage discrepancies (`+/- PKR` and `+/- %`).
   - Multi-field sorting (Date, Staple Item, Merchant, Unit Price, Diff vs Average) and text search filter.
5. **`apps/web/src/features/cpi/CPIVisualizer.tsx`**:
   - Master container displaying household basket average MoM inflation hero banner, highest inflation spike item, most stable item, total price points log count, linked to `StapleBasketGrid`, `CPIChart`, and `MerchantPriceComparisonTable`.
6. **`apps/web/src/features/goals/EmergencyRunway.tsx`**:
   - Computes Monthly Essential Living Burn Rate dynamically by separating living envelope assignments from savings/sinking groups.
   - Calculates liquid runway: $\text{Runway (Months)} = \frac{\text{Net Liquid Worth}}{\text{Monthly Essential Living Burn Rate}}$.
   - Displays radial SVG `Gauge`, survival horizon date projection, and 4 progressive milestone cushion cards (1-month Starter Cushion, 3-month Basic Security, 6-month Halal Financial Freedom Sunnah Standard, 12-month Fortress Runway).
7. **`apps/web/src/features/goals/GoalsTracker.tsx` & `AddGoalModal.tsx`**:
   - Displays goal cards with target amount, current balance, dynamic `ProgressBar`, linked envelope badges, target date countdowns, and dynamic `monthly_pacing` calculated by the backend.
   - `AddGoalModal` provides full modal creation form wired to `createGoal` mutation in `App.tsx`.
8. **`apps/web/src/App.tsx`**:
   - Integrates `<CPIVisualizer />` under `activeView === 'cpi'`.
   - Integrates `<EmergencyRunway />` and `<GoalsTracker />` under `activeView === 'goals'`.

---

## 2. Logic Chain

1. **Integrity & Authenticity**:
   - Code inspection reveals zero mock facade bypasses or hardcoded test returns. All components dynamically transform real backend JSON models (`CPITrendItem`, `PricePointResponse`, `GoalResponse`, `ZBBSummaryResponse`, `EnvelopeGroupResponse`).
2. **Pure React 19 SVG Rendering**:
   - Verified that `CPIChart.tsx`, `Gauge.tsx`, and `StapleBasketGrid.tsx` use native SVG markup without external libraries like Recharts, Chart.js, or D3.
3. **Mathematical Correctness & Boundary Safety**:
   - *Empty Data Safeguards*: `CPIChart` gracefully falls back to default limits if series or price points are empty (`min = 0, max = 1000`), avoiding division-by-zero errors.
   - *Identical Price Handling*: If minimum and maximum prices are identical, `CPIChart` applies synthetic padding ($\pm 50$) to ensure valid Y-scale denominator.
   - *Single Price Point*: If only one date is recorded, `getX` centers the point horizontally without throwing errors.
   - *Burn Rate Zero Floor*: If essential burn rate is zero, `EmergencyRunway` safely sets `runwayMonths = 0` and avoids `Infinity`.
4. **End-to-End Monorepo Build**:
   - Production bundle compiled in 1.75s with zero errors or bundle warnings.

---

## 3. Caveats

- **Date Localization**: Tooltips and countdown strings use browser locale formatting with fallback to ISO dates.
- **Envelope Classification**: `EmergencyRunway` categorizes envelopes with names containing 'savings', 'sinking', 'goals', or 'invest' as non-burn allocations. User-defined custom envelope groups outside these names will default to essential living expenditure, which is a conservative (safe) approach for runway calculation.

---

## 4. Conclusion

Milestone M5 deliverables fully satisfy all requirements for R3 (Personal CPI & Staple Inflation Visualizer) and R4 (Goals & Emergency Runway Tracker). The codebase exhibits clean architectural separation, robust error handling, pure SVG rendering, and complete TypeScript type safety.

**Explicit Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify this milestone:
1. Run `pnpm run build --force` in `/home/mavee/tazkiyah` (confirms clean Vite bundle compilation).
2. Run `pnpm run type-check` in `/home/mavee/tazkiyah` (confirms 0 TypeScript errors).
3. Inspect `apps/web/src/components/charts/CPIChart.tsx` and `apps/web/src/components/ui/Gauge.tsx` for pure React 19 SVG implementation.
