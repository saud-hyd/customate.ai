# Update this file at C:\customate.ai\backend\app\core\database\session.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

from app.core.config.settings import settings

# Create SQLAlchemy engine - handle string URL by manually converting it
engine = create_engine(
    str(settings.DATABASE_URL),
    echo=settings.DEBUG,  # Log SQL commands if in debug mode
    pool_pre_ping=True,   # Verify connection before using it
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()

@contextmanager
def get_db_session() -> Session:
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