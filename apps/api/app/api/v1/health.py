from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "tazkiyah-api",
        "version": settings.VERSION,
    }
