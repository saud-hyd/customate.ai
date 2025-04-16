import logging
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

from app.core.config.settings import settings

logger = logging.getLogger(__name__)

# Determine if we need SSL (always true in production)
ssl_required = settings.DB_HOST != "localhost" and settings.DB_SSLMODE == "require"

# Create SQLAlchemy engine with SSL if needed
engine_args = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
    "pool_recycle": 300,  # Recycle connections every 5 minutes
    "pool_timeout": 30,   # Connection timeout after 30 seconds
    "pool_size": 10,      # Maximum pool size
    "max_overflow": 20    # Maximum overflow connections
}

if ssl_required:
    engine_args["connect_args"] = {"sslmode": "require"}

logger.info(f"Connecting to database: {settings.DB_HOST}/{settings.DB_NAME}")
logger.info(f"SSL mode: {'enabled' if ssl_required else 'disabled'}")

try:
    engine = create_engine(str(settings.DATABASE_URL), **engine_args)
    logger.info("Database engine created successfully")
except Exception as e:
    logger.critical(f"Failed to create database engine: {str(e)}")
    raise

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()

# DB dependency for FastAPI
def get_db():
    """Database session dependency with retry logic."""
    max_retries = 3
    retry_count = 0
    last_error = None
    
    while retry_count < max_retries:
        db = SessionLocal()
        try:
            yield db
            break
        except Exception as e:
            retry_count += 1
            last_error = e
            logger.error(f"Database session error (attempt {retry_count}/{max_retries}): {str(e)}")
            time.sleep(1)  # Wait before retrying
        finally:
            db.close()
    
    if retry_count >= max_retries and last_error:
        logger.critical(f"Maximum database connection retries exceeded: {str(last_error)}")

@contextmanager
def get_db_session():
    """Context manager for database sessions with retry logic."""
    max_retries = 3
    retry_count = 0
    last_error = None
    
    while retry_count < max_retries:
        session = SessionLocal()
        try:
            yield session
            session.commit()
            return
        except Exception as e:
            session.rollback()
            retry_count += 1
            last_error = e
            logger.error(f"Database session error (attempt {retry_count}/{max_retries}): {str(e)}")
            time.sleep(1)  # Wait before retrying
        finally:
            session.close()
    
    if last_error:
        logger.critical(f"Maximum database connection retries exceeded: {str(last_error)}")
        raise last_error