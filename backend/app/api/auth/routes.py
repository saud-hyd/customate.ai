from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database.dependencies import get_db
from app.core.security.authentication import authenticate_client, create_access_token
from app.repositories.client_repository import ClientRepository
import logging
from app.services.email.email_service import EmailService
from app.repositories.auth_repository import OTPRepository
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/token", response_model=Dict[str, Any])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate client and provide an access token.
    """
    logger.debug(f"Login attempt for: {form_data.username}")
    
    # Try to authenticate using provided credentials
    client = authenticate_client(db, form_data.username, form_data.password)
    
    if not client:
        logger.warning(f"Authentication failed for: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with client details
    access_token = create_access_token(data={"sub": client.client_id, "email": client.email})
    
    logger.info(f"Successful login for client: {client.client_id}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "client_id": client.client_id,
        "api_key": client.api_key
    }
        
@router.post("/request-otp", response_model=Dict[str, Any])
async def request_otp(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Request an OTP for email verification.
    """
    # Check if email already exists and is verified
    client_repo = ClientRepository()
    existing_client = client_repo.get_by_email(db, email)
    
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A client with this email already exists"
        )
    
    # Initialize services
    email_service = EmailService()
    otp_repo = OTPRepository()
    
    # Generate and store OTP
    otp = email_service.generate_otp()
    otp_repo.create_otp(db, email, otp)
    
    # Send OTP email
    if not email_service.send_otp_email(email, otp):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email"
        )
    
    return {
        "message": "Verification code sent to your email",
        "email": email
    }

@router.post("/verify-otp", response_model=Dict[str, Any])
async def verify_otp(
    email: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Verify an OTP for email verification.
    """
    otp_repo = OTPRepository()
    
    if not otp_repo.verify_otp(db, email, otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    return {
        "message": "Email verification successful",
        "email": email,
        "verified": True
    }

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def register_client(
    name: str = Form(...),
    email: str = Form(...),
    industry: str = Form(...),
    website: str = Form(None),
    password: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Register a new client after OTP verification.
    """
    # Check if client with this email already exists
    client_repo = ClientRepository()
    existing_client = client_repo.get_by_email(db, email)
    
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A client with this email already exists"
        )
    
    # Verify OTP
    otp_repo = OTPRepository()
    if not otp_repo.verify_otp(db, email, otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Create new client
    client_data = {
        "name": name,
        "email": email,
        "industry": industry,
        "website": website,
        "api_key": password
    }
    
    try:
        new_client = client_repo.create(db, obj_in=client_data)
        
        # Create access token for auto-login
        access_token = create_access_token(data={"sub": new_client.client_id, "email": new_client.email})
        
        return {
            "client_id": new_client.client_id,
            "name": new_client.name,
            "email": new_client.email,
            "message": "Registration successful",
            "access_token": access_token,
            "token_type": "bearer",
            "api_key": new_client.api_key
        }
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to an internal error"
        )        