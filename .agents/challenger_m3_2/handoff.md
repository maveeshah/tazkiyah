# Milestone M3 Empirical Challenge Report: Mathematical Calculations & State Transitions

**Verdict**: `APPROVE`
**Challenger**: `challenger_m3_2` (Empirical Challenger)
**Target Milestone**: M3 — Zero-Based Budget Allocation Table & Envelope Management (R1)
**Scope**: `apps/web/src/features/budget/ZBBOverviewBar.tsx`, `apps/web/src/features/budget/BudgetTable.tsx`, `apps/web/src/features/budget/AssignIncomeModal.tsx`, `apps/web/src/features/budget/RebalanceModal.tsx`, `apps/web/src/components/ui/ProgressBar.tsx`, `apps/web/src/hooks/useDashboardData.ts`, and backend `apps/api/app/services/zbb_service.py`.

---

## 1. Observation

Direct code inspections, mathematical proofs, and command executions were conducted across the following components and service layers:

### A. Zero-Based Invariant & Hero Banner (`ZBBOverviewBar.tsx:43-73, 234-257`)
- **Invariant calculation**: `unassignedCash = totalInflow - totalAssigned`
- **Percentage calculations**:
  ```ts
  const assignedPercentage = totalInflow > 0 ? Math.min(Math.round((totalAssigned / totalInflow) * 100), 100) : 0;
  const spentPercentage = totalAssigned > 0 ? Math.min(Math.round((totalSpent / totalAssigned) * 100), 100) : 0;
  ```
- **State Partitioning**:
  - `isZeroBalanced`: `Math.abs(unassignedCash) < 0.01` (tolerance $\epsilon = 0.01\text{ PKR}$)
  - `isSurplus`: `unassignedCash >= 0.01`
  - `isDeficit`: `unassignedCash <= -0.01`

### B. Hierarchical Envelope Budget Table (`BudgetTable.tsx:71-118, 234-489`)
- **Group Subtotals**:
  ```ts
  const groupAssigned = group.envelopes.reduce((sum, env) => sum + (parseFloat(String(env.assigned_amount)) || 0), 0);
  const groupSpent = group.envelopes.reduce((sum, env) => sum + (parseFloat(String(env.spent_amount)) || 0), 0);
  const groupAvailable = groupAssigned - groupSpent;
  const groupOverspent = group.envelopes.filter((env) => (parseFloat(String(env.assigned_amount)) || 0) - (parseFloat(String(env.spent_amount)) || 0) < 0);
  ```
- **Row-level Available Balance**:
  `available = assigned - spent`
- **Spent Percentage Guard**:
  `const spentPercentage = assigned > 0 ? (spent / assigned) * 100 : spent > 0 ? 100 : 0;`
- **Progress Bar Component (`ProgressBar.tsx:24`)**:
  `const percentage = Math.min(Math.max((value / (max || 1)) * 100, 0), 100);`

### C. Assign Income Modal (`AssignIncomeModal.tsx:68-111, 146-159`)
- **Max Allowed Assignment**:
  `const maxAllowedAssignment = Math.max(0, currentAssigned + unassignedCash);`
- **Live Over-Allocation Constraint**:
  ```ts
  const numericValue = parseFloat(assignedAmount) || 0;
  const assignmentDelta = numericValue - currentAssigned;
  const isOverAllocating = assignmentDelta > unassignedCash + 0.001;
  ```
- **Live UI Feedback & Hard Submit Guard**:
  - Submit button disabled when `isOverAllocating === true`.
  - Submit handler throws validation error if `isOverAllocating === true` or `numAmount < 0`.
  - "Assign All Unassigned" sets `next = currentAssigned + Math.max(0, unassignedCash)`.

### D. Rebalance Modal (`RebalanceModal.tsx:114-125, 140-176`)
- **Transfer Limit**:
  `const isTransferExceeding = transferNum > sourceAssigned + 0.001;`
  `if (numAmount > sourceAssigned) { setError(...); return; }`
- **Deficit Cover Amount**:
  ```ts
  const targetAvailable = targetAssigned - targetSpent;
  const targetDeficit = targetAvailable < 0 ? Math.abs(targetAvailable) : 0;
  ```
  - "Cover Deficit Exactly" button automatically populates `amount = targetDeficit.toFixed(2)`.
- **Identity & Validity Guards**:
  - Rejects `fromEnvelopeId === toEnvelopeId`.
  - Rejects `transferNum <= 0` or `isNaN(transferNum)`.

### E. Build & Type Verification Execution
- **Type Check Command**: `pnpm run type-check`
  - Output: `Tasks: 2 successful, 2 total (Time: 1.638s, 0 errors)`
- **Production Build Command**: `pnpm run build`
  - Output: `dist/index.html (0.54 kB), dist/assets/index-BcYUgw7v.css (39.23 kB), dist/assets/index-DIbBIeBg.js (299.75 kB)` — `Tasks: 1 successful, 1 total (✓ built in 1.54s)`.

---

## 2. Logic Chain

1. **ZBB Hero Invariant Correctness**:
   - Total inflow sums all active account balances ($\sum \text{Account.current\_balance}$).
   - Total assigned sums all envelope assigned amounts ($\sum \text{Envelope.assigned\_amount}$).
   - Subtracting total assigned from total inflow yields unassigned cash pool.
   - When all cash is allocated, $\text{unassignedCash} = 0.00$, triggering equilibrium state (`isZeroBalanced`).
   - If total inflow is 0 or negative (overdrawn liquid accounts), zero-division ternary guards (`totalInflow > 0 ? ... : 0`) prevent `NaN` or `Infinity` from propagating to the UI.

2. **Hierarchical Group Aggregation Proof**:
   - For any group $G_k$ with envelopes $e_{k, 1}, e_{k, 2}, \dots, e_{k, m}$:
     $$\text{groupAssigned} = \sum_{j=1}^m \text{assigned}(e_{k, j})$$
     $$\text{groupSpent} = \sum_{j=1}^m \text{spent}(e_{k, j})$$
     $$\text{groupAvailable} = \text{groupAssigned} - \text{groupSpent} = \sum_{j=1}^m (\text{assigned}(e_{k, j}) - \text{spent}(e_{k, j})) = \sum_{j=1}^m \text{available}(e_{k, j})$$
   - Grand totals across all groups $\sum_k G_k$ accurately match both envelope-level sums and backend ZBB summary invariants.
   - Empty envelope groups ($m = 0$) evaluate to `0.00` assigned, `0.00` spent, `0.00` available without exception.

3. **Available Balance & Deficit Detection**:
   - Available balance $\text{avail} = \text{assigned} - \text{spent}$.
   - When $\text{avail} < 0$, `isOverspent` is flagged `true`, displaying the exact deficit $|\text{avail}|$ with rose-tinted alerts, and contextually toggling the table action button to "Cover".
   - When $\text{assigned} = 0$ and $\text{spent} > 0$, `spentPercentage` evaluates to `100%` and `ProgressBar` handles `max || 1` gracefully without division by zero.

4. **Max Allowed Assignment Invariant (`AssignIncomeModal`)**:
   - When reassigning an envelope, its current allocation $\text{currentAssigned}$ is already factored into $\text{totalAssigned}$.
   - Releasing or increasing this allocation changes total assigned by $\Delta = \text{newAssigned} - \text{currentAssigned}$.
   - The maximum funds available to this specific envelope is $\text{maxAllowed} = \text{currentAssigned} + \text{unassignedCash}$.
   - The validation check $\Delta \le \text{unassignedCash} + 0.001$ strictly preserves the system invariant that total assigned cannot exceed total liquid inflow.
   - Assigning all unassigned funds sets $\text{newAssigned} = \text{currentAssigned} + \text{unassignedCash}$, leaving exactly `0.00` unassigned cash pool.

5. **Transfer Limit & Deficit Coverage Invariant (`RebalanceModal`)**:
   - Inter-envelope rebalancing moves funds directly: $\text{from\_env.assigned} \leftarrow \text{from\_env.assigned} - \text{amount}$, $\text{to\_env.assigned} \leftarrow \text{to\_env.assigned} + \text{amount}$.
   - Since total assigned $\sum \text{Envelope.assigned}$ remains constant, the unassigned cash pool is invariant under rebalance operations ($\Delta \text{unassigned} = 0$).
   - The transfer ceiling $\text{amount} \le \text{from\_env.assigned}$ prevents negative envelope assignments in both frontend validation and backend FastAPI enforcement (`zbb_service.py:112`).
   - "Cover Deficit Exactly" sets $\text{amount} = |\text{to\_env.available}| = \text{to\_env.spent} - \text{to\_env.assigned}$, which upon execution leaves $\text{to\_env.available} = 0.00$, completely resolving overspending in a single action.

---

## 3. Caveats

- **Floating-point tolerances**: JavaScript uses IEEE-754 double-precision floats, whereas backend uses Python `Decimal("0.00")`. The frontend introduces an explicit $\epsilon = 0.001\text{ PKR}$ tolerance in inequality checks (`assignmentDelta > unassignedCash + 0.001`), preventing spurious rejection due to floating-point representation.
- **Illiquid assets**: Net liquid worth and ZBB inflow calculations intentionally filter by active liquid accounts (`Account.is_active == True`), matching standard envelope budgeting principles.

---

## 4. Conclusion

All mathematical formulas, invariant equations, zero-division guards, edge-case protections, and interactive state transitions implemented for Milestone M3 (Zero-Based Budget Allocation Table & Envelope Management) are mathematically sound, robust against boundary conditions, and fully integrated with the backend API.

**Explicit Verdict**: `APPROVE`

---

## 5. Verification Method

To independently verify this evaluation:

1. **Type Checking**:
   ```bash
   pnpm run type-check
   ```
   *Expected result*: Exit code 0, 0 TypeScript errors across `@tazkiyah/shared` and `@tazkiyah/web`.

2. **Production Bundle Verification**:
   ```bash
   pnpm run build
   ```
   *Expected result*: Clean Vite production build with zero warnings or errors.

3. **Key Source Inspections**:
   - Verify zero-division guards in `apps/web/src/features/budget/ZBBOverviewBar.tsx:66-67` and `apps/web/src/components/ui/ProgressBar.tsx:24`.
   - Verify group subtotal and available calculations in `apps/web/src/features/budget/BudgetTable.tsx:235-247`.
   - Verify max allowed assignment in `apps/web/src/features/budget/AssignIncomeModal.tsx:68, 109-110`.
   - Verify transfer limit and deficit cover amount in `apps/web/src/features/budget/RebalanceModal.tsx:120-124, 140-145, 171-176`.
