from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from ..models.all_models import User
from ..schemas import UserCreate, UserLogin, Token, TokenRefresh, UserResponse, PasswordResetRequest, PasswordResetConfirm
from ..services.email_service import email_service
from datetime import timedelta
from ..core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = get_password_hash(user_data.password)
    user = User(email=user_data.email, full_name=user_data.full_name, hashed_password=hashed)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # send verification email
    token = create_access_token({"sub": user.email}, timedelta(hours=24))
    await email_service.send_verification_email(user.email, token)
    return user

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_access_token({"sub": user.email})
    refresh = create_refresh_token({"sub": user.email})
    return {"access_token": access, "refresh_token": refresh}

@router.post("/refresh", response_model=Token)
async def refresh(token_data: TokenRefresh):
    try:
        payload = decode_token(token_data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = payload.get("sub")
        new_access = create_access_token({"sub": email})
        new_refresh = create_refresh_token({"sub": email})
        return {"access_token": new_access, "refresh_token": new_refresh}
    except:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/verify")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_token(token)
    email = payload.get("sub")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return {"message": "Email verified"}

@router.post("/reset-request")
async def reset_request(req: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if user:
        token = create_access_token({"sub": user.email}, timedelta(hours=1))
        user.reset_token = token
        await db.commit()
        await email_service.send_reset_email(user.email, token)
    return {"message": "If email exists, reset link sent"}

@router.post("/reset-confirm")
async def reset_confirm(data: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(data.token)
        email = payload.get("sub")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or user.reset_token != data.token:
            raise HTTPException(status_code=400, detail="Invalid token")
        user.hashed_password = get_password_hash(data.new_password)
        user.reset_token = None
        await db.commit()
        return {"message": "Password updated"}
    except:
        raise HTTPException(status_code=400, detail="Invalid token")