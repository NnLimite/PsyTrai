from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import get_db
from ..models.all_models import Payment, User
from ..schemas import PaymentCreate, PaymentResponse
from ..services.payment_service import payment_service
from ..utils.deps import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/create", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    yk_payment = await payment_service.create_payment(data.amount, "PsyTrainer subscription", f"{settings.FRONTEND_URL}/payment-success")
    payment = Payment(user_id=current_user.id, amount=data.amount, currency=data.currency, status=yk_payment["status"], yookassa_payment_id=yk_payment["payment_id"])
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return {"id": payment.id, "amount": payment.amount, "status": payment.status, "payment_url": yk_payment["confirmation_url"]}

@router.post("/webhook")
async def yookassa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    # verify and update payment status
    pass