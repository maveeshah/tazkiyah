from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.envelope import EnvelopeGroup
from app.schemas.envelope import (
    EnvelopeGroupCreate,
    EnvelopeGroupUpdate,
    EnvelopeGroupResponse,
    EnvelopeCreate,
    EnvelopeUpdate,
    EnvelopeResponse,
    EnvelopeAssign,
    EnvelopeRebalance,
    ZBBSummaryResponse,
)
from app.services.zbb_service import ZBBService

router = APIRouter(prefix="/envelopes", tags=["Envelopes & ZBB"])

@router.post("/groups", response_model=EnvelopeGroupResponse)
async def create_envelope_group(payload: EnvelopeGroupCreate, db: AsyncSession = Depends(get_db)):
    return await ZBBService.create_group(payload=payload, db=db)

@router.get("/groups/household/{household_id}", response_model=List[EnvelopeGroupResponse])
async def list_envelope_groups(household_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EnvelopeGroup)
        .options(selectinload(EnvelopeGroup.envelopes))
        .where(EnvelopeGroup.household_id == household_id)
        .order_by(EnvelopeGroup.sort_order)
    )
    return list(result.scalars().all())

@router.patch("/groups/{group_id}", response_model=EnvelopeGroupResponse)
async def update_envelope_group(
    group_id: UUID, household_id: UUID, payload: EnvelopeGroupUpdate, db: AsyncSession = Depends(get_db)
):
    return await ZBBService.update_group(group_id=group_id, household_id=household_id, payload=payload, db=db)

@router.delete("/groups/{group_id}")
async def delete_envelope_group(group_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    await ZBBService.delete_group(group_id=group_id, household_id=household_id, db=db)
    return {"status": "success", "message": f"Envelope group {group_id} deleted"}

@router.post("", response_model=EnvelopeResponse)
async def create_envelope(payload: EnvelopeCreate, db: AsyncSession = Depends(get_db)):
    return await ZBBService.create_envelope(payload=payload, db=db)

@router.patch("/{envelope_id}", response_model=EnvelopeResponse)
async def update_envelope(
    envelope_id: UUID, household_id: UUID, payload: EnvelopeUpdate, db: AsyncSession = Depends(get_db)
):
    return await ZBBService.update_envelope(
        envelope_id=envelope_id, household_id=household_id, payload=payload, db=db
    )

@router.delete("/{envelope_id}")
async def delete_envelope(envelope_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    await ZBBService.delete_envelope(envelope_id=envelope_id, household_id=household_id, db=db)
    return {"status": "success", "message": f"Envelope {envelope_id} deleted"}

@router.get("/summary/{household_id}", response_model=ZBBSummaryResponse)
async def get_zbb_summary(household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await ZBBService.get_zbb_summary(household_id=household_id, db=db)

@router.post("/assign", response_model=EnvelopeResponse)
async def assign_envelope(household_id: UUID, payload: EnvelopeAssign, db: AsyncSession = Depends(get_db)):
    return await ZBBService.assign_envelope(
        household_id=household_id,
        envelope_id=payload.envelope_id,
        assigned_amount=payload.assigned_amount,
        db=db,
    )

@router.post("/rebalance")
async def rebalance_envelopes(household_id: UUID, payload: EnvelopeRebalance, db: AsyncSession = Depends(get_db)):
    from_env, to_env = await ZBBService.rebalance_envelopes(
        household_id=household_id,
        from_envelope_id=payload.from_envelope_id,
        to_envelope_id=payload.to_envelope_id,
        amount=payload.amount,
        db=db,
    )
    return {
        "status": "success",
        "message": f"Transferred {payload.amount} from {from_env.name} to {to_env.name}",
        "from_envelope": EnvelopeResponse.model_validate(from_env),
        "to_envelope": EnvelopeResponse.model_validate(to_env),
    }

@router.get("/overspent/{household_id}", response_model=List[EnvelopeResponse])
async def get_overspent_envelopes(household_id: UUID, db: AsyncSession = Depends(get_db)):
    envelopes = await ZBBService.get_overspent_envelopes(household_id=household_id, db=db)
    return list(envelopes)
