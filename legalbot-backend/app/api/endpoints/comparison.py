from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.services.nlp_processing import process_document, compare_documents
from app.db import database  # if you need to fetch stored process results (optional)

router = APIRouter()

class CompareRequest(BaseModel):
    upload_id_a: str | None = None
    upload_id_b: str | None = None

@router.post("/compare")
async def compare_two_files(owner_file: UploadFile = File(None), tenant_file: UploadFile = File(None), body: CompareRequest | None = None):
    """
    Compare two documents. Accepts upload files (owner_file & tenant_file) OR upload IDs in JSON body.
    Returns structured comparison with similarity_percent and diagnostics.
    """
    try:
        if owner_file is not None and tenant_file is not None:
            doc_a = await process_document(owner_file)
            doc_b = await process_document(tenant_file)
        elif body and body.upload_id_a and body.upload_id_b:
            # optional: load previously processed results from DB using ids
            # example: doc_a = await load_result_by_upload_id(body.upload_id_a)
            raise HTTPException(status_code=501, detail="Compare-by-id not implemented; send files for now")
        else:
            raise HTTPException(status_code=400, detail="Provide both owner_file and tenant_file or two upload IDs")
        report = compare_documents(doc_a, doc_b)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
