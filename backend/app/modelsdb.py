"""
PsyTrainer — полная схема базы данных PostgreSQL.

Таблицы:
  users               — пользователи
  universities        — вузы (B2B-лицензиаты)
  licenses            — лицензии вузов
  tariffs             — тарифные планы (B2C + B2B)
  subscriptions       — активные подписки пользователей
  disorders           — каталог расстройств DSM-5/МКБ-11
  patient_profiles    — профили AI-пациентов (конструктор)
  sessions            — тренировочные сессии
  messages            — сообщения внутри сессии (транскрипт)
  session_reports     — аналитический отчёт по сессии
  red_flags           — красные флаги из отчёта
  supervisor_comments — комментарии супервизора к сессии
  payments            — платежи (YooKassa)
  audit_logs          — аудит-лог действий
  password_history    — история паролей
  email_history       — история смен email

Как хранить диалог:
  Каждое сообщение — отдельная строка в `messages`.
  Это даёт: историю по сообщениям, поиск по тексту,
  возможность комментировать конкретный ход (message_index),
  экспорт в PDF и аналитику.
  НЕ храним диалог одной JSON-колонкой — это не позволяет
  делать точечные запросы, FTS, пагинацию и привязку комментариев.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime,
    Enum, Float, ForeignKey, Index, Integer,
    SmallInteger, String, Text, UniqueConstraint,
    event,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────

class UserRole(str, PyEnum):
    superadmin       = "superadmin"
    university_admin = "university_admin"
    teacher          = "teacher"
    supervisor       = "supervisor"
    student          = "student"


class Language(str, PyEnum):
    ru = "ru"
    en = "en"
    de = "de"


class LicenseStatus(str, PyEnum):
    trial     = "trial"
    active    = "active"
    expired   = "expired"
    suspended = "suspended"


class SubStatus(str, PyEnum):
    trial    = "trial"
    active   = "active"
    expired  = "expired"
    canceled = "canceled"


class SessionMode(str, PyEnum):
    diagnostics   = "diagnostics"    # профиль статичен
    psychotherapy = "psychotherapy"  # пациент меняется


class SessionStatus(str, PyEnum):
    active    = "active"
    paused    = "paused"
    completed = "completed"


class MessageRole(str, PyEnum):
    student = "student"   # студент-консультант
    patient = "patient"   # AI-пациент
    hint    = "hint"      # подсказка супервизора (только для студента)
    system  = "system"    # системное сообщение


class Severity(str, PyEnum):
    mild     = "mild"
    moderate = "moderate"
    severe   = "severe"


class RedFlagSeverity(str, PyEnum):
    high   = "high"
    medium = "medium"


class PaymentStatus(str, PyEnum):
    pending   = "pending"
    succeeded = "succeeded"
    canceled  = "canceled"
    refunded  = "refunded"


# ─────────────────────────────────────────────────────────────
# 1. UNIVERSITIES — вузы (B2B-клиенты)
# ─────────────────────────────────────────────────────────────

class University(Base):
    """
    Юридическое лицо-лицензиат (ВУЗ / кафедра / ДПО-центр).
    Создаётся суперадмином при выдаче B2B-лицензии.
    """
    __tablename__ = "universities"

    id           : Mapped[str]            = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    name         : Mapped[str]            = mapped_column(String(255), nullable=False)
    short_name   : Mapped[Optional[str]]  = mapped_column(String(50))
    inn          : Mapped[Optional[str]]  = mapped_column(String(12), unique=True)   # ИНН для документооборота
    kpp          : Mapped[Optional[str]]  = mapped_column(String(9))
    legal_address: Mapped[Optional[str]]  = mapped_column(Text)
    contact_email: Mapped[str]            = mapped_column(String(255), nullable=False)
    contact_phone: Mapped[Optional[str]]  = mapped_column(String(30))
    created_at   : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at   : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    # Relations
    license  : Mapped[Optional["License"]] = relationship("License", back_populates="university", uselist=False)
    users    : Mapped[List["User"]]        = relationship("User", back_populates="university")
    patients : Mapped[List["PatientProfile"]] = relationship("PatientProfile", back_populates="university")

    __table_args__ = (
        Index("ix_universities_inn", "inn"),
    )


# ─────────────────────────────────────────────────────────────
# 2. LICENSES — лицензии для вузов
# ─────────────────────────────────────────────────────────────

class License(Base):
    """
    Одна лицензия на университет.
    Trial: 15 дней, max 20 пользователей (из конфига).
    Active: оплачено, max_users по договору.
    """
    __tablename__ = "licenses"

    id            : Mapped[str]            = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    university_id : Mapped[str]            = mapped_column(ForeignKey("universities.id"), nullable=False, unique=True)
    status        : Mapped[LicenseStatus]  = mapped_column(Enum(LicenseStatus), default=LicenseStatus.trial, nullable=False)
    max_users     : Mapped[int]            = mapped_column(Integer, default=20, nullable=False)
    price_per_user: Mapped[float]          = mapped_column(Float, default=0.0, nullable=False)  # руб./год
    starts_at     : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    expires_at    : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at    : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at    : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    # Relations
    university: Mapped["University"] = relationship("University", back_populates="license")

    __table_args__ = (
        Index("ix_licenses_status_expires", "status", "expires_at"),
    )


# ─────────────────────────────────────────────────────────────
# 3. TARIFFS — тарифные планы
# ─────────────────────────────────────────────────────────────

class Tariff(Base):
    """
    B2C-тарифы (student_free, pro_monthly).
    B2B управляется через License, не через Tariff.
    """
    __tablename__ = "tariffs"

    id               : Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    code             : Mapped[str]           = mapped_column(String(50), unique=True, nullable=False)  # "free" | "pro_monthly"
    name_ru          : Mapped[str]           = mapped_column(String(100), nullable=False)
    name_en          : Mapped[str]           = mapped_column(String(100), nullable=False)
    price_rub        : Mapped[float]         = mapped_column(Float, default=0.0, nullable=False)
    sessions_per_day : Mapped[Optional[int]] = mapped_column(Integer)   # NULL = безлимит
    has_constructor  : Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    has_pdf          : Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    has_hints        : Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    is_active        : Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)
    sort_order       : Mapped[int]           = mapped_column(Integer, default=0, nullable=False)
    created_at       : Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    subscriptions: Mapped[List["Subscription"]] = relationship("Subscription", back_populates="tariff")


# ─────────────────────────────────────────────────────────────
# 4. USERS — пользователи
# ─────────────────────────────────────────────────────────────

class User(Base):
    """
    Все роли в одной таблице (role-based).
    university_id = NULL для суперадминов и B2C-пользователей.
    deleted_at — мягкое удаление (152-ФЗ: право на erasure,
    ПД анонимизируются, строка не удаляется для аудита).
    """
    __tablename__ = "users"

    id                      : Mapped[str]            = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    email                   : Mapped[str]            = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash           : Mapped[str]            = mapped_column(String(255), nullable=False)
    first_name              : Mapped[str]            = mapped_column(String(100), nullable=False, default="")
    last_name               : Mapped[str]            = mapped_column(String(100), nullable=False, default="")
    role                    : Mapped[UserRole]       = mapped_column(Enum(UserRole), default=UserRole.student, nullable=False)
    language                : Mapped[Language]       = mapped_column(Enum(Language), default=Language.ru, nullable=False)

    # Привязка к вузу
    university_id           : Mapped[Optional[str]]  = mapped_column(ForeignKey("universities.id"), index=True)

    # Состояние аккаунта
    is_active               : Mapped[bool]           = mapped_column(Boolean, default=True, nullable=False)
    is_email_verified       : Mapped[bool]           = mapped_column(Boolean, default=False, nullable=False)
    email_verification_token: Mapped[Optional[str]]  = mapped_column(String(255))
    password_reset_token    : Mapped[Optional[str]]  = mapped_column(String(255))
    password_reset_expires  : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Сессионные данные
    last_login_at           : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_ip                 : Mapped[Optional[str]]  = mapped_column(INET)    # INET — нативный тип PG для IP

    # Временные метки
    created_at              : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at              : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at              : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relations
    university        : Mapped[Optional["University"]]       = relationship("University", back_populates="users")
    subscription      : Mapped[Optional["Subscription"]]     = relationship("Subscription", back_populates="user", uselist=False)
    created_patients  : Mapped[List["PatientProfile"]]       = relationship("PatientProfile", back_populates="created_by", foreign_keys="PatientProfile.created_by_id")
    sessions          : Mapped[List["Session"]]              = relationship("Session", back_populates="student", foreign_keys="Session.student_id")
    supervisor_comments: Mapped[List["SupervisorComment"]]   = relationship("SupervisorComment", back_populates="supervisor")
    audit_logs        : Mapped[List["AuditLog"]]             = relationship("AuditLog", back_populates="user")
    password_history  : Mapped[List["PasswordHistory"]]      = relationship("PasswordHistory", back_populates="user", cascade="all, delete-orphan")
    email_history     : Mapped[List["EmailHistory"]]         = relationship("EmailHistory", back_populates="user", cascade="all, delete-orphan")
    payments          : Mapped[List["Payment"]]              = relationship("Payment", back_populates="user")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email

    __table_args__ = (
        Index("ix_users_sub_status_exp", "is_active", "deleted_at"),
    )


# ─────────────────────────────────────────────────────────────
# 5. SUBSCRIPTIONS — B2C подписки
# ─────────────────────────────────────────────────────────────

class Subscription(Base):
    """
    Одна активная подписка на пользователя.
    B2B-пользователи получают доступ через License, не через Subscription.
    """
    __tablename__ = "subscriptions"

    id          : Mapped[str]        = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    user_id     : Mapped[str]        = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    tariff_id   : Mapped[int]        = mapped_column(ForeignKey("tariffs.id"), nullable=False)
    status      : Mapped[SubStatus]  = mapped_column(Enum(SubStatus), default=SubStatus.trial, nullable=False)
    starts_at   : Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    expires_at  : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # Счётчик сессий для free-тарифа (сбрасывается ежедневно)
    sessions_today   : Mapped[int]   = mapped_column(Integer, default=0, nullable=False)
    sessions_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at  : Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at  : Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    user  : Mapped["User"]   = relationship("User", back_populates="subscription")
    tariff: Mapped["Tariff"] = relationship("Tariff", back_populates="subscriptions")

    __table_args__ = (
        Index("ix_subscriptions_status_expires", "status", "expires_at"),
    )


# ─────────────────────────────────────────────────────────────
# 6. DISORDERS — каталог расстройств
# ─────────────────────────────────────────────────────────────

class Disorder(Base):
    """
    Нозологии DSM-5 / МКБ-11.
    Создаёт суперадмин через панель администратора.
    Хранит критерии и типичное поведение в JSONB для гибкости.

    Пример criteria_dsm5:
    {
      "criteria_a": ["Навязчивые мысли...", "..."],
      "criteria_b": ["Повторяющееся поведение..."],
      "note": "Необходимо 1A + 1B или 2A"
    }
    """
    __tablename__ = "disorders"

    id               : Mapped[str]           = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    code_dsm5        : Mapped[Optional[str]] = mapped_column(String(20), index=True)   # e.g. "300.3"
    code_icd11       : Mapped[Optional[str]] = mapped_column(String(20), index=True)   # e.g. "6B20"
    name_ru          : Mapped[str]           = mapped_column(String(255), nullable=False)
    name_en          : Mapped[str]           = mapped_column(String(255), nullable=False)
    name_de          : Mapped[Optional[str]] = mapped_column(String(255))
    description_ru   : Mapped[Optional[str]] = mapped_column(Text)
    description_en   : Mapped[Optional[str]] = mapped_column(Text)
    description_de   : Mapped[Optional[str]] = mapped_column(Text)
    # Критерии диагностики: JSONB даёт гибкость без изменения схемы
    criteria_dsm5    : Mapped[Optional[dict]] = mapped_column(JSONB)
    typical_behaviors: Mapped[Optional[dict]] = mapped_column(JSONB)
    # Для обучающего режима перед сессией
    educational_text_ru: Mapped[Optional[str]] = mapped_column(Text)
    educational_text_en: Mapped[Optional[str]] = mapped_column(Text)
    learning_resources : Mapped[Optional[dict]] = mapped_column(JSONB)  # [{title, url, type}]
    is_active        : Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)
    created_by_id    : Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"))
    created_at       : Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at       : Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    patients: Mapped[List["PatientProfile"]] = relationship("PatientProfile", back_populates="disorder")

    __table_args__ = (
        Index("ix_disorders_active", "is_active"),
        Index("ix_disorders_codes", "code_dsm5", "code_icd11"),
    )


# ─────────────────────────────────────────────────────────────
# 7. PATIENT_PROFILES — конструктор пациентов
# ─────────────────────────────────────────────────────────────

class PatientProfile(Base):
    """
    Профиль AI-пациента.

    Ключевое поле — `lore` (TEXT): полная история жизни пациента.
    Это то что LLM получает как «системный промпт» роли.

    Дополнительные поля конструктора (trigger_topics, defense_mechanisms
    и т.д.) хранятся в JSONB-массивах — быстро, гибко, без migration при
    добавлении новых опций в UI.

    Видимость:
      is_public = True  → виден всем студентам платформы
      is_public = False → только creator + его вуз (university_id)
    """
    __tablename__ = "patient_profiles"

    id                 : Mapped[str]            = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    name               : Mapped[str]            = mapped_column(String(255), nullable=False)
    age                : Mapped[Optional[int]]  = mapped_column(SmallInteger)
    gender             : Mapped[Optional[str]]  = mapped_column(String(30))
    disorder_id        : Mapped[Optional[str]]  = mapped_column(ForeignKey("disorders.id"))
    severity           : Mapped[Optional[Severity]] = mapped_column(Enum(Severity))

    # Ключевое поле — лор / история пациента
    lore               : Mapped[Optional[str]]  = mapped_column(Text)

    # Характеристики из конструктора
    attachment_style   : Mapped[Optional[str]]  = mapped_column(String(50))
    motivation         : Mapped[Optional[str]]  = mapped_column(String(50))

    # JSONB-массивы: ["Семья", "Работа"]
    trigger_topics     : Mapped[Optional[list]] = mapped_column(JSONB)
    defense_mechanisms : Mapped[Optional[list]] = mapped_column(JSONB)

    speech_style       : Mapped[Optional[str]]  = mapped_column(Text)
    language           : Mapped[Language]       = mapped_column(Enum(Language), default=Language.ru, nullable=False)

    # Доступность
    is_public          : Mapped[bool]           = mapped_column(Boolean, default=False, nullable=False)
    university_id      : Mapped[Optional[str]]  = mapped_column(ForeignKey("universities.id"))
    created_by_id      : Mapped[Optional[str]]  = mapped_column(ForeignKey("users.id"))
    created_at         : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at         : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at         : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relations
    disorder   : Mapped[Optional["Disorder"]]    = relationship("Disorder", back_populates="patients")
    university : Mapped[Optional["University"]]  = relationship("University", back_populates="patients")
    created_by : Mapped[Optional["User"]]        = relationship("User", back_populates="created_patients", foreign_keys=[created_by_id])
    sessions   : Mapped[List["Session"]]         = relationship("Session", back_populates="patient")

    __table_args__ = (
        Index("ix_patient_profiles_university", "university_id"),
        Index("ix_patient_profiles_public", "is_public", "language"),
        Index("ix_patient_profiles_creator", "created_by_id"),
        # GIN-индекс для поиска внутри JSONB (опционально)
        # Index("ix_patient_triggers_gin", "trigger_topics", postgresql_using="gin"),
    )


# ─────────────────────────────────────────────────────────────
# 8. SESSIONS — тренировочные сессии
# ─────────────────────────────────────────────────────────────

class Session(Base):
    """
    Одна тренировочная сессия студента с AI-пациентом.

    Диалог хранится НЕ здесь, а в таблице `messages` (см. ниже).
    Это позволяет:
      - привязывать комментарии супервизора к конкретному ходу
      - делать full-text search по тексту диалогов
      - пагинировать длинные диалоги
      - анализировать отдельные реплики

    patient_state_snapshot — JSONB-снимок динамического
    состояния пациента (для режима psychotherapy).
    Обновляется LLM-сервисом после каждого хода.
    Пример: {"openness": 0.3, "trust": 0.1, "distress": 0.8}
    """
    __tablename__ = "sessions"

    id           : Mapped[str]           = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    student_id   : Mapped[str]           = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    patient_id   : Mapped[str]           = mapped_column(ForeignKey("patient_profiles.id"), nullable=False)
    mode         : Mapped[SessionMode]   = mapped_column(Enum(SessionMode), nullable=False)
    language     : Mapped[Language]      = mapped_column(Enum(Language), default=Language.ru, nullable=False)
    status       : Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.active, nullable=False)
    hints_enabled: Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    timer_minutes: Mapped[Optional[int]] = mapped_column(SmallInteger)

    # Временные метки
    started_at   : Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    paused_at    : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Хранение по 152-ФЗ: автоудаление через 365 дней
    expires_at   : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)

    # Снимок динамического состояния пациента (psychotherapy mode)
    patient_state_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB)

    # Relations
    student   : Mapped["User"]             = relationship("User", back_populates="sessions", foreign_keys=[student_id])
    patient   : Mapped["PatientProfile"]   = relationship("PatientProfile", back_populates="sessions")
    messages  : Mapped[List["Message"]]    = relationship("Message", back_populates="session", order_by="Message.sequence", cascade="all, delete-orphan")
    report    : Mapped[Optional["SessionReport"]] = relationship("SessionReport", back_populates="session", uselist=False, cascade="all, delete-orphan")
    comments  : Mapped[List["SupervisorComment"]] = relationship("SupervisorComment", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sessions_student_status", "student_id", "status"),
        Index("ix_sessions_student_started", "student_id", "started_at"),
        Index("ix_sessions_expires", "expires_at"),
    )


# ─────────────────────────────────────────────────────────────
# 9. MESSAGES — сообщения внутри сессии
# ─────────────────────────────────────────────────────────────

class Message(Base):
    """
    КАК МЫ ХРАНИМ ДИАЛОГ:

    Каждое сообщение — отдельная строка. Это лучший подход потому что:

    1. Привязка комментариев к конкретной реплике (SupervisorComment.message_id)
    2. Полнотекстовый поиск: CREATE INDEX ... USING gin(to_tsvector('russian', content))
    3. Аналитика по репликам: AVG длина, скорость ответа, частота вопросов
    4. Пагинация в UI без загрузки всего диалога
    5. Streaming: можно вставлять сообщение по мере генерации LLM

    Альтернативы (почему НЕ используем):
    - JSON-колонка в sessions: нет пагинации, нет FTS, нет FK-привязки
    - Отдельный файл/S3: нет SQL-запросов, нет транзакционности

    sequence — порядковый номер реплики внутри сессии (1, 2, 3...).
    Используем для сортировки и привязки комментариев.

    token_count — количество токенов LLM (для мониторинга расходов).
    response_ms — время генерации ответа пациента (метрика качества).
    """
    __tablename__ = "messages"

    id          : Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id  : Mapped[str]           = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role        : Mapped[MessageRole]   = mapped_column(Enum(MessageRole), nullable=False)
    content     : Mapped[str]           = mapped_column(Text, nullable=False)
    sequence    : Mapped[int]           = mapped_column(Integer, nullable=False)   # порядок в сессии
    token_count : Mapped[Optional[int]] = mapped_column(Integer)   # токены LLM
    response_ms : Mapped[Optional[int]] = mapped_column(Integer)   # миллисекунды генерации
    created_at  : Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    # Relations
    session  : Mapped["Session"]               = relationship("Session", back_populates="messages")
    comments : Mapped[List["SupervisorComment"]] = relationship("SupervisorComment", back_populates="message")

    __table_args__ = (
        UniqueConstraint("session_id", "sequence", name="uq_message_session_sequence"),
        Index("ix_messages_session_seq", "session_id", "sequence"),
        # Для full-text search по русскому тексту добавить в миграции:
        # CREATE INDEX ix_messages_fts ON messages USING gin(to_tsvector('russian', content));
    )


# ─────────────────────────────────────────────────────────────
# 10. SESSION_REPORTS — аналитический отчёт
# ─────────────────────────────────────────────────────────────

class SessionReport(Base):
    """
    Генерируется отдельным LLM-пайплайном после завершения сессии.
    Один отчёт на сессию (1:1).

    Метрики (0-100):
      score_questions    — качество вопросов (открытые, без давления)
      score_empathy      — эмпатия и активное слушание
      score_ethics       — соблюдение этики (нет диагнозов, нет назначений)
      score_interpretation — точность интерпретаций
      score_overall      — взвешенный итог

    pdf_s3_key — путь в Yandex Object Storage. NULL пока PDF не сгенерирован.
    """
    __tablename__ = "session_reports"

    id                  : Mapped[str]            = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    session_id          : Mapped[str]            = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Баллы
    score_questions     : Mapped[Optional[float]] = mapped_column(Float)
    score_empathy       : Mapped[Optional[float]] = mapped_column(Float)
    score_ethics        : Mapped[Optional[float]] = mapped_column(Float)
    score_interpretation: Mapped[Optional[float]] = mapped_column(Float)
    score_overall       : Mapped[Optional[float]] = mapped_column(Float)

    # Качественный фидбэк
    feedback_ru         : Mapped[Optional[str]]  = mapped_column(Text)
    feedback_en         : Mapped[Optional[str]]  = mapped_column(Text)

    # Для psychotherapy: описание динамики
    dynamic_summary     : Mapped[Optional[str]]  = mapped_column(Text)

    # PDF
    pdf_s3_key          : Mapped[Optional[str]]  = mapped_column(String(500))   # ключ в S3
    pdf_generated_at    : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    generated_at        : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    # Relations
    session   : Mapped["Session"]        = relationship("Session", back_populates="report")
    red_flags : Mapped[List["RedFlag"]]  = relationship("RedFlag", back_populates="report", cascade="all, delete-orphan")


# ─────────────────────────────────────────────────────────────
# 11. RED_FLAGS — красные флаги в отчёте
# ─────────────────────────────────────────────────────────────

class RedFlag(Base):
    """
    Красные флаги — нарушения этики или клинические ошибки.
    Вынесены в отдельную таблицу для точной привязки к message_id.

    Примеры высокой серьёзности (high):
      - Студент поставил диагноз ("у вас депрессия")
      - Рекомендовал препараты
      - Нарушил конфиденциальность
      - Задавал наводящие вопросы

    message_id — конкретная реплика где это произошло.
    """
    __tablename__ = "red_flags"

    id        : Mapped[int]               = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    report_id : Mapped[str]               = mapped_column(ForeignKey("session_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id: Mapped[Optional[int]]     = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"))
    severity  : Mapped[RedFlagSeverity]   = mapped_column(Enum(RedFlagSeverity), nullable=False)
    text      : Mapped[str]               = mapped_column(Text, nullable=False)

    report : Mapped["SessionReport"] = relationship("SessionReport", back_populates="red_flags")


# ─────────────────────────────────────────────────────────────
# 12. SUPERVISOR_COMMENTS — комментарии супервизора
# ─────────────────────────────────────────────────────────────

class SupervisorComment(Base):
    """
    Супервизор или преподаватель оставляет текстовый комментарий
    к конкретному сообщению студента (message_id).
    Студент видит эти комментарии в отчёте.
    """
    __tablename__ = "supervisor_comments"

    id           : Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id   : Mapped[str]           = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id   : Mapped[Optional[int]] = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"))
    supervisor_id: Mapped[str]           = mapped_column(ForeignKey("users.id"), nullable=False)
    text         : Mapped[str]           = mapped_column(Text, nullable=False)
    created_at   : Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    session    : Mapped["Session"] = relationship("Session", back_populates="comments")
    message    : Mapped[Optional["Message"]] = relationship("Message", back_populates="comments")
    supervisor : Mapped["User"]   = relationship("User", back_populates="supervisor_comments")

    __table_args__ = (
        Index("ix_sup_comments_session", "session_id"),
    )


# ─────────────────────────────────────────────────────────────
# 13. PAYMENTS — платежи YooKassa
# ─────────────────────────────────────────────────────────────

class Payment(Base):
    """
    Фиксируем каждую попытку платежа и её результат.
    При успехе (webhook payment.succeeded) активируем Subscription или License.

    yookassa_id — ID платежа в YooKassa (для идемпотентности webhook).
    metadata_json — произвольные данные для восстановления контекста в webhook.
    """
    __tablename__ = "payments"

    id            : Mapped[str]             = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    user_id       : Mapped[Optional[str]]   = mapped_column(ForeignKey("users.id"))
    university_id : Mapped[Optional[str]]   = mapped_column(ForeignKey("universities.id"))
    yookassa_id   : Mapped[Optional[str]]   = mapped_column(String(100), unique=True, index=True)
    amount        : Mapped[float]           = mapped_column(Float, nullable=False)
    currency      : Mapped[str]             = mapped_column(String(3), default="RUB", nullable=False)
    status        : Mapped[PaymentStatus]   = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    description   : Mapped[Optional[str]]   = mapped_column(Text)
    metadata_json : Mapped[Optional[dict]]  = mapped_column(JSONB)   # {plan, quantity, ...}
    created_at    : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    paid_at       : Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user : Mapped[Optional["User"]] = relationship("User", back_populates="payments")

    __table_args__ = (
        Index("ix_payments_user_status", "user_id", "status"),
        Index("ix_payments_created", "created_at"),
    )


# ─────────────────────────────────────────────────────────────
# 14. AUDIT_LOGS — аудит-лог
# ─────────────────────────────────────────────────────────────

class AuditLog(Base):
    """
    Логируем все критичные действия администраторов и системы.
    Студентские действия (отправка сообщения) сюда НЕ идут —
    они и так сохранены в messages.

    Что логируем:
      register, login, logout
      change_role, deactivate_user, invite_user
      create_university, update_license
      create_disorder, update_disorder
      payment_succeeded, payment_failed
      delete_account (152-ФЗ)
    """
    __tablename__ = "audit_logs"

    id            : Mapped[int]          = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id       : Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action        : Mapped[str]          = mapped_column(String(100), nullable=False, index=True)
    resource_type : Mapped[Optional[str]] = mapped_column(String(50))   # "user" | "session" | "license"
    resource_id   : Mapped[Optional[str]] = mapped_column(String(100))
    ip_address    : Mapped[Optional[str]] = mapped_column(INET)
    user_agent    : Mapped[Optional[str]] = mapped_column(String(500))
    extra         : Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at    : Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_user_action", "user_id", "action"),
        Index("ix_audit_logs_created", "created_at"),
        # Секционирование по created_at добавляется в Alembic-миграции отдельно
    )


# ─────────────────────────────────────────────────────────────
# 15. PASSWORD_HISTORY
# ─────────────────────────────────────────────────────────────

class PasswordHistory(Base):
    """
    Храним последние 5 хэшей паролей.
    При смене пароля — проверяем, что новый не совпадает с одним из последних.
    """
    __tablename__ = "password_history"

    id            : Mapped[int]      = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id       : Mapped[str]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    password_hash : Mapped[str]      = mapped_column(String(255), nullable=False)
    changed_at    : Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="password_history")

    __table_args__ = (
        Index("ix_password_history_user_date", "user_id", "changed_at"),
    )


# ─────────────────────────────────────────────────────────────
# 16. EMAIL_HISTORY
# ─────────────────────────────────────────────────────────────

class EmailHistory(Base):
    """
    История смен email. Нужна для:
    - Уведомления на старый email при смене (безопасность)
    - Аудита при спорах
    - 152-ФЗ compliance
    """
    __tablename__ = "email_history"

    id         : Mapped[int]      = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id    : Mapped[str]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    old_email  : Mapped[str]      = mapped_column(String(255), nullable=False)
    new_email  : Mapped[str]      = mapped_column(String(255), nullable=False)
    changed_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="email_history")

    __table_args__ = (
        Index("ix_email_history_user_date", "user_id", "changed_at"),
    )