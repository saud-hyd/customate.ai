from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
import logging

from app.core.database.dependencies import get_db
from app.repositories.client_repository import ClientRepository
from app.core.security.authentication import verify_token

security = HTTPBearer()
logger = logging.getLogger("customate")

async def get_current_client(
    db: Session = Depends(get_db),
    token: str = Depends(security)
):
    """Get current authenticated client from JWT token."""
    try:
        # Get token payload
        payload = verify_token(token.credentials)
        client_id = payload.get("sub")
        
        if not client_id:
            logger.error("Token missing client_id claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        # Get client from database
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, client_id)
        
        if not client:
            logger.error(f"No client found with ID: {client_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
            
        if not client.active:
            logger.error(f"Client {client_id} is inactive")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )
            
        return client
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )