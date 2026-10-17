from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.all_models import Session, Patient, Disorder, User
from app.schemas import ChatMessageRequest, SessionStartRequest, SessionCompleteRequest
from app.services.llm_service import llm_service
from app.utils.deps import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/start")
async def start_new_session(payload: SessionStartRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, payload.patient_id)
    if not patient:
        raise HTTPException(404, "Профиль пациента не найден")
        
    new_session = Session(
        patient_id=patient.id,
        therapist_id=current_user.id,
        mode=payload.mode,
        language=payload.language,
        status="active"
    )
    db.add(new_session)
    await db.commit()
    return {"session_id": new_session.id, "status": "started"}

@router.post("/{session_id}/pause")
async def pause_session(session_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.therapist_id != current_user.id:
        raise HTTPException(404, "Сессия не найдена")
        
    if session.status == "active":
        session.status = "paused"
        session.last_paused_at = datetime.now(timezone.utc)
        db.add(session)
        await db.commit()
    return {"status": "paused"}

@router.post("/{session_id}/resume")
async def resume_session(session_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.therapist_id != current_user.id:
        raise HTTPException(404, "Сессия не найдена")
        
    if session.status == "paused" and session.last_paused_at:
        delta = (datetime.now(timezone.utc) - session.last_paused_at.replace(tzinfo=timezone.utc)).total_seconds()
        session.total_paused_seconds += int(delta)
        session.status = "active"
        session.last_paused_at = None
        db.add(session)
        await db.commit()
    return {"status": "active"}

@router.post("/{session_id}/chat")
async def chat_with_patient(session_id: int, msg: ChatMessageRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.therapist_id != current_user.id:
        raise HTTPException(404, "Сессия не найдена")
    if session.status != "active":
        raise HTTPException(400, "Нельзя отправлять сообщения в неактивную сессию")
        
    patient = await db.get(Patient, session.patient_id)
    disorder = await db.get(Disorder, patient.disorder_id)
    
    # Защита от мутаций списков в JSON SQLAlchemy: собираем новый инстанс списка
    updated_history = list(session.chat_history)
    updated_history.append({"role": "user", "content": msg.content, "time": datetime.now(timezone.utc).isoformat()})
    
    # Сборка Системного промпта на основе языка сессии
    lang_map = {"ru": disorder.name_ru, "en": disorder.name_en, "de": disorder.name_de}
    current_disorder_name = lang_map.get(session.language, disorder.name_ru)
    
    system_prompt = (
        f"Ты — виртуальный пациент. Твое имя: {patient.first_name} {patient.last_name}. Возраст: {patient.age}. Пол: {patient.gender}. "
        f"Твой клинический диагноз: {current_disorder_name}. Выраженность симптоматики: {patient.severity}. "
        f"Тип привязанности: {patient.attachment_type}. Уровень мотивации к сессии: {patient.motivation}. "
        f"Твоя жизненная история (Лор): {patient.background_story}. "
        f"Твои глубокие триггеры, на которые ты реагируешь болезненно: {', '.join(patient.trigger_themes)}. "
        f"Твои привычные защитные механизмы психики: {', '.join(patient.defense_mechanisms)}. "
        f"Отвечай строго на языке: {session.language}. Не выходи из роли ни при каких условиях."
    )
    
    # Реализация динамики в режиме "Психотерапия"
    if session.mode == "psychotherapy" and len(updated_history) > 6:
        system_prompt += " Консультация перешла в глубокую фазу. Если терапевт был эмпатичен, прояви чуть больше раскрытия, если агрессивен — включи сопротивление."
        
    # Запрос к сервису симуляции
    patient_reply = await llm_service.generate_patient_reply(system_prompt, updated_history)
    
    updated_history.append({"role": "assistant", "content": patient_reply, "time": datetime.now(timezone.utc).isoformat()})
    session.chat_history = updated_history
    
    db.add(session)
    await db.commit()
    return {"reply": patient_reply}

@router.post("/{session_id}/complete")
async def complete_session(session_id: int, payload: SessionCompleteRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.therapist_id != current_user.id:
        raise HTTPException(404, "Сессия не найдена")
        
    session.status = "completed"
    session.ended_at = datetime.now(timezone.utc)
    if payload.supervisor_comments:
        session.supervisor_comments = payload.supervisor_comments
        
    # Отдельный изолированный пайплайн анализа сессии на Red Flags
    score = 100
    flags = []
    
    # Алгоритмическая проверка критических запретов ТЗ для режима "Психология"
    if session.mode == "psychology":
        forbidden_roots = ["назначаю", "рекомендую принять", "рецепт", "выпишу", "лекарств", "антидепрессан", "у вас шизофрения", "ваш диагноз"]
        for msg in session.chat_history:
            if msg["role"] == "user":
                text = msg["content"].lower()
                if any(root in text for root in forbidden_roots):
                    score -= 40
                    flags.append("Нарушение границ роли: Попытка утверждения диагноза или назначения медикаментозного лечения в режиме психологического консультирования.")
                    
    session.analytics_report = {
        "score": max(score, 0),
        "red_flags": flags,
        "feedback": "Автоматический разбор: этические границы соблюдены." if score == 100 else f"Выявлены нарушения: {'; '.join(flags)}"
    }
    
    db.add(session)
    await db.commit()
    return {"message": "Сессия успешно завершена", "analytics": session.analytics_report}