from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from app.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["Goals & Sinking Funds"])

@router.post("", response_model=GoalResponse)
async def create_goal(payload: GoalCreate, db: AsyncSession = Depends(get_db)):
    return await GoalService.create_goal(payload=payload, db=db)

@router.get("/household/{household_id}", response_model=List[GoalResponse])
async def list_goals(household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await GoalService.list_goals(household_id=household_id, db=db)

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    return await GoalService.get_goal(goal_id=goal_id, household_id=household_id, db=db)

@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID, household_id: UUID, payload: GoalUpdate, db: AsyncSession = Depends(get_db)
):
    return await GoalService.update_goal(goal_id=goal_id, household_id=household_id, payload=payload, db=db)

@router.delete("/{goal_id}")
async def delete_goal(goal_id: UUID, household_id: UUID, db: AsyncSession = Depends(get_db)):
    await GoalService.delete_goal(goal_id=goal_id, household_id=household_id, db=db)
    return {"status": "success", "message": f"Goal {goal_id} deleted"}
