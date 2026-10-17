from fastapi import FastAPI
from app.routers.router import api_router

app = FastAPI(title="PsyTrainer Core API")
app.include_router(api_router, prefix="/api/v1")
from fastapi import FastAPI
from app.routers.router import api_router
from app.routers.auth import router as auth_router  # Импортируем роутер аутентификации напрямую

app = FastAPI(title="PsyTrai API")

# Подключаем auth_router БЕЗ префикса. 
# Теперь его эндпоинты (например, /register и /login) станут корневыми.
app.include_router(auth_router, prefix= "/v1")

# Подключаем все остальные роутеры (users, patients, sessions и т.д.)
app.include_router(api_router, prefix="/api/v1")  # Можно добавить префикс для остальных, если хочется