from yookassa import Configuration, Payment as YooPayment
from ..core.config import settings
from ..logging import logger

class PaymentService:
    def __init__(self):
        Configuration.account_id = settings.YK_SHOP_ID
        Configuration.secret_key = settings.YK_SECRET_KEY

    async def create_payment(self, amount: float, description: str, return_url: str) -> dict:
        payment = YooPayment.create({
            "amount": {"value": amount, "currency": "RUB"},
            "confirmation": {"type": "redirect", "return_url": return_url},
            "capture": True,
            "description": description
        })
        return {
            "payment_id": payment.id,
            "status": payment.status,
            "confirmation_url": payment.confirmation.confirmation_url
        }

payment_service = PaymentService()