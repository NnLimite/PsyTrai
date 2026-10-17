import smtplib
from email.message import EmailMessage
from ..core.config import settings
from ..logging import logger

class EmailService:
    @staticmethod
    async def send_verification_email(to_email: str, token: str):
        link = f"{settings.FRONTEND_URL}/verify?token={token}"
        subject = "Verify your email"
        body = f"Click here to verify: {link}"
        await EmailService._send_mail(to_email, subject, body)

    @staticmethod
    async def send_reset_email(to_email: str, token: str):
        link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        subject = "Password reset"
        body = f"Click here to reset password: {link}"
        await EmailService._send_mail(to_email, subject, body)

    @staticmethod
    async def _send_mail(to_email: str, subject: str, body: str):
        msg = EmailMessage()
        msg.set_content(body)
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info(f"Email sent to {to_email}")
        except Exception as e:
            logger.error(f"Email failed: {e}")

email_service = EmailService()