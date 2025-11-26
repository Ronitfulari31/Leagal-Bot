from fastapi import APIRouter, HTTPException
from app.db.database import database
from app.db.models import process_jobs

router = APIRouter()

@router.get("/results/{process_id}")
async def get_analysis_results(process_id: str):
    try:
        query = process_jobs.select().where(process_jobs.c.id == process_id)
        job = await database.fetch_one(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    if not job:
        raise HTTPException(status_code=404, detail="Results not found")

    return {
        "process_id": process_id,
        "extracted_text": (job['extracted_text'] or "")[:1000],
        "clauses": (job['extracted_clauses'] or ""),
        "risk_level": job['risk_level'],
        "keywords": (job['keywords'] or ""),
        "summary": (job['summary'] or "")
    }
