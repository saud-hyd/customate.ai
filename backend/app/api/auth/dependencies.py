# backend/app/api/auth/dependencies.py
from fastapi import Depends, HTTPException, status, Header
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
    logger.info(f"Auth attempt with API key: {api_key[:8] + '...' if api_key and len(api_key) > 8 else 'None'}")
    
    if not api_key:
        logger.error("No API key provided in request header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    # Directly query the client
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, api_key)
    
    if not client:
        logger.error(f"No client found with provided API key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
        
    if not client.active:
        logger.error(f"Client {client.client_id} is inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authentication failed: Client account is inactive",
        )
    
    logger.info(f"Successfully authenticated client: {client.client_id}")
    return client

# Optional: Alternative direct header approach
async def get_current_client_direct(
    x_api_key: str = Header(None, description="API Key for authentication"),
    db: Session = Depends(get_db)
):
    """Direct header extraction approach (alternative to APIKeyHeader)."""
    logger.info(f"Auth attempt with direct API key: {x_api_key[:8] + '...' if x_api_key and len(x_api_key) > 8 else 'None'}")
    
    if not x_api_key:
        logger.error("No API key provided in direct header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing API key",
        )
    
    # Directly query the client
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, x_api_key)
    
    if client and client.active:
        logger.info(f"Successfully authenticated client via direct header: {client.client_id}")
        return client
    
    logger.error(f"Invalid direct API key or client not active")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication failed: Invalid API key or inactive client",
    )