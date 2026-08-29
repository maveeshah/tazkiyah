from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.cpi import CPITrendItem
from app.services.cpi_service import CPIService

router = APIRouter(prefix="/cpi", tags=["Personal CPI & Item Trends"])

@router.get("/trends/{household_id}", response_model=List[CPITrendItem])
async def get_cpi_trends(household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await CPIService.get_cpi_trends(household_id=household_id, db=db)
