from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database.session import get_db_session
from app.core.database.dependencies import get_db
from app.core.security.authentication import authenticate_client, create_access_token
from app.core.config.settings import settings
from app.repositories.client_repository import ClientRepository
import uuid


router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)  # Changed from get_db_session
) -> Dict[str, Any]:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    client = authenticate_client(db, form_data.username, form_data.password)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": client.client_id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "client_id": client.client_id,
        "client_name": client.name
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_client(
    client_data: Dict[str, Any],
    db: Session = Depends(get_db)  # Changed from get_db_session
) -> Dict[str, Any]:
    """
    Register a new client.
    """
    # Validate client data
    if not client_data.get("name") or not client_data.get("email") or not client_data.get("industry"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: name, email, and industry are required"
        )
    
    # Check if client with email already exists
    client_repo = ClientRepository()
    if client_repo.get_by_email(db, client_data["email"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A client with this email already exists"
        )
    
    # Generate API key
    api_key = str(uuid.uuid4())
    
    # Create new client
    new_client_data = {
        "name": client_data["name"],
        "email": client_data["email"],
        "industry": client_data["industry"],
        "website": client_data.get("website"),
        "phone": client_data.get("phone"),
        "api_key": api_key,
        "active": True
    }
    
    client = client_repo.create(db, obj_in=new_client_data)
    
    # Create default settings for the client
    from app.repositories.client_repository import ClientSettingsRepository
    settings_repo = ClientSettingsRepository()
    settings_repo.create(db, obj_in={"client_id": client.client_id})
    
    return {
        "client_id": client.client_id,
        "name": client.name,
        "email": client.email,
        "api_key": client.api_key,
        "message": "Client registered successfully"
    }