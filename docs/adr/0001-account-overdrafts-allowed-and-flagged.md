---
status: accepted
---

# Account overdrafts are allowed and flagged, not blocked

An architecture review found account debits (`LedgerService.create_transaction`) applied unconditionally, with no check against `Account.current_balance` before debiting — driving an account negative was possible but entirely unflagged. We decided to keep transactions unconditional and instead surface the negative balance, rather than reject the transaction: real accounts do go negative (overdraft fees, timing lags between a purchase and its debit posting), so blocking outright would reject valid real-world spends. This mirrors the existing, deliberate handling of envelope overspend, where `spent_amount` is allowed to exceed `assigned_amount` and is surfaced via a query instead of rejected at write time.

Implemented as `Account.is_overdrawn` (a computed property, `current_balance < 0`) exposed on `AccountResponse`, plus `AccountService.get_overdrawn_accounts()` / `GET /accounts/overdrawn/{household_id}` mirroring `ZBBService.get_overspent_envelopes()`.

## Consequences

Any future "block the spend" behavior (e.g. a hard account limit) would be a genuine reversal of this decision, not a bug fix — it needs its own product discussion, not a quiet patch to `create_transaction`.
