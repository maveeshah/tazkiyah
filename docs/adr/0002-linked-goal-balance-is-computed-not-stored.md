---
status: accepted
---

# A goal linked to an envelope computes its balance instead of storing it

`Goal.current_balance` was a plain stored column, set once from client input at creation and never touched again — even for goals with an `envelope_id` FK implying a live relationship to an envelope. Assigning to or spending from that envelope did nothing to the goal's balance, so the two silently drifted apart from the moment the goal was created.

We chose to make `current_balance` a derived value for any goal with `envelope_id` set: `GoalService` reads it live from `envelope.available_balance` on every response, the same computed-on-read pattern `ZBBService.get_zbb_summary` already uses for `unassigned_cash`. A client-supplied `current_balance` is ignored on creation for a linked goal (stored as `0.00`, since it's never read back). A goal *without* an envelope link keeps its stored, manually-updated column — there's nothing to derive it from.

The alternative — writing sync hooks so `ZBBService.assign_envelope` / `LedgerService.create_transaction` push updates into any linked goal's stored balance — was rejected: it adds a second write path that has to stay correct forever, for a value that already exists on the envelope.

## Consequences

`GoalResponse.current_balance` for a linked goal is not the DB column's value — reading the column directly (e.g. `select(Goal)` without loading `.envelope`, or a raw SQL query) will show `0.00` or a stale figure, not the real balance. Anything that needs a linked goal's true balance must go through `GoalService`, not the ORM column.
