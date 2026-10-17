"""
knowledge_loader.py — загрузчик собственной базы знаний.

Используйте этот файл для добавления своих клинических материалов:
  - протоколы DSM-5 / МКБ-11
  - учебные тексты по расстройствам
  - примеры хороших и плохих реплик консультанта
  - нозологии из вашего каталога

Запуск:
  python knowledge_loader.py

Или через API:
  POST http://localhost:8000/api/knowledge
  {"documents": ["Текст 1", "Текст 2"], "category": "dsm5"}
"""

import requests
import json

API_URL = "http://localhost:8000"


# ─── ДОБАВЬТЕ СВОИ ЗНАНИЯ ЗДЕСЬ ───────────────────────────────

YOUR_KNOWLEDGE = [
    # Пример: добавьте тексты из учебников, протоколов, клинических описаний
    # "Критерий А для ОКР по DSM-5: наличие обсессий, компульсий или обоих.",
    # "При работе с тревожным расстройством важно исследовать телесные симптомы: сердцебиение, дрожь, потливость.",
]

YOUR_PATTERNS = [
    # Примеры поведения пациентов для реалистичной симуляции
    # "Пациент с социофобией говорит тихо, избегает называть имена людей, которых боится оценивать",
    # "Пациент в маниакальной фазе говорит быстро, перескакивает с темы на тему, преувеличивает возможности",
]


# ─── ЗАГРУЗКА ─────────────────────────────────────────────────

def load_knowledge(documents: list, category: str = "custom"):
    if not documents:
        print(f"⏩ {category}: нет документов для загрузки")
        return
    resp = requests.post(f"{API_URL}/api/knowledge", json={"documents": documents, "category": category})
    if resp.ok:
        data = resp.json()
        print(f"✅ {category}: загружено {data['added']} документов (всего в БД: {data['total']})")
    else:
        print(f"❌ {category}: ошибка — {resp.text}")


def show_stats():
    resp = requests.get(f"{API_URL}/api/health")
    if resp.ok:
        data = resp.json()
        print(f"\n📊 Статус:")
        print(f"   Ollama: {'✅' if data.get('ollama') else '❌'}")
        print(f"   ChromaDB: {'✅' if data.get('chromadb') else '❌'}")
        print(f"   Знаний в БД: {data.get('knowledge_docs', 0)}")
        print(f"   Паттернов: {data.get('pattern_docs', 0)}")
        print(f"   Модель: {data.get('model', '—')}")
    else:
        print(f"❌ Сервер недоступен: {resp.status_code}")


def test_search(query: str):
    resp = requests.get(f"{API_URL}/api/knowledge/search", params={"q": query, "n": 3})
    if resp.ok:
        data = resp.json()
        print(f"\n🔍 Поиск: «{query}»")
        for r in data["results"]:
            print(f"   [{r['id']}] {r['text'][:100]}... (d={r['distance']:.3f})")
    else:
        print(f"❌ Ошибка поиска: {resp.text}")


if __name__ == "__main__":
    print("🧠 PsyTrainer Knowledge Loader\n")
    show_stats()

    if YOUR_KNOWLEDGE:
        print(f"\n📚 Загружаем {len(YOUR_KNOWLEDGE)} клинических документов...")
        load_knowledge(YOUR_KNOWLEDGE, "clinical")

    if YOUR_PATTERNS:
        print(f"\n🎭 Загружаем {len(YOUR_PATTERNS)} паттернов поведения...")
        load_knowledge(YOUR_PATTERNS, "patterns")

    print("\n✅ Готово! Тест поиска:")
    test_search("ОКР ритуалы")
    test_search("эмпатия активное слушание")