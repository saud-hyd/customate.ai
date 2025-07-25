import sys
import os
import time
from sqlalchemy import create_engine, text
import logging

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    """Test database connection and log detailed information."""
    # Show connection information (without password)
    db_url_safe = str(settings.DATABASE_URL).replace(settings.DB_PASSWORD, "********")
    logger.info(f"Testing connection to: {db_url_safe}")
    logger.info(f"Host: {settings.DB_HOST}")
    logger.info(f"Database: {settings.DB_NAME}")
    logger.info(f"User: {settings.DB_USER}")
    logger.info(f"SSL Mode: {settings.DB_SSLMODE}")
    
    # Set up engine with SSL if needed
    engine_args = {"echo": True, "pool_pre_ping": True}
    if settings.DB_HOST != "localhost" and settings.DB_SSLMODE == "require":
        engine_args["connect_args"] = {"sslmode": "require"}
    
    try:
        engine = create_engine(str(settings.DATABASE_URL), **engine_args)
        
        # Try to connect and execute a simple query
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("Connection successful!")
            logger.info(f"Query result: {result.scalar()}")
            
            # Test schema access
            tables = connection.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            logger.info("Available tables:")
            for table in tables:
                logger.info(f"  - {table[0]}")
                
        return True
    except Exception as e:
        logger.error(f"Connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    retry_count = 0
    max_retries = 3
    
    while retry_count < max_retries:
        logger.info(f"Connection attempt {retry_count + 1}/{max_retries}")
        if test_connection():
            sys.exit(0)
        retry_count += 1
        if retry_count < max_retries:
            logger.info(f"Retrying in 2 seconds...")
            time.sleep(2)
    
    logger.error("All connection attempts failed!")
    sys.exit(1)