import chromadb
from chromadb.utils import embedding_functions

# Создаём клиент
client = chromadb.PersistentClient(path="./chroma_db")

# Создаём эмбеддинг-функцию
embedding_fn = embedding_functions.DefaultEmbeddingFunction()

# Удаляем коллекцию, если есть
try:
    client.delete_collection("dsm_knowledge")
except:
    pass

# Создаём коллекцию с эмбеддинг-функцией
collection = client.create_collection(
    name="dsm_knowledge",
    embedding_function=embedding_fn
)

# Добавляем знания
knowledge = [
    "Обсессивно-компульсивное расстройство (ОКР) — навязчивые мысли и ритуалы.",
    "Генерализованное тревожное расстройство (ГТР) — хроническая тревога >6 месяцев.",
    "Депрессия — подавленное настроение, ангедония, нарушения сна.",
    "ПТСР — флэшбэки, избегание, гипербдительность после травмы.",
    "Социальное тревожное расстройство — страх оценки окружающих.",
    "При ОКР пациенты испытывают сильную тревогу, если не выполняют ритуалы.",
    "КПТ помогает выявлять и менять иррациональные убеждения.",
]

collection.add(
    documents=knowledge,
    ids=[f"doc_{i}" for i in range(len(knowledge))]
)

print(f"✅ Коллекция создана! Загружено {len(knowledge)} документов.")
print(f"📊 Всего документов: {collection.count()}")
