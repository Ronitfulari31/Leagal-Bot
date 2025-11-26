from fastapi import APIRouter, UploadFile, File as FastAPIFile, HTTPException
from app.db.database import database
from sqlalchemy import insert
import uuid
import shutil
from pathlib import Path
from app.db.models import files  # Core table object named 'files'

router = APIRouter()
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

@router.post("/upload/")
async def upload_file(file: UploadFile = FastAPIFile(...)):
    if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = UPLOAD_DIR / filename

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        query = insert(files).values(id=file_id, filename=filename, original_name=file.filename)
        await database.execute(query)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    return {"file_id": file_id, "filename": filename}
