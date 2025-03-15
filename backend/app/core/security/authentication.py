from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

from app.core.config.settings import settings
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientRepository

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT constants
ALGORITHM = "HS256"

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

def authenticate_client(db: Session, email: str, password: str) -> Optional[Client]:
    """Authenticate a client by email and password (API key)."""
    logger.debug(f"Authenticating client with email: {email}")
    
    client_repo = ClientRepository()
    client = client_repo.get_by_email(db, email)
    
    if not client:
        logger.warning(f"No client found with email: {email}")
        return None
    
    # Direct comparison with the API key as password
    if client.api_key == password:
        logger.info(f"Authentication successful for client: {client.client_id}")
        return client
    else:
        logger.warning(f"Invalid password for client: {client.client_id}")
    
    return None

def authenticate_client_by_api_key(db: Session, api_key: str) -> Optional[Client]:
    """Authenticate a client by API key."""
    if not api_key:
        return None
    
    logger.info(f"Looking up client with API key: {api_key[:8]}...")
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, api_key)
    
    # Check if client exists and is active
    if client:
        logger.info(f"Found client: {client.client_id}, active: {client.active}")
        if client.active:
            return client
        else:
            logger.info("Client is not active")
    else:
        logger.info("No client found with this API key")
        
    return None