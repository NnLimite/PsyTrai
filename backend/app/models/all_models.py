from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Роли: superadmin, admin_university, teacher, supervisor, student
    role = Column(String(50), default="student", nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)
    
    university = relationship("University", back_populates="users")
    sessions = relationship("Session", back_populates="therapist")

class University(Base):
    __tablename__ = "universities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    license_key = Column(String(100), unique=True, nullable=False)
    max_users = Column(Integer, default=20)
    is_trial = Column(Boolean, default=True)
    trial_expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    
    users = relationship("User", back_populates="university")

class Disorder(Base):
    __tablename__ = "disorders"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)  # Например: ICD11-6B20 (ОКР), DSM5-295.90 (Шизофрения)
    name_ru = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_de = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_preset = Column(Boolean, default=False)  # Флаг заготовки (шаблона)
    is_private = Column(Boolean, default=False)  # Доступно только группе преподавателя
    group_id = Column(String(100), nullable=True)   # Идентификатор учебной группы
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(50), nullable=False)
    disorder_id = Column(Integer, ForeignKey("disorders.id"), nullable=False)
    
    # Полный конструктор Лора согласно ТЗ
    severity = Column(String(50), nullable=False)          # Степень выраженности симптомов
    attachment_type = Column(String(100), nullable=False)   # Тип привязанности
    motivation = Column(String(100), nullable=False)        # Мотивация к терапии
    trigger_themes = Column(JSON, nullable=False)           # Список триггерных тем (JSON array)
    defense_mechanisms = Column(JSON, nullable=False)       # Защитные механизмы (JSON array)
    background_story = Column(Text, nullable=False)         # Жизненный лор и анамнез
    
    created_at = Column(DateTime, default=get_utc_now)

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    therapist_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    mode = Column(String(50), default="psychology")  # psychology или psychotherapy
    status = Column(String(50), default="active")    # active, paused, completed
    language = Column(String(10), default="ru")      # ru, en, de
    
    # Таймер сессии
    started_at = Column(DateTime, default=get_utc_now)
    total_paused_seconds = Column(Integer, default=0)
    last_paused_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    
    chat_history = Column(JSON, default=list)        # Полный транскрипт сессии
    analytics_report = Column(JSON, nullable=True)    # Отдельный пайплайн разбора (баллы + фидбэк)
    supervisor_comments = Column(Text, nullable=True) # Комментарии клинического супервизора
    
    therapist = relationship("User", back_populates="sessions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(255), nullable=False)     # Например: "CREATE_DISORDER", "EDIT_PRESET"
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime

class Payment(Base): # Убедись, что Base — это имя твоего декларативного базового класса в этом файле
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="RUB")
    status = Column(String, default="pending")  # pending, completed, failed
    external_id = Column(String, nullable=True)  # ID транзакции из ЮKassa/Stripe/etc
    created_at = Column(DateTime, default=datetime.utcnow)    