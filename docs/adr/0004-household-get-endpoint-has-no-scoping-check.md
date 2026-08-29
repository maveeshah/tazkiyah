---
status: accepted
---

# GET /households/{id} deliberately has no ownership check

The architecture review's Phase 0 fix was worded as "add a `household_id` match/require check on GET-by-id endpoints" for both `accounts.py` and `households.py`, closing a cross-tenant read where any caller could fetch any other household's data by ID. For `accounts.py` this was straightforward: `Account.household_id` is a real scoping FK, so `get_account` now requires a matching `household_id` query param.

`households.py`'s `get_household(household_id)` has no equivalent field to check — `Household` *is* the tenant root, not a child of one. Forcing a second "does this ID match itself" parameter onto the endpoint doesn't close anything; the actual gap is that the app has no authentication at all, so nothing proves the caller is a member of the household they're asking for. That's a materially bigger fix than Phase 0's scope (a write-time invariant pass), and isn't covered by any later phase of the remediation plan either.

We left `get_household` unchanged rather than add a check that would look like a fix without being one.

## Consequences

Any household's data is still readable by ID with no proof of membership. This isn't resolved until the project adds real authentication — worth deciding whether that becomes its own phase before `apps/web` is wired up in Phase 2 and this starts being reachable from a browser, not just direct API calls.
