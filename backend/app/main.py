from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import get_settings
from app.database.session import engine
settings=get_settings()
app=FastAPI(title=settings.app_name,version="0.1.0")
app.add_middleware(CORSMiddleware,allow_origins=[settings.frontend_url],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
@app.get("/")
def root(): return {"message":"StockFlow API"}
@app.get("/api/health")
def health(): return {"status":"ok"}
@app.get("/api/health/ready")
def readiness():
 try:
  with engine.connect() as connection: connection.execute(text("SELECT 1"))
 except SQLAlchemyError as exc: raise HTTPException(status_code=503,detail="Database unavailable") from exc
 return {"status":"ready","database":"connected"}
