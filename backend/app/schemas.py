from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None

# Схемы авторизации
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: Optional[str] = "student"
    university_license: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_verified: bool = False

    class Config:
        from_attributes = True

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# Схемы университетов
class UniversityCreate(BaseModel):
    name: str
    license_code: Optional[str] = None  # Если в базе данных поле называется иначе (например, просто license), поправь под свою модель

class UniversityResponse(UniversityCreate):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True
# Схемы расстройств (Disorders)
class DisorderResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


# Схемы конструктора пациента (Лор)
class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    age: int = Field(..., ge=1, le=120)
    gender: str
    disorder_id: int
    severity: str
    attachment_type: str
    motivation: str
    trigger_themes: List[str]
    defense_mechanisms: List[str]
    background_story: str
    is_preset: bool = False
    is_private: bool = False
    group_id: Optional[str] = None

class PatientResponse(PatientCreate):
    id: int
    creator_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Схемы диалогового движка (Sessions)
class ChatMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)

class SessionStartRequest(BaseModel):
    patient_id: int
    mode: str = Field("psychology", pattern="^(psychology|psychotherapy)$")
    language: str = Field("ru", pattern="^(ru|en|de)$")

class SessionCompleteRequest(BaseModel):
    supervisor_comments: Optional[str] = None

# Схемы платежей (Payments)
class PaymentCreate(BaseModel):
    amount: float
    currency: Optional[str] = "RUB"

class PaymentResponse(PaymentCreate):
    id: int
    user_id: int
    status: str
    external_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True    