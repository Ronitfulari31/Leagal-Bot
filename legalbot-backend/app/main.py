from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import upload, process, results, user, comparison
from app.api.endpoints.agreements import router as agreements_router
from app.db.database import database

app = FastAPI(title="LegalBot Backend")

origins = [
    "http://localhost:4200",  # your frontend origin
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload, prefix="/api")
app.include_router(process, prefix="/api")
app.include_router(results, prefix="/api")
app.include_router(user, prefix="/api")
app.include_router(comparison, prefix="/api")
app.include_router(agreements_router, prefix="/api")

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/")
async def root():
    return {"message": "LegalBot backend up and running!"}
