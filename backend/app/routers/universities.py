from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.all_models import University
from ..schemas import UniversityCreate, UniversityResponse
from ..utils.deps import get_current_superuser

router = APIRouter(prefix="/universities", tags=["universities"])

@router.post("/", response_model=UniversityResponse)
async def create_university(data: UniversityCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_superuser)):
    uni = University(**data.dict())
    db.add(uni)
    await db.commit()
    await db.refresh(uni)
    return uni

@router.get("/", response_model=list[UniversityResponse])
async def list_universities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(University))
    return result.scalars().all()