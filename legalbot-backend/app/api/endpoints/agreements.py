from fastapi import APIRouter, UploadFile, File as FastAPIFile, HTTPException
from app.db.database import database
from sqlalchemy import insert
import uuid
import shutil
from pathlib import Path
from app.db.models import files

router = APIRouter()
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

@router.post("/upload/agreements")
async def upload_agreements(
    owner_file: UploadFile = FastAPIFile(...),
    tenant_file: UploadFile = FastAPIFile(...)
):
    """Upload two agreement files and return an upload ID"""
    
    # Validate file types
    for file in [owner_file, tenant_file]:
        if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
            raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Generate upload ID
    upload_id = str(uuid.uuid4())
    
    # Save files
    owner_file_id = str(uuid.uuid4())
    tenant_file_id = str(uuid.uuid4())
    
    owner_filename = f"{owner_file_id}_{owner_file.filename}"
    tenant_filename = f"{tenant_file_id}_{tenant_file.filename}"
    
    owner_file_path = UPLOAD_DIR / owner_filename
    tenant_file_path = UPLOAD_DIR / tenant_filename
    
    try:
        # Save owner file
        with owner_file_path.open("wb") as buffer:
            shutil.copyfileobj(owner_file.file, buffer)
        
        # Save tenant file
        with tenant_file_path.open("wb") as buffer:
            shutil.copyfileobj(tenant_file.file, buffer)
        
        # Store file records
        owner_query = insert(files).values(
            id=owner_file_id, 
            filename=owner_filename, 
            original_name=owner_file.filename
        )
        tenant_query = insert(files).values(
            id=tenant_file_id, 
            filename=tenant_filename, 
            original_name=tenant_file.filename
        )
        
        await database.execute(owner_query)
        await database.execute(tenant_query)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    return {
        "uploadId": upload_id,
        "ownerFileId": owner_file_id,
        "tenantFileId": tenant_file_id,
        "message": "Files uploaded successfully"
    }
