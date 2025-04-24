# File: backend/app/api/auth/dependencies.py

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Optional
import jwt
from datetime import datetime

from app.core.config.settings import settings
from app.core.database.dependencies import get_db
from app.core.security.authentication import verify_token
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientRepository
from app.core import logger

def get_current_client(
    request: Request,
    db: Session = Depends(get_db)
) -> Client:
    """
    Get the current authenticated client from JWT token.
    """
    # Check if client was already identified by middleware
    if hasattr(request.state, "client") and request.state.client:
        return request.state.client
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = verify_token(token)
        client_id = payload.get("sub")
        if not client_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Check token expiration
        if "exp" in payload and datetime.utcnow().timestamp() > payload["exp"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Client not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not client.active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Client inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return client
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Add this new function
def get_client_from_api_key(
    request: Request,
    db: Session = Depends(get_db)
) -> Client:
    """Get client from API key in header."""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, api_key)
    
    if not client:
        logger.warning(f"Invalid API key provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    if not client.active:
        logger.warning(f"Inactive client attempting to use API")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Client account is inactive"
        )
    
    return client

# Add this function for flexible authentication
def get_client_with_any_auth(
    request: Request,
    db: Session = Depends(get_db)
) -> Client:
    """
    Get client from JWT token OR API key.
    Tries JWT token first, then falls back to API key.
    """
    # First try JWT token auth if Authorization header is present
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            return get_current_client(request, db)
        except HTTPException:
            # If JWT auth fails, continue to API key check
            pass
    
    # Then try API key auth
    try:
        return get_client_from_api_key(request, db)
    except HTTPException as e:
        # If both methods fail, raise the API key error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )