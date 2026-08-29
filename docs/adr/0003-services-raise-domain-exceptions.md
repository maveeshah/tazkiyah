---
status: accepted
---

# Services raise domain exceptions, not HTTPException

Every service (`ZBBService`, `LedgerService`, and now `AccountService`/`HouseholdService`/`GoalService`) previously imported `fastapi.HTTPException` directly and raised it with a hardcoded status code, coupling the service layer to the HTTP transport. We introduced `app/core/exceptions.py` (`NotFoundError`, `InvalidOperationError`, `ConflictError`) and translate them to responses via FastAPI exception handlers registered in `app/main.py` (404 / 400 / 409 respectively), so services raise errors that describe *what went wrong in the domain*, not *what HTTP status that implies*.

We kept this to three exception types rather than one per failure case — the review found services only ever needed "not found", "the operation is invalid", or "this conflicts with existing state," and a wider hierarchy wasn't justified by any real distinction in caller behavior.

## Consequences

A new service method must raise one of these three (or extend the hierarchy in `app/core/exceptions.py` and register a handler) rather than `HTTPException` — reintroducing `HTTPException` in a service is a regression of this decision, not a style nit. Response body shape (`{"detail": "..."}`) and existing status codes were preserved exactly, so this was a pure refactor with no API-visible change.
