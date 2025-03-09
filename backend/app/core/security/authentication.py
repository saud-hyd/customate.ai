from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config.settings import settings
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientRepository

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT constants
ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

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
    """Authenticate a client by email and password."""
    client_repo = ClientRepository()
    client = client_repo.get_by_email(db, email)
    
    if not client:
        return None
        
    # For initial implementation, we'll store the password directly in the API key
    # In a real application, you should store a hashed password in a separate field
    if client.api_key != password:  # This is simplified - normally check hashed passwords
        return None
        
    return client

def authenticate_client_by_api_key(db: Session, api_key: str) -> Optional[Client]:
    """Authenticate a client by API key."""
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, api_key)
    
    return client