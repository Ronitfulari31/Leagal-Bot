from databases import Database
from sqlalchemy import create_engine, MetaData, select
from app.core.config import DATABASE_URL
from app.db.models import process_jobs  # Use ProcessJob if Document model doesn't exist
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

database = Database(DATABASE_URL)

# For Alembic and SQLAlchemy sync engine, remove async driver prefix from DATABASE_URL
engine = create_engine(DATABASE_URL.replace("asyncpg", "psycopg2"))

metadata = MetaData()

print("Database URL used by engine:", DATABASE_URL)
print("Engine created with URL:", engine.url)

# Create async session factory for DB access in async methods
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_document_by_process_id(process_id: str, session: AsyncSession):
    stmt = select(process_jobs).where(process_jobs.c.id == process_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
