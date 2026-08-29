---
status: accepted
---

# Deleting or editing a transaction keeps its price-history rows

`LedgerService.create_transaction` records a `PriceHistory` row for every line item
that has a unit price, so the Personal CPI trend (`GET /cpi/trends/{id}`) is built from
the same observations the ledger captured. When we added transaction delete and edit
(`DELETE` / `PATCH /transactions/{id}`), the question was whether removing a transaction
should also remove the price points it produced.

We chose to **leave the price-history rows in place**. A price observation ("potatoes
were Rs 120/kg at Imtiaz on the 15th") is a fact about the world that stays true even
after the household deletes the transaction from their ledger — it was still the price
they paid. `PriceHistory` has no foreign key back to `transaction_id` or `line_item_id`
(only to `canonical_item_id`), so there is also no reliable way to identify "this
transaction's price points" without adding one.

The ledger reversal on delete/edit is limited to the two mutable running totals:
`Account.current_balance` (re-credited) and `Envelope.spent_amount` (decremented). On an
edit that replaces the line-item set, the old `LineItem` rows are deleted (they belong
to the transaction) but the `PriceHistory` rows they generated are kept, and the new
line items generate fresh price points.

## Consequences

Repeatedly editing the same transaction's line items accumulates price-history rows and
can bias the CPI trend for that item. Transaction edits are expected to be rare
corrections; if this becomes a real problem, the fix is to add a `line_item_id` (or
`transaction_id`) FK to `PriceHistory` and delete the dependent points on reversal —
which would be a schema change and a reversal of this decision, not a bug fix.
