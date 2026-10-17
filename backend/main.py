"""
PsyTrainer AI Backend — симулятор пациента
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import ollama
import chromadb
from chromadb.utils import embedding_functions
import os
import json
import time
import logging

from severity_router import get_llm_context, update_state_after_message
# ─── ИМПОРТ НОВОГО РОУТЕРА ────────────────────────────────────
from severity_router import router as severity_router

# ─── Логирование ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("psytrainer")
os.environ["CHROMA_TELEMETRY_IMPL"] = "none"

# ─── Приложение ───────────────────────────────────────────────
app = FastAPI(title="PsyTrainer AI Backend", version="2.0.0")

app.include_router(severity_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ПОДКЛЮЧЕНИЕ РОУТЕРОВ ────────────────────────────────────
app.include_router(severity_router)  # ← ДОБАВИТЬ ЭТУ СТРОКУ!

# ─── Конфиг ───────────────────────────────────────────────────
MODEL_NAME = "qwen2.5:7b"
CHROMA_PATH = "./chroma_db"

# ─── Хранилище пациентов ─────────────────────────────────────
patients_db = []
patient_counter = 0

# ─── ChromaDB ─────────────────────────────────────────────────
os.makedirs(CHROMA_PATH, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

try:
    embedder = embedding_functions.DefaultEmbeddingFunction()
except:
    embedder = None

collection = chroma_client.get_or_create_collection(
    name="dsm_knowledge",
    embedding_function=embedder
)

# Базовые знания
BASE_KNOWLEDGE = [
    "ОКР: обсессии и компульсии. Пациенты знают, что ритуалы нелогичны.",
    "Депрессия: подавленное настроение, ангедония, усталость, нарушения сна.",
    "ГТР: хроническая тревога >6 месяцев, трудно контролируемая.",
    "ПТСР: флэшбэки, избегание, гипербдительность после травмы.",
    "Активное слушание: отражение эмоций, перефразирование, паузы.",
    "Открытые вопросы: 'Как', 'Что', 'Расскажите', 'Опишите'.",
]

if collection.count() == 0:
    log.info("📚 Загружаем базу знаний...")
    collection.add(documents=BASE_KNOWLEDGE, ids=[f"doc_{i}" for i in range(len(BASE_KNOWLEDGE))])
    log.info(f"✅ Загружено {len(BASE_KNOWLEDGE)} документов")

# ─── Модели ────────────────────────────────────────────────────
class HistoryMessage(BaseModel):
    role: str
    content: str

class PatientProfile(BaseModel):
    name: str
    age: int
    gender: str = "не указан"
    disorder: str
    severity: str = "moderate"
    lore: str
    mode: str = "diagnostics"
    language: str = "ru"

class ChatRequest(BaseModel):
    message: str
    patient: PatientProfile
    patient_id: Optional[str] = None  # ← ДОБАВИТЬ
    history: List[HistoryMessage] = []
    hints_enabled: bool = False

class ChatResponse(BaseModel):
    response: str
    hint: Optional[str] = None
    context_used: Optional[List[str]] = None

class CreatePatientRequest(BaseModel):
    name: str
    age: int
    gender: str
    disorder: str
    severity: str = "moderate"
    lore: str = ""
    mode: str = "diagnostics"

# ─── Эндпоинты ────────────────────────────────────────────────

@app.get("/")
def root():
    return {"service": "PsyTrainer", "model": MODEL_NAME, "status": "running"}

@app.get("/api/health")
def health():
    try:
        models = ollama.list()
        ollama_ok = True
    except:
        ollama_ok = False
    return {"ollama": ollama_ok, "knowledge_docs": collection.count(), "model": MODEL_NAME}

@app.get("/api/models")
def get_models():
    try:
        models = ollama.list()
        return {"models": [m["name"] for m in models.get("models", [])]}
    except Exception as e:
        return {"error": str(e)}

# ─── Эндпоинты для пациентов ────────────────────────────────

@app.post("/api/patients")
def create_patient(req: CreatePatientRequest):
    global patient_counter
    patient_counter += 1
    patient = {
        "id": f"patient_{patient_counter}",
        "name": req.name,
        "age": req.age,
        "gender": req.gender,
        "disorder": req.disorder,
        "severity": req.severity,
        "lore": req.lore,
        "mode": req.mode,
        "created_at": time.time()
    }
    patients_db.append(patient)
    log.info(f"✅ Создан пациент: {req.name} (ID: {patient['id']})")
    return patient

@app.get("/api/patients")
def get_patients():
    return {"patients": patients_db}

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str):
    for p in patients_db:
        if p["id"] == patient_id:
            return p
    raise HTTPException(status_code=404, detail="Пациент не найден")

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: str):
    global patients_db
    for i, p in enumerate(patients_db):
        if p["id"] == patient_id:
            deleted = patients_db.pop(i)
            return {"deleted": deleted}
    raise HTTPException(status_code=404, detail="Пациент не найден")

# ─── Чат ──────────────────────────────────────────────────────

def _rag_context(query: str, n: int = 3) -> List[str]:
    try:
        result = collection.query(query_texts=[query], n_results=n)
        return result["documents"][0] if result["documents"] else []
    except Exception as e:
        log.warning(f"RAG error: {e}")
        return []

def _build_patient_system(p: PatientProfile, context: str, state_block: str = "") -> str:
    return f"""Ты — пациент {p.name}, {p.age} лет.
Расстройство: {p.disorder} ({p.severity})
История: {p.lore}

Клинический контекст:
{context}

{state_block}

{mode_instruction}

ПРАВИЛА:
- Отвечай на русском языке
- НЕ ЗАДАВАЙ ВОПРОСЫ ПСИХОЛОГУ
- НЕ ПРЕДЛАГАЙ СМЕНИТЬ ТЕМУ
- Не выходи из роли
- Не ставь себе диагноз
- Отвечай 1-3 предложениями
- Используй живую речь, паузы, сомнения"""

def _ollama_chat(messages: list, options: dict = None) -> str:
    if options is None:
        options = {"temperature": 0.8, "top_p": 0.9}
    resp = ollama.chat(
        model=MODEL_NAME,      # ← имя модели
        messages=messages,     # ← список сообщений
        options=options        # ← параметры генерации
    )
    return resp["message"]["content"].strip()

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    t0 = time.time()
    context_docs = _rag_context(f"{req.patient.disorder} {req.message}")
    context = "\n".join(context_docs) if context_docs else ""

    # ─── ЗАГРУЗКА СОСТОЯНИЯ ПАЦИЕНТА ──────────────────────────
    state_block = ""
    state_params = {}
    
    if req.patient.mode == "psychotherapy" and req.patient_id:
        try:
            llm_context = get_llm_context(req.patient_id)
            state_block = llm_context.get("context_block", "")
            state_params = llm_context.get("llm_params", {})
            log.info(f"Загружено состояние для {req.patient_id}: {state_params}")
        except Exception as e:
            log.warning(f"Не удалось загрузить состояние: {e}")

    # ─── ФОРМИРОВАНИЕ ПРОМПТА ─────────────────────────────────
    messages = [{"role": "system", "content": _build_patient_system(req.patient, context, state_block)}]
    for m in req.history[-8:]:
        messages.append({"role": "user" if m.role == "student" else "assistant", "content": m.content})
    messages.append({"role": "user", "content": req.message})

    # ─── ПАРАМЕТРЫ LLM В ЗАВИСИМОСТИ ОТ СОСТОЯНИЯ ─────────────
    llm_options = {
        "temperature": state_params.get("temperature", 0.8),
        "top_p": state_params.get("top_p", 0.9),
        "num_predict": state_params.get("max_tokens", 150),
    }

    # ─── ОТПРАВКА В OLLAMA ─────────────────────────────────────
    reply = _ollama_chat(messages, llm_options)

    # ─── ОБНОВЛЕНИЕ СОСТОЯНИЯ ПОСЛЕ ОТВЕТА ────────────────────
    if req.patient.mode == "psychotherapy" and req.patient_id:
        try:
            update_state_after_message(
                patient_id=req.patient_id,
                consultant_message=req.message,
                patient_response=reply
            )
            log.info(f"Обновлено состояние для {req.patient_id}")
        except Exception as e:
            log.warning(f"Не удалось обновить состояние: {e}")

    # ─── ПОДСКАЗКА ─────────────────────────────────────────────
    hint = None
    if req.hints_enabled and len(req.history) >= 2:
        try:
            hint_msgs = [
                {"role": "system", "content": "Дай короткую подсказку супервизора (1-2 предложения)."},
                {"role": "user", "content": f"История: {json.dumps([{'role': m.role, 'content': m.content} for m in req.history[-4:]], ensure_ascii=False)}"}
            ]
            hint = _ollama_chat(hint_msgs)
        except:
            pass

    return ChatResponse(
        response=reply,
        hint=hint,
        context_used=context_docs if context_docs else None
    )
# ─── Запуск ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    log.info("🧠 PsyTrainer AI Backend запускается...")
    log.info(f"   Модель: {MODEL_NAME}")
    log.info(f"   Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)