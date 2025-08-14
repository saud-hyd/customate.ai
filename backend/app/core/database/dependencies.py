from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database.session import SessionLocal
from contextlib import asynccontextmanager

def get_db():
    """
    Dependency to get a database session.
    This function yields a session that FastAPI will correctly handle.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@asynccontextmanager
async def get_db_session():
    """
    Async context manager for database sessions in background tasks.
    Used for background processing outside of FastAPI request context.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()