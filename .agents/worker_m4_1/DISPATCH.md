## 2026-08-22T15:54:07Z
You are a teamwork_preview_worker for Milestone M4 (Granular Line-Item Transaction Explorer & Receipt Breakdown - R2).
Your working directory is: /home/mavee/tazkiyah/.agents/worker_m4_1
The project root is: /home/mavee/tazkiyah
The original user request is at: /home/mavee/tazkiyah/ORIGINAL_REQUEST.md
The project scope document is at: /home/mavee/tazkiyah/PROJECT.md
Parent conversation ID: 39560258-203d-400a-9860-b8fa3cd3d4a7

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own:
- `apps/web/src/features/ledger/*`
  - `TransactionLedger.tsx`
  - `ReceiptDetail.tsx`
  - `LedgerFilterBar.tsx`
  - `LogTransactionModal.tsx`
  - `index.ts`
- `apps/web/src/App.tsx` (integration of Ledger feature into the main dashboard tab)

MISSION & REQUIREMENTS:
1. `TransactionLedger.tsx` (Granular Master Table):
   - Master list of transactions loaded from `useDashboardData` (`transactions` array).
   - Columns: Date/Time (formatted with relative + absolute date), Merchant / Payee, Source Badge (`WHATSAPP`, `WEB`, `MOBILE`), Account Badge, Envelope Category, Total Amount (PKR), Line-Item Count Badge, and Expand/Collapse action toggle.
   - Quick action: "Log New Transaction" button in header opening `LogTransactionModal`.
   - Summary bar showing: Total Transactions Count, Total Filtered Spend, and Average Receipt Size.
2. `ReceiptDetail.tsx` (Expandable Multi-Level Receipt Breakdown):
   - Smoothly rendered expandable drawer / sub-table beneath a transaction row when clicked.
   - Shows itemized receipt line items:
     - Item name (raw item name + canonical tag e.g. "Aaloo (Potatoes)")
     - Quantity & Standard Unit (e.g. `1.500 kg`, `2.000 liter`, `1.000 dozen`)
     - Unit Price (`PKR 120.00/kg`)
     - Line Total (`PKR 180.00`)
     - Notes / Synonyms
   - Raw input preview section (e.g. "WhatsApp Message: 'Imtiaz Super Market 2kg aaloo 240, 1L doodh 240, 1 dozen anday 340'").
   - Merchant address or tags (if present).
3. `LedgerFilterBar.tsx` (Interactive Filtering & Search):
   - Real-time search input matching Merchant, Raw Item Name, Canonical Item, and Notes.
   - Dropdown filters:
     - Filter by Account (All, Cash, Meezan Bank, Sadapay, Nayapay)
     - Filter by Envelope Group / Category (All, Grocery, Fuel, Dining Out, etc.)
     - Filter by Source Channel (All, WhatsApp, Web, Mobile)
     - Date Range or preset filters (All Time, This Month, Last Month)
   - "Clear Filters" button when active filters exist.
4. `LogTransactionModal.tsx` (Manual Multi-Item Logger):
   - Dynamic form allowing users to log transactions with multiple itemized receipt lines.
   - Form fields:
     - Account Selector (required)
     - Envelope Selector (required)
     - Merchant Name (e.g. "Al-Fatah Supermarket", "Shell Fuel Station")
     - Transacted Date (defaults to now)
     - Source (defaults to `WEB`)
     - Dynamic Line Items Builder:
       - Add / Remove line item rows
       - Each row: Raw Item Name, Quantity, Unit (`kg`, `liter`, `piece`, `dozen`, `pack`), Unit Price, Line Total (auto-calculates Total = Qty * UnitPrice or derives UnitPrice = Total / Qty)
       - Notes
     - Total Transaction Amount (auto-sums all line items).
   - Calls `logTransaction(payload)` mutation from `useDashboardData.ts`.
5. Integration into `apps/web/src/App.tsx`:
   - Replace placeholder under the `ledger` tab with `<TransactionLedger />` and filter bar.
6. Verification:
   - Run `pnpm run type-check` (must pass with 0 errors).
   - Run `pnpm run build` (must compile cleanly into `apps/web/dist/`).

DELIVERABLE:
Write a complete report to `/home/mavee/tazkiyah/.agents/worker_m4_1/handoff.md` detailing all implemented components, type check results, build results, and verification commands.
