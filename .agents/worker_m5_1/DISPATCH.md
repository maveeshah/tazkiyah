## 2026-08-22T16:06:23Z

You are a teamwork_preview_worker for Milestone M5 (Personal CPI & Inflation Visualizer - R3 + Goals & Emergency Runway Tracker - R4).
Your working directory is: /home/mavee/tazkiyah/.agents/worker_m5_1
The project root is: /home/mavee/tazkiyah
The original user request is at: /home/mavee/tazkiyah/ORIGINAL_REQUEST.md
The project scope document is at: /home/mavee/tazkiyah/PROJECT.md
Parent conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own:
- `apps/web/src/components/charts/CPIChart.tsx`
- `apps/web/src/features/cpi/*`
  - `CPIVisualizer.tsx`
  - `StapleBasketGrid.tsx`
  - `MerchantPriceComparisonTable.tsx`
  - `index.ts`
- `apps/web/src/features/goals/*`
  - `GoalsTracker.tsx`
  - `EmergencyRunway.tsx`
  - `AddGoalModal.tsx`
  - `index.ts`
- `apps/web/src/App.tsx` (integration of CPI and Goals tabs into main dashboard)

MISSION & REQUIREMENTS:

Part 1: Personal CPI & Staple Inflation Visualizer (R3) (`apps/web/src/features/cpi/`):
1. `CPIChart.tsx` (`src/components/charts/`):
   - Zero-dependency, pure React 19 SVG multi-line/area time series chart.
   - X-axis: Chronological price point dates (May 2026, June 2026, July 2026, August 2026, etc.).
   - Y-axis: Unit Price in PKR with auto-scaling dynamic grid lines.
   - Interactive hover points with tooltip showing Date, Merchant, Unit Price in PKR, and standard unit.
   - Multi-item selector pills allowing users to toggle visible series (e.g. Potato, Milk, Eggs, Petrol, Flour, Cooking Oil).
2. `StapleBasketGrid.tsx`:
   - Grid of staple cards for all 10 tracked canonical items (`Potato`, `Milk`, `Eggs`, `Petrol`, `Flour`, `Cooking Oil`, `Onion`, `Tomato`, `Sugar`, `Rice`).
   - Each card displays: Staple Name, Category badge, Standard Unit (e.g. `kg`, `liter`, `dozen`), Current Unit Price in PKR, Previous Unit Price, and MoM Inflation Percentage badge (Rose for price increase e.g. `+9.09%`, Emerald for price drop/deflation, Slate for steady).
   - Inline mini sparkline or mini trend indicator.
   - Clicking a card focuses the historical price chart onto that item.
3. `MerchantPriceComparisonTable.tsx`:
   - Comparison table showing price history entries across vendors (`Imtiaz Super Market`, `Al-Fatah`, `Shell Fuel Station`, `Total Parco`, `Kolachi`, etc.).
   - Columns: Date, Staple Item, Merchant, Unit Price (PKR), Unit, Price Difference vs Average.
4. `CPIVisualizer.tsx`:
   - Master visualizer container combining CPI overview banner (Personal Inflation Rate average), `StapleBasketGrid`, `CPIChart`, and `MerchantPriceComparisonTable`.

Part 2: Financial Goals & Emergency Runway Tracker (R4) (`apps/web/src/features/goals/`):
1. `EmergencyRunway.tsx`:
   - Hero runway card featuring the SVG `Gauge` component showing liquid emergency runway in months:
     - Formula: $\text{Runway (Months)} = \frac{\text{Total Liquid Inflow}}{\text{Monthly Burn Rate}}$ (Monthly Burn Rate derived from Total Envelope Assigned or Total Spent).
     - Target milestone indicators: 1 month (Starter), 3 months (Basic), 6 months (Halal Financial Freedom Target), 12+ months (Fortress).
     - Status badges (e.g. "Healthy 5.5 Months Runway - Low Risk").
2. `GoalsTracker.tsx`:
   - Grid of financial goal cards (`Umrah 2027`, `Emergency Cushion`, `Vehicle Maintenance`, etc.).
   - Each card shows:
     - Goal Name & Goal Type Badge (`Target by Date`, `Target Cap`, `Sinking Fund`)
     - Linked Envelope Name (if linked)
     - Target Amount in PKR, Current Balance in PKR, and Remaining Amount
     - Animated visual `ProgressBar` with percentage completed
     - Dynamic Monthly Pacing indicator (`PKR X / month needed` from backend `monthly_pacing` field)
     - Target Date countdown (e.g. "Target: June 2027 • 10 months remaining")
   - "Add New Goal" button in header opening `AddGoalModal`.
3. `AddGoalModal.tsx`:
   - Modal form to create new goal: Name, Goal Type (`TARGET_BY_DATE`, `TARGET_CAP`, `SINKING_FUND`), Target Amount, Target Date (with date picker), Initial Balance, and optional Linked Envelope selector.
   - Calls `createGoal` mutation from `useDashboardData.ts`.

Part 3: Integration into `apps/web/src/App.tsx`:
- Replace placeholder under `activeView === 'cpi'` with `<CPIVisualizer />`.
- Replace placeholder under `activeView === 'goals'` with `<EmergencyRunway />` and `<GoalsTracker />`.

Part 4: Verification:
- Run `pnpm run type-check` (must pass with 0 errors).
- Run `pnpm run build` (must compile cleanly into `apps/web/dist/`).

DELIVERABLE:
Write a complete report to `/home/mavee/tazkiyah/.agents/worker_m5_1/handoff.md` detailing all implemented components, type check results, build results, and verification commands.

Send a message when your handoff is written.
