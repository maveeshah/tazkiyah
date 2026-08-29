# Tazkiyah Finance

Zero-based budgeting (ZBB) personal finance system for a household: money coming in is fully assigned to envelopes before it can be spent, and every transaction is tied to both an account (where the money physically lives) and an envelope (what it was budgeted for).

## Language

**Household**:
The tenant root of the system — a family or group sharing one budget. Every account, envelope, transaction, and goal belongs to exactly one household.
_Avoid_: Family, tenant, workspace

**Account**:
A place money physically sits — a wallet, bank account, EMI, or credit line. Tracks a running balance independent of how that money is budgeted.
_Avoid_: Wallet, bank, ledger

**Envelope**:
A budget category money is assigned to before it can be spent. Tracks `assigned_amount` (money set aside) separately from `spent_amount` (money used against it).
_Avoid_: Category, bucket, budget line

**Envelope Group**:
A named grouping of related envelopes (e.g. "Daily Living", "Discretionary") used to organize the budget. Has no financial behavior of its own.
_Avoid_: Category group

**Unassigned Cash**:
Money sitting in accounts that hasn't yet been assigned to any envelope — the pool zero-based budgeting requires you to drive to zero. Always computed live from account balances minus total assigned; never stored.
_Avoid_: Available cash, free money

**Overspent Envelope**:
An envelope where `spent_amount` exceeds `assigned_amount`. Overspending is detected and surfaced, not prevented — the transaction that caused it still goes through.
_Avoid_: Over-budget envelope

**Overdrawn Account**:
An account whose current balance has gone negative. Like an overspent envelope, this is allowed and flagged rather than blocked — real accounts do go negative (overdraft fees, timing lags on posting).
_Avoid_: Negative account

**Goal**:
A savings target: paced toward a target date, capped at a target amount, or an open-ended sinking fund. May optionally be linked to a single envelope.
_Avoid_: Target, savings plan

**Linked Goal**:
A goal with an envelope attached. Its current balance is never set directly — it's always read live from the linked envelope's balance, so the goal can't drift out of sync with the envelope backing it. A goal without a linked envelope keeps its own stored, manually-updated balance.
_Avoid_: Envelope-backed goal

**Canonical Item**:
A normalized, deduplicated name for a purchased good (e.g. "aaloo", "potato", "aalu" all resolve to "Potato"), used to track price history for the same item across merchants and time.
_Avoid_: Product, SKU
