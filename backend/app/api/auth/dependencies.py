from fastapi import Depends, HTTPException, status, Request, Header
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
async def get_client_with_any_auth(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Client:
    """
    Get client by API key or bearer token - flexible authentication for widget.
    Supports both dashboard and widget authentication methods.
    """
    client_repo = ClientRepository()
    
    # Method 1: Try to authenticate using API key header
    if x_api_key:
        client = client_repo.get_by_api_key(db, x_api_key)
        if client:
            return client
    
    # Method 2: Try to get token from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        # Verify JWT token and get client_id
        try:
            from app.core.security.authentication import verify_token
            payload = verify_token(token)
            if payload and "sub" in payload:
                client_id = payload["sub"]
                client = client_repo.get_by_client_id(db, client_id)
                if client:
                    return client
        except Exception as e:
            # If token verification fails, continue to next method
            pass
    
    # If all authentication methods fail, raise exception
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )    
    
async def get_current_client_optional(
    db: Session = Depends(get_db),
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None)
) -> Optional[Client]:
    """
    Get current client without raising authentication errors.
    Returns None if no valid authentication is provided.
    """
    try:
        # Try API key first
        if api_key:
            client = client_repo.get_by_api_key(db, api_key)
            if client and client.active:
                return client
        
        # Try Bearer token
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            payload = verify_token(token)
            client_id = payload.get("client_id")
            if client_id:
                client = client_repo.get_by_client_id(db, client_id)
                if client and client.active:
                    return client
        
        # Return None if no valid authentication
        return None
        
    except Exception as e:
        logger.debug(f"Optional authentication failed: {str(e)}")
        return None    
    
    