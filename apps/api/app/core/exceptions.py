class DomainError(Exception):
    """Base class for errors raised by the service layer.

    Services raise these instead of HTTPException so they stay decoupled
    from the HTTP transport; app.main translates them to responses.
    """

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(DomainError):
    """Requested entity does not exist (or isn't visible to this household)."""


class InvalidOperationError(DomainError):
    """Request is well-formed but violates a domain invariant."""


class ConflictError(DomainError):
    """Request conflicts with existing state (e.g. a uniqueness constraint)."""
