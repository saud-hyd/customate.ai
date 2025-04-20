import os
import sys
from sqlalchemy import create_engine, text
import logging

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_password_hash_column():
    """Add password_hash column to clients table if it doesn't exist."""
    logger.info("Checking for password_hash column...")
    
    try:
        # Create engine
        engine = create_engine(str(settings.DATABASE_URL))
        
        # Check if column exists
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='clients' AND column_name='password_hash'"
            ))
            column_exists = result.fetchone() is not None
        
        if column_exists:
            logger.info("password_hash column already exists.")
            return
        
        # Add the column
        logger.info("Adding password_hash column...")
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE clients ADD COLUMN password_hash VARCHAR(255)"
            ))
            conn.commit()
            logger.info("Successfully added password_hash column!")
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_password_hash_column()