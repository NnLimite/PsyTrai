from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# В продакшене echo отключаем, чтобы не спамить логами диалогов в консоль
engine = create_async_engine(
    "postgresql+asyncpg://postgres:postgres@localhost:5432/psytrainer", 
    echo=False,
    pool_size=20,
    max_overflow=10
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()