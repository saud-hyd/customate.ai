from fastapi import APIRouter, Depends, HTTPException, status, Form, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import secrets
import uuid
import httpx
from urllib.parse import urlencode
import json
import base64
import hmac
import hashlib
import logging

from app.core.database.dependencies import get_db
from app.core.security.authentication import (
    authenticate_client, create_access_token, 
    create_magic_link_token, verify_magic_link_token,
    encode_state_data, decode_state_data
)
from app.repositories.client_repository import ClientRepository
from app.repositories.auth_repository import MagicLinkTokenRepository
from app.services.email.email_service import EmailService
from app.core.config.settings import settings
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

@router.post("/magic-link/request", response_model=Dict[str, Any])
async def request_magic_link(
    request: Request,
    email: str = Form(...),
    is_registration: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Request a magic link for email authentication.
    """
    try:
        client_repo = ClientRepository()
        existing_client = client_repo.get_by_email(db, email)
        
        # Check if registration vs login logic
        if is_registration and existing_client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A client with this email already exists"
            )
        
        if not is_registration and not existing_client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email"
            )
        
        # Generate magic link token with appropriate claims
        token_data = {
            "sub": email,
            "is_registration": is_registration,
            "jti": secrets.token_hex(8)
        }
        
        magic_token = create_magic_link_token(token_data)
        
        # Store token in database
        token_repo = MagicLinkTokenRepository()
        token_repo.create_token(db, email, magic_token)
        
        # Generate magic link URL
        frontend_url = settings.FRONTEND_URL
        if not frontend_url:
            frontend_url = str(request.base_url).rstrip('/')
        
        magic_link_url = f"{frontend_url}/auth/verify?token={magic_token}"
        
        # Send magic link email
        email_service = EmailService()
        if not email_service.send_magic_link_email(email, magic_link_url, is_registration):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send magic link email"
            )
        
        return {
            "message": "Magic link sent to your email",
            "email": email
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the detailed error
        logger.error(f"Internal error in request_magic_link: {str(e)}", exc_info=True)
        # Return a more helpful error message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process magic link request: {str(e)}"
        )
        
@router.get("/magic-link/verify", response_model=Dict[str, Any])
async def verify_magic_link(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verify a magic link token and authenticate or register the user.
    """
    token_repo = MagicLinkTokenRepository()
    client_repo = ClientRepository()
    
    try:
        # Verify token JWT
        token_data = verify_magic_link_token(token)
        email = token_data.get("sub")
        is_registration = token_data.get("is_registration", False)
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid magic link"
            )
        
        # Check if token exists in database and is valid
        if not token_repo.verify_token(db, email, token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired magic link"
            )
        
        # Mark token as used
        token_repo.use_token(db, email, token)
        
        # Handle registration vs login
        client = client_repo.get_by_email(db, email)
        
        if is_registration and not client:
            # Create new client for registration
            client_data = {
                "email": email,
                "name": email.split('@')[0],  # Default name from email
                "api_key": secrets.token_urlsafe(32),
                "client_id": str(uuid.uuid4()),
                "industry": "other"  # Default industry
            }
            
            client = client_repo.create(db, obj_in=client_data)
            logger.info(f"Created new client via magic link: {client.client_id}")
        elif not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": client.client_id, "email": client.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "client_id": client.client_id,
            "api_key": client.api_key,
            "email": client.email,
            "name": client.name
        }
    
    except Exception as e:
        logger.error(f"Error verifying magic link: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired magic link"
        )

@router.get("/google/login")
async def login_with_google(
    redirect_uri: str,
    is_registration: bool = False
):
    """
    Initiate Google OAuth login flow.
    """
    # Generate OAuth URL
    google_auth_url = "https://accounts.google.com/o/oauth2/auth"
    
    # Create state parameter with encrypted data
    state_data = {
        "is_registration": is_registration,
        "timestamp": int(datetime.utcnow().timestamp()),
        "nonce": secrets.token_hex(8)
    }
    
    state = encode_state_data(state_data)
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "email profile",
        "state": state
    }
    
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    
    # Redirect to Google's OAuth page
    return RedirectResponse(url=auth_url)

@router.get("/oauth/callback", response_model=Dict[str, Any])
async def oauth_callback(
    code: str,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Handle OAuth callback from Google.
    """
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {error}"
        )
    
    try:
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.OAUTH_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_info = token_response.json()
        
        if "error" in token_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth token error: {token_info['error']}"
            )
        
        # Get user info
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {token_info['access_token']}"}
        
        async with httpx.AsyncClient() as client:
            user_response = await client.get(user_info_url, headers=headers)
            user_info = user_response.json()
        
        # Extract necessary user data
        email = user_info.get("email")
        name = user_info.get("name", email.split('@')[0])
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not get email from Google account"
            )
        
        # Process state data
        state_data = decode_state_data(state) if state else {}
        is_registration = state_data.get("is_registration", False)
        
        # Find or create client
        client_repo = ClientRepository()
        client = client_repo.get_by_email(db, email)
        
        if not client and is_registration:
            # Create new client for registration
            client_data = {
                "email": email,
                "name": name,
                "api_key": secrets.token_urlsafe(32),
                "client_id": str(uuid.uuid4()),
                "industry": "other"  # Default industry
            }
            
            client = client_repo.create(db, obj_in=client_data)
            logger.info(f"Created new client via Google OAuth: {client.client_id}")
        elif not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": client.client_id, "email": client.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "client_id": client.client_id,
            "api_key": client.api_key,
            "name": client.name,
            "email": client.email
        }
    
    except Exception as e:
        logger.error(f"Error in OAuth callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback error: {str(e)}"
        )

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def register_client(
    name: str = Form(...),
    email: str = Form(...),
    industry: str = Form(...),
    website: str = Form(None),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Register a new client directly with email/password.
    This is an alternative to magic link registration.
    """
    # Check if client with this email already exists
    client_repo = ClientRepository()
    existing_client = client_repo.get_by_email(db, email)
    
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A client with this email already exists"
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