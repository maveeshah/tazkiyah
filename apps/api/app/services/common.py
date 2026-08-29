from uuid import UUID
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.envelope import Envelope, EnvelopeGroup


def household_envelopes_query(household_id: UUID) -> Select:
    """Base query for envelopes scoped to a household via their group."""
    return (
        select(Envelope)
        .join(EnvelopeGroup, Envelope.group_id == EnvelopeGroup.id)
        .where(EnvelopeGroup.household_id == household_id)
    )


async def get_household_envelope(
    household_id: UUID, envelope_id: UUID, db: AsyncSession
) -> Envelope | None:
    result = await db.execute(
        household_envelopes_query(household_id).where(Envelope.id == envelope_id)
    )
    return result.scalar_one_or_none()
