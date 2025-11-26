from sqlalchemy import Table, Column, String, Text, Enum, MetaData
import enum

metadata = MetaData()

class ProcessingStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

files = Table(
    "files",
    metadata,
    Column("id", String, primary_key=True),
    Column("filename", String, nullable=False),
    Column("original_name", String, nullable=False),
)

process_jobs = Table(
    "process_jobs",
    metadata,
    Column("id", String, primary_key=True),
    Column("file_id", String, nullable=False),
    Column("status", Enum(ProcessingStatus), nullable=False),
    Column("extracted_text", Text, nullable=True),
    Column("extracted_clauses", Text, nullable=True),
    Column("risk_level", String(10), nullable=True),
    Column("keywords", Text, nullable=True),
    Column("summary", Text, nullable=True),
)
