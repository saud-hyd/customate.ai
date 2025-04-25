from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database.dependencies import get_db
from app.core.security.authentication import verify_token
from app.repositories.client_repository import ClientRepository
from app.domain.client.entities import Client
from app.core import logger

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)

async def get_current_client(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Client:
    """
    Dependency for getting the current authenticated client.
    This supports both JWT token and API key authentication.
    
    JWT tokens should be passed in the Authorization header.
    API keys should be passed in the X-API-Key header.
    """
    client_repo = ClientRepository()
    
    # First check if we have a client from the ClientContextMiddleware
    if hasattr(request.state, "client") and request.state.client:
        return request.state.client
    
    # Next, check for a valid JWT token in the Authorization header
    if credentials and credentials.scheme.lower() == "bearer":
        try:
            # Verify the JWT token
            payload = verify_token(credentials.credentials)
            client_id = payload.get("sub")
            
            if not client_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Get the client from the database
            client = client_repo.get_by_client_id(db, client_id)
            
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Client not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check if client is active
            if not client.active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Inactive client",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return client
            
        except Exception as e:
            logger.error(f"JWT authentication error: {str(e)}")
            
            # Don't fail here - try the API key next
            pass
    
    # Finally, check for API key in the X-API-Key header
    api_key = request.headers.get("X-API-Key")
    
    if api_key:
        client = client_repo.get_by_api_key(db, api_key)
        
        if not client:
            logger.error(f"Invalid API key: {api_key[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if client is active
        if not client.active:
            logger.error(f"Inactive client: {client.client_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive client",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"API key auth successful for client: {client.client_id}")
        return client
    
    # If we get here, no valid authentication was found
    logger.error("No authentication provided")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )