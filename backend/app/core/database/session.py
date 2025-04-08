# C:\customate.ai\backend\app\core\database\session.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import os

from app.core.config.settings import settings

# Determine if we need SSL (always true in production)
ssl_required = settings.DB_HOST != "localhost" and settings.DB_SSLMODE == "require"

# Create SQLAlchemy engine with SSL if needed
engine_args = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}

if ssl_required:
    engine_args["connect_args"] = {"sslmode": "require"}

engine = create_engine(
    str(settings.DATABASE_URL),
    **engine_args
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()

# DB dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from typing import Generator
@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.
    Ensures session is properly closed after use and rolls back on exceptions.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()