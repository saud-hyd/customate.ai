# backend/app/api/auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
import logging

from app.core.database.dependencies import get_db
from app.repositories.client_repository import ClientRepository

# Create a simple API key header - no OAuth fallback for now
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
logger = logging.getLogger("customate")

async def get_current_client(
    db: Session = Depends(get_db),
    api_key: str = Depends(api_key_header)
):
    """Simple API key authentication."""
    logger.info(f"Auth attempt with API key: {api_key[:10] if api_key else 'None'}")
    
    if not api_key:
        logger.error("No API key provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Directly query the client
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, api_key)
    
    if client and client.active:
        logger.info(f"Successfully authenticated client: {client.client_id}")
        return client
    
    logger.error(f"Invalid API key or client not active")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated"
    )