import httpx
from typing import List, Dict
from app.logging import logger # Твой собственный модуль логирования

class LLMService:
    def __init__(self):
        self.ollama_url = "http://localhost:11434/api/chat"
        self.model = "llama3"
        self.fallback_url = "https://api.openai.com/v1/chat/completions"
        self.fallback_key = "YOUR_LITELLM_OR_OPENAI_KEY"  # Берется из .env

    async def generate_patient_reply(self, system_prompt: str, history: List[Dict[str, str]]) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.7, "top_p": 0.9}
        }
        
        try:
            async with httpx.AsyncClient(timeout=12.0) as client: # Ограничение времени отклика из ТЗ [cite: 190, 216]
                response = await client.post(self.ollama_url, json=payload)
                if response.status_code == 200:
                    return response.json().get("message", {}).get("content", "")
                raise Exception(f"Ollama status code: {response.status_code}")
        except Exception as e:
            logger.error(f"Основной провайдер Llama недоступен, подключаю fallback: {e}")
            return await self._execute_fallback(messages)

    async def _execute_fallback(self, messages: List[Dict[str, str]]) -> str:
        if not self.fallback_key:
            return "Ошибка симуляции: Пациент временно не может говорить (Провайдеры недоступны)."
        
        headers = {"Authorization": f"Bearer {self.fallback_key}", "Content-Type": "application/json"}
        payload = {"model": "gpt-4o-mini", "messages": messages, "temperature": 0.7}
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(self.fallback_url, headers=headers, json=payload)
                return resp.json()["choices"][0]["message"]["content"]
        except Exception as critical_err:
            logger.error(f"Критический сбой всех LLM провайдеров: {critical_err}")
            return "Пациент глубоко задумался и ушел в себя. Попробуйте повторить реплику."

llm_service = LLMService()