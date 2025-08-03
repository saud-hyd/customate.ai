from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException
from starlette import status
from jose import jwt, JWTError
from passlib.context import CryptContext
import logging
import secrets
import json
import base64
import hmac
import hashlib

logger = logging.getLogger(__name__)

from app.core.config.settings import settings
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientRepository

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT constants
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Get hash of password."""
    return pwd_context.hash(password)

# Path: backend/app/core/security/authentication.py

def authenticate_client(db, email: str, password: str) -> Optional[Client]:
    """
    Authenticate a client by email and password.
    This method is ONLY for user login via password, NOT for API key authentication.
    """
    client_repo = ClientRepository()
    client = client_repo.get_by_email(db, email)
    
    if not client:
        logger.warning(f"No client found with email")
        return None
    
    # Check if account is active
    if not client.active:
        logger.warning(f"Login attempt for inactive account")
        return None
    
    # Only check password_hash - NEVER use API key for login
    if client.password_hash and verify_password(password, client.password_hash):
        logger.info(f"Password authentication successful ")
        return client
    
    logger.warning(f"Password authentication failed")
    return None

def create_magic_link_token(data: Dict[str, Any]) -> str:
    """Create a token for magic link authentication."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    to_encode.update({"jti": secrets.token_hex(8)})
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"JWT verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def verify_magic_link_token(token: str) -> Dict[str, Any]:
    """
    Verify a magic link token (alias for verify_token for backward compatibility).
    
    Args:
        token: JWT token to verify
        
    Returns:
        Dict containing token claims
    """
    return verify_token(token)

def create_verification_token(email: str, client_id: str) -> str:
    """Create a shorter verification token using just a random string with email hash."""
    import hashlib
    
    # Create a short random token
    random_token = secrets.token_urlsafe(32)  # Much shorter than JWT
    
    # Create a simple verification string: random_token + email_hash
    email_hash = hashlib.sha256(email.encode()).hexdigest()[:16]
    verification_token = f"{random_token}.{email_hash}"
    
    return verification_token

def verify_verification_token(token: str, email: str) -> bool:
    """Verify the verification token matches the email."""
    import hashlib
    
    try:
        if '.' not in token:
            return False
            
        random_part, email_hash = token.split('.', 1)
        expected_hash = hashlib.sha256(email.encode()).hexdigest()[:16]
        
        return email_hash == expected_hash
    except Exception:
        return False

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