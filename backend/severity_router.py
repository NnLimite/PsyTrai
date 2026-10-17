"""
severity_router.py — роутер для управления выраженностью симптомов.

Подключите в main.py:
    from severity_router import router as severity_router
    app.include_router(severity_router)

Эндпоинты:
  PUT  /api/patients/{id}/severity          — обновить выраженность
  GET  /api/patients/{id}/severity          — получить текущее состояние
  GET  /api/patients/{id}/severity/history  — история изменений
  POST /api/patients/{id}/state/update      — обновить динамическое состояние после реплики
  GET  /api/patients/{id}/state             — получить полное состояние
  POST /api/sessions/{sid}/analyze-state    — анализ изменения состояния за сессию
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
import json, time, math
from datetime import datetime, timezone
from pathlib import Path

router = APIRouter()

# ─── Хранилище (в памяти + JSON-файл как персистентность) ─────
# В production замените на PostgreSQL через SQLAlchemy
STATE_FILE = Path("./patient_states.json")

def _load_states() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {}

def _save_states(data: dict):
    STATE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

# ─── Модели данных ────────────────────────────────────────────

class SeverityMetrics(BaseModel):
    """Выраженность симптомов (0-100). Управляется психологом вручную."""
    total: int = Field(50, ge=0, le=95, description="Общая выраженность 0-95%")
    intensity: int = Field(50, ge=0, le=100)         # Интенсивность симптомов
    reactivity: int = Field(50, ge=0, le=100)        # Эмоциональная реактивность
    cognitive_distortions: int = Field(50, ge=0, le=100)  # Когнитивные искажения
    social_isolation: int = Field(50, ge=0, le=100)  # Социальная изоляция
    suicidal_ideation: int = Field(0, ge=0, le=95)   # Суицидальные мысли (макс 95)

    @validator("total")
    def cap_total(cls, v):
        return min(v, 95)  # Максимум 95 — оставляем пространство для улучшения


class DynamicState(BaseModel):
    """
    Динамическое состояние пациента — меняется автоматически
    в зависимости от качества работы консультанта.
    Накапливается от сессии к сессии.
    """
    openness: float = Field(20.0, ge=0, le=100)       # Открытость
    trust: float = Field(15.0, ge=0, le=100)           # Доверие к консультанту
    distress: float = Field(85.0, ge=0, le=100)        # Дистресс
    symptom_level: float = Field(90.0, ge=0, le=100)   # Симптоматика
    motivation: float = Field(30.0, ge=0, le=100)      # Мотивация к изменениям


class PatientFullState(BaseModel):
    patient_id: str
    severity: SeverityMetrics = SeverityMetrics()
    dynamic: DynamicState = DynamicState()
    stage: str = "resistance"          # resistance | exploration | insight | integration
    session_count: int = 0
    total_sessions_needed: int = 10    # зависит от расстройства и тяжести
    is_healed: bool = False
    healing_stable_sessions: int = 0   # сколько сессий держится улучшение
    severity_history: List[dict] = []
    state_history: List[dict] = []
    updated_at: str = ""


class UpdateSeverityRequest(BaseModel):
    severity: SeverityMetrics
    reason: Optional[str] = None  # причина изменения (для лога)


class UpdateStateRequest(BaseModel):
    """Обновление динамического состояния после реплики консультанта."""
    consultant_message: str
    patient_response: str
    delta: Optional[Dict[str, float]] = None  # Если None — вычисляем автоматически


class AnalyzeSessionStateRequest(BaseModel):
    """Анализ целой сессии для обновления долгосрочного состояния."""
    transcript: List[dict]              # [{"role": "student"/"patient", "content": "..."}]
    session_score: Optional[float] = None  # Общая оценка сессии (0-100)
    disorder: str = ""
    severity_label: str = "moderate"


# ─── Конфигурации расстройств ─────────────────────────────────

DISORDER_SESSION_NEEDS = {
    "ГТР": (5, 8), "GAD": (5, 8),
    "Депрессия": (10, 15), "Depression": (10, 15), "MDD": (10, 15),
    "Фобия": (6, 10), "Phobia": (6, 10),
    "ПТСР": (15, 25), "PTSD": (15, 25),
    "ОКР": (15, 25), "OCD": (15, 25),
    "БПЛ": (25, 40), "BPD": (25, 40),
    "Шизофрения": (20, 35), "Schizophrenia": (20, 35),
}

INITIAL_STATE_BY_SEVERITY = {
    "mild":     DynamicState(openness=40, trust=30, distress=35, symptom_level=30, motivation=55),
    "moderate": DynamicState(openness=20, trust=15, distress=65, symptom_level=65, motivation=30),
    "severe":   DynamicState(openness=10, trust=10, distress=85, symptom_level=90, motivation=15),
}


# ─── Вспомогательные функции ──────────────────────────────────

def _get_state(patient_id: str) -> PatientFullState:
    states = _load_states()
    if patient_id not in states:
        return PatientFullState(
            patient_id=patient_id,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
    return PatientFullState(**states[patient_id])


def _save_state(state: PatientFullState):
    states = _load_states()
    states[state.patient_id] = state.dict()
    _save_states(states)


def _compute_stage(s: DynamicState) -> str:
    if s.distress > 70 and s.openness < 30:
        return "resistance"
    if 30 <= s.openness <= 60 and 40 <= s.trust <= 65:
        return "exploration"
    if s.openness > 60 and 25 <= s.distress <= 60:
        return "insight"
    if s.distress < 30 and s.motivation > 70 and s.openness > 70:
        return "integration"
    # Промежуточные состояния
    if s.openness > 45 and s.trust > 45:
        return "exploration"
    return "resistance"


def _check_healing(s: DynamicState) -> bool:
    """Критерии излечения по всем 5 метрикам."""
    return (
        s.distress < 20 and
        s.openness > 80 and
        s.trust > 75 and
        s.motivation > 80 and
        s.symptom_level < 20
    )


def _severity_to_llm_params(total: int) -> dict:
    """Параметры LLM в зависимости от выраженности."""
    if total <= 30:
        return {"temperature": 0.6, "top_p": 0.85, "max_tokens": 200,
                "style": "calm_reflective",
                "description": "Симптомы слабо выражены. Пациент способен к рефлексии и инсайтам."}
    elif total <= 60:
        return {"temperature": 0.7, "top_p": 0.90, "max_tokens": 150,
                "style": "anxious_paused",
                "description": "Симптомы умеренные. Пациент тревожен, иногда теряет мысль, но способен обсуждать."}
    elif total <= 85:
        return {"temperature": 0.8, "top_p": 0.95, "max_tokens": 100,
                "style": "distressed_short",
                "description": "Симптомы сильно выражены. Пациент в дистрессе, ответы короткие и эмоциональные."}
    else:
        return {"temperature": 0.9, "top_p": 0.98, "max_tokens": 60,
                "style": "critical_fragmented",
                "description": "КРИТИЧЕСКОЕ СОСТОЯНИЕ. Пациент в остром кризисе. Ответы фрагментированные."}


def _auto_delta_from_message(msg: str) -> Dict[str, float]:
    """
    Эвристика: анализ реплики консультанта → дельта состояния.
    В production замените на LLM-анализ.
    """
    lower = msg.lower()
    delta: Dict[str, float] = {
        "openness": 0.0, "trust": 0.0,
        "distress": 0.0, "symptom_level": 0.0, "motivation": 0.0,
    }

    # ПОЗИТИВНЫЕ паттерны
    empathy_words = ["понимаю", "слышу", "чувствую", "тяжело", "сложно",
                     "важно", "значит для вас", "i hear", "sounds hard"]
    open_questions = ["расскажите", "опишите", "как вы", "что происходит",
                      "tell me", "describe", "how do you", "what happened"]
    validation = ["нормально", "понятно", "конечно", "естественно",
                  "makes sense", "understandable"]
    reflection = ["вы сказали", "если я правильно понимаю", "звучит как",
                  "you said", "sounds like", "if i understand"]

    if any(w in lower for w in empathy_words):
        delta["trust"] += 2.0
        delta["openness"] += 1.5
        delta["distress"] -= 1.0

    if any(w in lower for w in open_questions):
        delta["openness"] += 1.5
        delta["motivation"] += 0.5

    if any(w in lower for w in validation):
        delta["trust"] += 1.5
        delta["distress"] -= 0.5

    if any(w in lower for w in reflection):
        delta["trust"] += 1.0
        delta["openness"] += 1.0
        delta["motivation"] += 1.0

    # НЕГАТИВНЫЕ паттерны
    directive = ["вы должны", "вам нужно", "сделайте", "попробуйте просто",
                 "you should", "you need to", "just try"]
    interruption_signs = ["нет, но", "погодите", "я имел в виду другое"]
    premature_interp = ["это потому что", "это значит что вы", "очевидно что",
                        "clearly you", "this is because", "it's obvious"]

    if any(w in lower for w in directive):
        delta["trust"] -= 2.0
        delta["openness"] -= 1.0

    if any(w in lower for w in premature_interp):
        delta["trust"] -= 2.5
        delta["distress"] += 1.0

    # Упоминание триггерных тем — временный рост дистресса
    triggers = ["смерть", "развод", "отец", "мать", "насилие", "детство",
                "death", "divorce", "father", "mother", "violence", "childhood"]
    if any(w in lower for w in triggers):
        delta["distress"] += 2.5
        delta["openness"] -= 0.5  # временно закрывается

    return delta


def _smooth_apply(current: float, delta: float, max_step: float = 5.0) -> float:
    """Плавное применение дельты (не более max_step за раз)."""
    clamped = max(-max_step, min(max_step, delta))
    return max(0.0, min(100.0, current + clamped))


# ─── Эндпоинты ────────────────────────────────────────────────

@router.get("/api/patients/{patient_id}/state")
def get_patient_state(patient_id: str):
    """Получить полное состояние пациента (severity + dynamic + stage + история)."""
    state = _get_state(patient_id)
    llm_params = _severity_to_llm_params(state.severity.total)
    return {
        "patient_id": patient_id,
        "severity": state.severity.dict(),
        "dynamic": state.dynamic.dict(),
        "stage": state.stage,
        "stage_label": {
            "resistance":  "Сопротивление",
            "exploration": "Исследование",
            "insight":     "Инсайт",
            "integration": "Интеграция",
        }.get(state.stage, "—"),
        "is_healed": state.is_healed,
        "session_count": state.session_count,
        "total_sessions_needed": state.total_sessions_needed,
        "progress_pct": min(100, round(state.session_count / max(1, state.total_sessions_needed) * 100)),
        "llm_params": llm_params,
        "healing_check": _check_healing(state.dynamic),
    }


@router.get("/api/patients/{patient_id}/severity")
def get_severity(patient_id: str):
    state = _get_state(patient_id)
    llm = _severity_to_llm_params(state.severity.total)
    return {
        "severity": state.severity.dict(),
        "llm_params": llm,
        "warning_high": state.severity.total > 80,
        "warning_suicidal": state.severity.suicidal_ideation > 50,
    }


@router.put("/api/patients/{patient_id}/severity")
def update_severity(patient_id: str, req: UpdateSeverityRequest):
    """Обновить выраженность симптомов вручную (действие психолога)."""
    state = _get_state(patient_id)
    old_total = state.severity.total

    # Применяем плавно: суммарное изменение не более 20% за раз
    new_total = req.severity.total
    if abs(new_total - old_total) > 20:
        new_total = old_total + (20 if new_total > old_total else -20)
        req.severity.total = new_total

    state.severity = req.severity

    # Синхронизируем dynamic.symptom_level с severity.total
    delta_symptom = (req.severity.total - old_total) * 0.5
    state.dynamic.symptom_level = max(0, min(100, state.dynamic.symptom_level + delta_symptom))
    state.dynamic.distress = max(0, min(100, state.dynamic.distress + delta_symptom * 0.3))

    # Обновляем стадию
    state.stage = _compute_stage(state.dynamic)

    # Пишем в историю
    state.severity_history.append({
        "ts": datetime.now(timezone.utc).isoformat(),
        "total": state.severity.total,
        "old_total": old_total,
        "reason": req.reason or "manual",
        "intensity": req.severity.intensity,
        "reactivity": req.severity.reactivity,
        "cognitive_distortions": req.severity.cognitive_distortions,
        "social_isolation": req.severity.social_isolation,
        "suicidal_ideation": req.severity.suicidal_ideation,
    })
    # Держим последние 100 записей
    state.severity_history = state.severity_history[-100:]

    state.updated_at = datetime.now(timezone.utc).isoformat()
    _save_state(state)

    return {
        "ok": True,
        "severity": state.severity.dict(),
        "llm_params": _severity_to_llm_params(state.severity.total),
        "warning_high": state.severity.total > 80,
        "warning_suicidal": state.severity.suicidal_ideation > 50,
        "new_stage": state.stage,
    }


@router.get("/api/patients/{patient_id}/severity/history")
def get_severity_history(patient_id: str, limit: int = 50):
    state = _get_state(patient_id)
    return {
        "patient_id": patient_id,
        "history": state.severity_history[-limit:],
        "total_entries": len(state.severity_history),
    }


@router.post("/api/patients/{patient_id}/state/update")
def update_state_after_message(patient_id: str, req: UpdateStateRequest):
    """
    Обновить динамическое состояние после реплики консультанта.
    Вызывается после каждого сообщения студента.
    """
    state = _get_state(patient_id)
    old = state.dynamic.dict()

    # Вычисляем дельту
    delta = req.delta if req.delta else _auto_delta_from_message(req.consultant_message)

    # Применяем плавно
    d = state.dynamic
    d.openness      = _smooth_apply(d.openness,      delta.get("openness",      0.0))
    d.trust         = _smooth_apply(d.trust,          delta.get("trust",         0.0))
    d.distress      = _smooth_apply(d.distress,       delta.get("distress",      0.0))
    d.symptom_level = _smooth_apply(d.symptom_level,  delta.get("symptom_level", 0.0))
    d.motivation    = _smooth_apply(d.motivation,     delta.get("motivation",    0.0))

    # Синхронизируем severity.total с symptom_level
    state.severity.total = min(95, round(d.symptom_level))

    # Пересчитываем стадию
    state.stage = _compute_stage(d)

    # Проверяем излечение
    if _check_healing(d):
        state.healing_stable_sessions += 1
        if state.healing_stable_sessions >= 2:
            state.is_healed = True
    else:
        state.healing_stable_sessions = max(0, state.healing_stable_sessions - 1)

    # Пишем в историю состояния (каждые 3 записи, чтобы не раздуть)
    if len(state.state_history) % 3 == 0:
        state.state_history.append({
            "ts": datetime.now(timezone.utc).isoformat(),
            **d.dict(),
            "stage": state.stage,
        })
    state.state_history = state.state_history[-200:]

    state.updated_at = datetime.now(timezone.utc).isoformat()
    _save_state(state)

    return {
        "ok": True,
        "dynamic": d.dict(),
        "delta_applied": delta,
        "old": old,
        "stage": state.stage,
        "is_healed": state.is_healed,
        "warning_high_distress": d.distress > 80,
        "llm_params": _severity_to_llm_params(state.severity.total),
    }


@router.post("/api/sessions/{session_id}/analyze-state")
def analyze_session_state(session_id: str, req: AnalyzeSessionStateRequest, patient_id: str):
    """
    Обновить долгосрочное состояние после завершения сессии.
    score=100 → значительное улучшение, score=0 → ухудшение.
    """
    state = _get_state(patient_id)
    state.session_count += 1
    d = state.dynamic

    score = req.session_score or 50.0  # 0-100

    # Масштаб изменений зависит от расстройства и стадии терапии
    base_change = (score - 50) / 100 * 12.0  # ±6% за сессию при идеальной/нулевой работе

    # Резистентность снижается медленнее
    resistance_factor = 1.5 if state.stage == "resistance" else 1.0

    def session_delta(metric_val: float, positive_dir: float) -> float:
        """positive_dir: +1 если хорошая оценка улучшает метрику, -1 если ухудшает."""
        change = base_change * positive_dir / resistance_factor
        # Плато-эффект: чем ближе к предельному значению, тем медленнее изменения
        if positive_dir > 0 and metric_val > 70:
            change *= 0.5
        if positive_dir < 0 and metric_val < 30:
            change *= 0.5
        return change

    d.openness      = _smooth_apply(d.openness,      session_delta(d.openness,      +1), 10)
    d.trust         = _smooth_apply(d.trust,          session_delta(d.trust,         +1), 10)
    d.distress      = _smooth_apply(d.distress,       session_delta(d.distress,      -1), 10)
    d.symptom_level = _smooth_apply(d.symptom_level,  session_delta(d.symptom_level, -1), 8)
    d.motivation    = _smooth_apply(d.motivation,     session_delta(d.motivation,    +1), 10)

    # Рецидивы: есть ли триггеры в транскрипте?
    all_text = " ".join(m.get("content", "") for m in req.transcript if m.get("role") == "patient").lower()
    trigger_hits = sum(1 for t in ["страшно", "не могу", "бессмысленно", "умереть", "беспомощен"] if t in all_text)
    if trigger_hits >= 2:
        d.distress      = min(100, d.distress + 5)
        d.symptom_level = min(100, d.symptom_level + 3)

    state.severity.total = min(95, round(d.symptom_level))
    state.stage = _compute_stage(d)

    # Проверка излечения
    if _check_healing(d):
        state.healing_stable_sessions += 1
        if state.healing_stable_sessions >= 2:
            state.is_healed = True
    else:
        state.healing_stable_sessions = max(0, state.healing_stable_sessions - 1)

    # Минимальное кол-во сессий для расстройства
    disorder_key = req.disorder or "Депрессия"
    lo, hi = DISORDER_SESSION_NEEDS.get(disorder_key, (10, 15))
    state.total_sessions_needed = lo if req.severity_label == "mild" else hi

    state.state_history.append({
        "ts": datetime.now(timezone.utc).isoformat(),
        **d.dict(),
        "stage": state.stage,
        "session_count": state.session_count,
        "session_score": score,
    })

    state.updated_at = datetime.now(timezone.utc).isoformat()
    _save_state(state)

    return {
        "ok": True,
        "session_count": state.session_count,
        "dynamic": d.dict(),
        "stage": state.stage,
        "is_healed": state.is_healed,
        "healing_stable_sessions": state.healing_stable_sessions,
        "progress_pct": min(100, round(state.session_count / max(1, state.total_sessions_needed) * 100)),
        "trigger_hits": trigger_hits,
    }


@router.get("/api/patients/{patient_id}/state/history")
def get_state_history(patient_id: str, limit: int = 100):
    state = _get_state(patient_id)
    return {
        "patient_id": patient_id,
        "history": state.state_history[-limit:],
        "session_count": state.session_count,
        "is_healed": state.is_healed,
    }


@router.post("/api/patients/{patient_id}/state/reset")
def reset_patient_state(patient_id: str, disorder: str = "moderate", severity_label: str = "moderate"):
    """Сбросить состояние пациента к начальным значениям."""
    init = INITIAL_STATE_BY_SEVERITY.get(severity_label, INITIAL_STATE_BY_SEVERITY["moderate"])
    state = PatientFullState(
        patient_id=patient_id,
        dynamic=init,
        severity=SeverityMetrics(total=round(init.symptom_level)),
        stage=_compute_stage(init),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    _save_state(state)
    return {"ok": True, "state": state.dict()}


@router.get("/api/patients/{patient_id}/llm-context")
def get_llm_context(patient_id: str):
    """
    Получить текстовый контекст для включения в LLM-промпт.
    Вызывается перед каждым ответом пациента.
    """
    state = _get_state(patient_id)
    d = state.dynamic
    s = state.severity
    llm = _severity_to_llm_params(s.total)

    stage_instructions = {
        "resistance": (
            "Ты в стадии СОПРОТИВЛЕНИЯ. Ты подозрителен, защищаешься, отвечаешь коротко. "
            "Часто говоришь 'не знаю', уходишь от темы, смотришь в сторону."
        ),
        "exploration": (
            "Ты в стадии ИССЛЕДОВАНИЯ. Ты готов говорить о проблемах, но осторожно. "
            "Иногда делишься чем-то личным, но потом берёшь паузу."
        ),
        "insight": (
            "Ты в стадии ИНСАЙТА. Ты начинаешь понимать связи между событиями и своими реакциями. "
            "Можешь сказать 'Я понимаю, что это связано с...'. Больше рефлексии, меньше защиты."
        ),
        "integration": (
            "Ты в стадии ИНТЕГРАЦИИ. Ты чувствуешь значительное улучшение. "
            "Говоришь о планах, инсайтах. Симптомы ещё есть, но не управляют тобой."
        ),
    }

    severity_instruction = {
        "calm_reflective":    "Отвечай спокойно, развёрнуто (3-4 предложения). Способен к рефлексии.",
        "anxious_paused":     "Отвечай с паузами (...), иногда теряй мысль. 2-3 предложения. Тревожный тон.",
        "distressed_short":   "Отвечай коротко (1-2 предложения). Резкий, напряжённый. Мало рефлексии.",
        "critical_fragmented":"Отвечай очень коротко (1 предложение). Фрагментированно. Острый кризис.",
    }.get(llm["style"], "")

    context_block = f"""
=== ТЕКУЩЕЕ СОСТОЯНИЕ ПАЦИЕНТА ===
Стадия терапии: {state.stage.upper()} ({stage_instructions.get(state.stage, '')})

Числовые параметры (ИСПОЛЬЗУЙ ДЛЯ ТОНА, НЕ ЦИТИРУЙ):
- Открытость: {d.openness:.0f}/100
- Доверие: {d.trust:.0f}/100  
- Дистресс: {d.distress:.0f}/100
- Выраженность симптомов: {s.total}/100
- Мотивация: {d.motivation:.0f}/100

Стиль ответа: {severity_instruction}
Количество сессий с этим консультантом: {state.session_count}
{'ПРЕДУПРЕЖДЕНИЕ: Высокий суицидальный риск! Говори о безысходности.' if s.suicidal_ideation > 50 else ''}
{'ПРЕДУПРЕЖДЕНИЕ: Острый кризис! Ответы максимально короткие и эмоциональные.' if s.total > 85 else ''}
================================="""

    return {
        "context_block": context_block,
        "llm_params": llm,
        "stage": state.stage,
        "is_healed": state.is_healed,
    }