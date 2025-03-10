from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import Optional, Union

from app.core.database.dependencies import get_db
from app.core.security.authentication import ALGORITHM, authenticate_client_by_api_key
from app.core.config.settings import settings
from app.domain.client.entities import Client

# OAuth2 scheme for JWT tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# API key scheme
api_key_header = APIKeyHeader(name="X-API-Key")

async def get_current_client(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    api_key: Optional[str] = Depends(api_key_header)
) -> Client:
    """
    Validate authentication and return the current client.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try API key authentication first
    if api_key:
        client = authenticate_client_by_api_key(db, api_key)
        if client:
            return client
    
    # Then try JWT token authentication
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        client_id: str = payload.get("sub")
        if client_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Get client from database
    from app.repositories.client_repository import ClientRepository
    client_repo = ClientRepository()
    client = client_repo.get_by_client_id(db, client_id)
    
    if client is None:
        raise credentials_exception
        
    return client