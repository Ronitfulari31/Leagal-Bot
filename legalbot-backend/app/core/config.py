import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgrepwd%40%23@localhost:5432/legalbotdb"
)

