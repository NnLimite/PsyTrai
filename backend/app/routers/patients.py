from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.all_models import Patient
from ..schemas import PatientCreate, PatientResponse
from ..utils.deps import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])

@router.post("/", response_model=PatientResponse)
async def create_patient(data: PatientCreate, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    patient = Patient(user_id=current_user.id, **data.dict())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient

@router.get("/", response_model=list[PatientResponse])
async def list_patients(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    return result.scalars().all()