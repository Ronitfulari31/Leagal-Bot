from sqlalchemy import create_engine
from app.core.config import DATABASE_URL
from app.db.models import metadata  # Import metadata from your models

engine = create_engine(DATABASE_URL.replace("asyncpg", "psycopg2"))

metadata.create_all(engine)

print("Tables created successfully!")
