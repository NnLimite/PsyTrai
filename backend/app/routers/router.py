from fastapi import APIRouter
from app.routers import auth, users, universities, disorders, patients, sessions, payments, reports, admin

api_router = APIRouter()

# Подключение всех веток согласно структуре твоей папки app/routers/
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(universities.router)
api_router.include_router(disorders.router)
api_router.include_router(patients.router)
api_router.include_router(sessions.router)
api_router.include_router(payments.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)