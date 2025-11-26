from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, constr
from pathlib import Path
from app.db.database import database
from app.db.models import files, process_jobs, ProcessingStatus  # Core Table objects
from app.services.nlp_processing import (
    extract_text_from_pdf, extract_text_from_docx,
    extract_clauses, analyze_risk, extract_keywords, summarize_text
)
import uuid

router = APIRouter()
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

class ProcessRequest(BaseModel):
    filename: constr(min_length=1)

class StartAnalysisRequest(BaseModel):
    uploadId: str

@router.post("/process/start")
async def start_analysis(request: StartAnalysisRequest):
    """Start analysis process using upload ID"""
    
    upload_id = request.uploadId
    if not upload_id:
        raise HTTPException(status_code=400, detail="Upload ID is required")
    
    # For now, we'll simulate the process by creating a mock process ID
    # In a real implementation, you'd store the upload ID and associated file IDs
    # and retrieve them here to start processing both files
    
    process_id = str(uuid.uuid4())
    
    # Mock response for now
    return {
        "processId": process_id,
        "status": "processing",
        "message": "Analysis started successfully"
    }

@router.post("/process/")
async def start_processing(request: ProcessRequest):
    # Fetch file record
    try:
        query = files.select().where(files.c.filename == request.filename)
        file_record = await database.fetch_one(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found in database")

    file_path = Path("uploads") / file_record["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    if file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    process_id = str(uuid.uuid4())

    try:
        await database.execute(process_jobs.insert().values(
            id=process_id,
            file_id=file_record["id"],
            status=ProcessingStatus.processing
        ))

        # Extract text
        if file_path.suffix.lower() == ".pdf":
            text = extract_text_from_pdf(str(file_path))
        else:
            text = extract_text_from_docx(str(file_path))

        # NLP enhancements
        clauses = extract_clauses(text)
        risk = analyze_risk(text)
        keywords_list = extract_keywords(text)
        summary_text = summarize_text(text)

        # Save results to DB, properly saving risk level string
        await database.execute(process_jobs.update().where(process_jobs.c.id == process_id).values(
            status=ProcessingStatus.completed,
            extracted_text=text,
            extracted_clauses='; '.join(clauses),
            risk_level=risk['level'],  # Save only risk level string here
            keywords=', '.join(keywords_list),
            summary=summary_text
        ))

    except Exception as e:
        await database.execute(process_jobs.update().where(process_jobs.c.id == process_id).values(
            status=ProcessingStatus.failed
        ))
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

    return {
        "process_id": process_id,
        "status": "completed",
        "extracted_text_snippet": text[:500],
        "clauses": clauses,
        "risk_level": risk['level'],
        "keywords": keywords_list,
        "summary": summary_text
    }

@router.get("/process/status/{process_id}")
async def get_processing_status(process_id: str):
    try:
        query = process_jobs.select().where(process_jobs.c.id == process_id)
        job = await database.fetch_one(query)
        
        # For mock data, return completed status
        if not job:
            return {"status": "completed"}
            
    except Exception as e:
        # For mock data, return completed status
        return {"status": "completed"}

    return {"process_id": process_id, "status": job["status"]}

@router.get("/results/{process_id}")
async def get_analysis_results(process_id: str):
    """Get analysis results by process ID"""
    
    # For now, return mock data
    # In a real implementation, you'd fetch from the database
    
    mock_results = {
        "ownerResults": {
            "risk_level": "Medium",
            "summary": "This is a sample owner agreement with standard terms and conditions including liability limitations and termination clauses.",
            "clauses": "termination clause; liability limitation; confidentiality agreement",
            "keywords": "agreement, liability, termination, confidentiality, indemnity"
        },
        "tenantResults": {
            "risk_level": "Low",
            "summary": "This tenant agreement contains basic rental terms with standard tenant obligations and property maintenance requirements.",
            "clauses": "rental terms; tenant obligations; property maintenance",
            "keywords": "rental, obligations, maintenance, property, terms"
        }
    }
    
    return mock_results
