from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.all_models import Disorder
from ..schemas import DisorderResponse
from ..utils.deps import get_current_user

router = APIRouter(prefix="/disorders", tags=["disorders"])

@router.get("/", response_model=list[DisorderResponse])
async def list_disorders(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(Disorder))
    return result.scalars().all()