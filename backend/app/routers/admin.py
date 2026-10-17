from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..core.database import get_db
from ..models.all_models import User, Session
from ..utils.deps import get_current_superuser

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_superuser)
):
    result = await db.execute(select(User))
    return result.scalars().all()

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_superuser)
):
    # Метод db.scalar() для асинхронных агрегатных функций count() — это лучший выбор
    total_users = await db.scalar(select(func.count(User.id)))
    total_sessions = await db.scalar(select(func.count(Session.id)))
    
    return {
        "total_users": total_users, 
        "total_sessions": total_sessions
    }