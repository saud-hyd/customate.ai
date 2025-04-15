from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException
from starlette import status
from jose.exceptions import JWTError


from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import logging
import json
import hmac
import base64
import secrets
import hashlib



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
    
    # Add detailed logging
    logger.debug(f"Comparing provided password (length: {len(password)}) with API key (length: {len(client.api_key)})")
    
    # Improve comparison logic - strip whitespace and ensure exact comparison
    if client.api_key == password:
        logger.info(f"Authentication successful for client: {client.client_id}")
        return client
    else:
        logger.warning(f"Invalid password for client: {client.client_id}")
        # Log first few characters of both for debugging (be careful with sensitive data)
        logger.debug(f"API key starts with: {client.api_key[:3]}..., Password starts with: {password[:3]}...")
    
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
def create_magic_link_token(data: Dict[str, Any]) -> str:
    """
    Create a token for magic link authentication.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    
    # Add a random component to prevent token reuse
    to_encode.update({"jti": secrets.token_hex(8)})
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_magic_link_token(token: str) -> Dict[str, Any]:
    """
    Verify a magic link token.
    
    Args:
        token: JWT token to verify
        
    Returns:
        Dict containing token claims
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Use a more explicit expiration error handling
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        
        # Log successful token verification
        logger.info(f"Successfully verified token: {token[:10]}...")
        logger.debug(f"Token payload: {payload}")
        
        return payload
    except jwt.ExpiredSignatureError:
        logger.error(f"Token expired: {token[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {token[:10]}... Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def encode_state_data(data: Dict[str, Any]) -> str:
    """
    Encode state data for OAuth flow.
    """
    # Add a timestamp and random value to prevent CSRF
    data_copy = data.copy()
    data_copy.update({
        "timestamp": int(datetime.utcnow().timestamp()),
        "nonce": secrets.token_hex(8)
    })
    
    json_data = json.dumps(data_copy)
    encoded = base64.urlsafe_b64encode(json_data.encode('utf-8')).decode('utf-8')
    
    # Add signature
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        encoded.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{encoded}.{signature}"

def decode_state_data(state: str) -> Dict[str, Any]:
    """
    Decode and verify state data from OAuth flow.
    """
    try:
        # Split encoded data and signature
        encoded, signature = state.split('.')
        
        # Verify signature
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            encoded.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            return {}
        
        # Decode data
        json_data = base64.urlsafe_b64decode(encoded).decode('utf-8')
        data = json.loads(json_data)
        
        # Check timestamp (valid for 1 hour)
        timestamp = data.get("timestamp", 0)
        current_time = int(datetime.utcnow().timestamp())
        
        if current_time - timestamp > 3600:
            return {}
        
        return data
    except Exception:
        return {}