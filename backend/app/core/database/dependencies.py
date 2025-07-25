from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database.session import SessionLocal

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