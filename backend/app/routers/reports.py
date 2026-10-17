from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.all_models import Session, Patient, User
from ..services.pdf_service import pdf_service
from ..utils.deps import get_current_user
import shutil

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/{session_id}/pdf")
async def generate_report(session_id: int, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.therapist_id != current_user.id:
        raise HTTPException(404, "Session not found")
    patient = await db.get(Patient, session.patient_id)
    therapist = await db.get(User, session.therapist_id)
    session_data = {
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "therapist_name": therapist.full_name,
        "started_at": session.started_at.isoformat(),
        "status": session.status,
        "chat_history": session.chat_history,
        "supervisor_comments": session.supervisor_comments
    }
    pdf_path = await pdf_service.generate_report(session_data)
    # In a real app, you'd upload to S3 and return URL; here we move to static folder
    dest = f"reports/report_{session_id}.pdf"
    shutil.move(pdf_path, dest)
    return {"pdf_url": f"/static/{dest}"}