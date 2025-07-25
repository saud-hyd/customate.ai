# Path: backend/app/api/auth/routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Form, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import re
import secrets
import uuid
import httpx
from urllib.parse import urlencode
import json
import base64
import hmac
import hashlib
import logging
import os

from app.core.database.dependencies import get_db

def validate_password_strength(password: str) -> bool:
    """
    Validates password strength: at least 8 characters, contains uppercase, lowercase, and special character.
    """
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[\W_]', password):
        return False
    return True
from app.core.security.authentication import (
    authenticate_client, create_access_token, 
    create_magic_link_token, verify_magic_link_token,
    encode_state_data, decode_state_data,
    get_password_hash,
    verify_verification_token,
    create_verification_token  # Import the missing function
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
    """Authenticate client with password and provide access token."""
    
    # Check if client exists first to provide specific error messages
    client_repo = ClientRepository()
    client = client_repo.get_by_email(db, form_data.username)
    
    if client and not client.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not verified. Please check your email and click the verification link.",
        )
    
    client = authenticate_client(db, form_data.username, form_data.password)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with client details
    access_token = create_access_token(data={"sub": client.client_id, "email": client.email})
    
    # Return both JWT token and API key
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "client_id": client.client_id,
        "api_key": client.api_key,  # Include API key for widget use
        "email": client.email,
        "name": client.name
    }
                
        
@router.post("/google/register", response_model=Dict[str, Any])
async def google_oauth_register(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Register a new client using Google OAuth - no email verification required.
    """
    try:
        # Get the request body as JSON instead of form data
        body = await request.json()
        id_token = body.get("idToken")  # Note: frontend sends "idToken" not "id_token"
        industry = body.get("industry")
        website = body.get("website")
        
        if not id_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google ID token is required"
            )
        
        if not industry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Industry is required"
            )
        
        # Verify Google ID token
        google_user_info = verify_google_id_token(id_token)
        
        if not google_user_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google authentication"
            )
        
        email = google_user_info.get("email")
        name = google_user_info.get("name", email.split("@")[0])
        
        logger.info(f"Google OAuth registration attempt: email={email}, name={name}")
        
        # Check if client with this email already exists
        client_repo = ClientRepository()
        existing_client = client_repo.get_by_email(db, email)
        
        if existing_client:
            # If exists and active, just return login response
            if existing_client.active:
                access_token = create_access_token(data={"sub": existing_client.client_id, "email": existing_client.email})
                return {
                    "message": "Welcome back! Logged in with Google.",
                    "access_token": access_token,
                    "token_type": "bearer",
                    "client_id": existing_client.client_id,
                    "api_key": existing_client.api_key,
                    "email": existing_client.email,
                    "name": existing_client.name
                }
            else:
                # Activate the existing inactive account
                existing_client.active = True
                db.add(existing_client)
                db.commit()
                
                access_token = create_access_token(data={"sub": existing_client.client_id, "email": existing_client.email})
                return {
                    "message": "Account activated and logged in with Google.",
                    "access_token": access_token,
                    "token_type": "bearer",
                    "client_id": existing_client.client_id,
                    "api_key": existing_client.api_key,
                    "email": existing_client.email,
                    "name": existing_client.name
                }
        
        # Generate API key for widget
        api_key = secrets.token_urlsafe(32)
        
        # Create new client - ACTIVE immediately (Google verified)
        client_data = {
            "name": name,
            "email": email,
            "industry": industry,
            "website": website,
            "api_key": api_key,
            "password_hash": None,  # No password for Google OAuth users
            "active": True  # ACTIVE immediately - no verification needed
        }
        
        # Create the client
        new_client = client_repo.create(db, obj_in=client_data)
        logger.info(f"Created Google OAuth client: {new_client.client_id}")
        
        # Create access token for immediate login
        access_token = create_access_token(data={"sub": new_client.client_id, "email": new_client.email})
        
        return {
            "message": "Registration successful! Welcome to your dashboard.",
            "access_token": access_token,
            "token_type": "bearer",
            "client_id": new_client.client_id,
            "api_key": api_key,
            "email": new_client.email,
            "name": new_client.name,
            "is_new_user": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during Google OAuth registration: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google registration failed due to a server error"
        )    
        
def verify_google_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Google ID token and return user info.
    You'll need to install google-auth: pip install google-auth
    """
    try:
        from google.auth.transport import requests
        from google.oauth2 import id_token as google_id_token
        
        # Verify the token
        idinfo = google_id_token.verify_oauth2_token(
            id_token, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID  # Add this to your settings
        )
        
        # Check issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return None
            
        return {
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture")
        }
    except Exception as e:
        logger.error(f"Google ID token verification failed: {str(e)}")
        return None            
                
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
                "industry": "other",  # Default industry
                "active": True  # Google OAuth users are auto-verified
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

@router.post("/register", response_model=Dict[str, Any])
async def register_client(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    industry: str = Form(...),
    website: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Register a new client - only create user AFTER email is sent successfully."""
    try:
        logger.info(f"Registration attempt: email={email}, name={name}, industry={industry}")
        
        # 1. VALIDATE EVERYTHING FIRST
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email format"
            )
        
        if not validate_password_strength(password):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters with uppercase, lowercase, and special character"
            )
        
        # 2. CHECK USER DOESN'T EXIST
        client_repo = ClientRepository()
        existing_client = client_repo.get_by_email(db, email)
        if existing_client:
            # If user exists but is not active, delete them for re-registration
            if not existing_client.active:
                logger.info(f"Removing inactive account for re-registration: {email}")
                # Also remove any existing tokens
                token_repo = MagicLinkTokenRepository()
                token_repo.delete_tokens_for_email(db, email)
                db.delete(existing_client)
                db.commit()
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A client with this email already exists"
                )
        
        # 3. PREPARE DATA
        password_hash = get_password_hash(password)
        api_key = secrets.token_urlsafe(32)
        frontend_url = settings.FRONTEND_URL or str(request.base_url).rstrip('/')
        
        # 4. CREATE USER FIRST, THEN CREATE TOKEN WITH REAL CLIENT_ID
        client_data = {
            "name": name,
            "email": email,
            "industry": industry,
            "website": website,
            "api_key": api_key,
            "password_hash": password_hash,
            "active": False  # Will be activated when email is verified
        }
        
        # Create client in database
        new_client = client_repo.create(db, obj_in=client_data)
        db.flush()  # Ensure client is created before creating token
        
        # 5. CREATE VERIFICATION TOKEN WITH REAL CLIENT_ID
        verification_token = create_verification_token(email, new_client.client_id)
        verification_link_url = f"{frontend_url}/verify-email?token={verification_token}"
        
        # 6. STORE TOKEN IN DATABASE
        token_repo = MagicLinkTokenRepository()
        token_repo.create_token(db, email, verification_token)
        
        # 7. SEND EMAIL - IF IT FAILS, ROLLBACK EVERYTHING
        email_service = EmailService()
        logger.info(f"Sending verification email to: {email}")
        email_sent = email_service.send_magic_link_email(email, verification_link_url, is_registration=True)
        
        if not email_sent:
            # Rollback everything if email fails
            db.rollback()
            logger.error(f"Failed to send verification email to {email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please check your email address and try again."
            )
        
        # 8. COMMIT EVERYTHING ONLY IF EMAIL WAS SENT
        db.commit()
        logger.info(f"Registration successful for: {email}")
        
        return {
            "message": "Registration successful! Please check your email and click the verification link to activate your account.",
            "email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to a server error"
        )
                                
@router.post("/password-reset/request", response_model=Dict[str, Any])
async def request_password_reset(
    request: Request,
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Request a password reset link.
    """
    try:
        # Check if client exists
        client_repo = ClientRepository()
        client = client_repo.get_by_email(db, email)
        
        if not client:
            # Don't reveal if email exists
            return {
                "message": "If your email is registered, you will receive a password reset link."
            }
        
        # Generate reset token with appropriate claims
        token_data = {
            "sub": email,
            # Ensure we're using a consistent token type
            "type": "password_reset",
            "jti": secrets.token_hex(8)
        }
        
        logger.info(f"Creating password reset token for {email} with data: {token_data}")
        reset_token = create_magic_link_token(token_data)
        
        # Store token in database
        token_repo = MagicLinkTokenRepository()
        token_repo.create_token(db, email, reset_token)
        
        # Generate reset link URL
        frontend_url = settings.FRONTEND_URL
        if not frontend_url:
            frontend_url = str(request.base_url).rstrip('/')
        
        reset_link_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Send password reset email
        email_service = EmailService()
        email_sent = email_service.send_password_reset_email(email, reset_link_url)
        
        if not email_sent:
            logger.error(f"Failed to send password reset email to {email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email"
            )
        
        logger.info(f"Password reset email sent to {email}")
        
        return {
            "message": "If your email is registered, you will receive a password reset link."
        }
    except Exception as e:
        logger.error(f"Password reset request error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )

@router.post("/password-reset/verify", response_model=Dict[str, Any])
async def reset_password(
    token: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Reset password using a valid token."""
    try:
        logger.info(f"Attempting password reset with token: {token[:10]}...")
        
        # Verify token JWT
        try:
            token_data = verify_magic_link_token(token)
            logger.info(f"Token data decoded: {token_data}")
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token - JWT verification failed"
            )
        
        email = token_data.get("sub")
        token_type = token_data.get("type")
        
        if not email:
            logger.error("Token missing subject (email) claim")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token - missing email"
            )
        
        # Check token type - accept both for compatibility
        if token_type != "password_reset" and token_type != "reset":
            logger.error(f"Invalid token type: {token_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        
        # Validate new password strength
        if not validate_password_strength(new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters with uppercase, lowercase, and special character"
            )
        
        # Get the client by email
        client_repo = ClientRepository()
        client = client_repo.get_by_email(db, email)
        
        if not client:
            logger.error(f"User not found for email: {email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # FIXED: Use the correct update_password method
        logger.info(f"Updating password for client: {client.client_id}")
        success = client_repo.update_password(db, client.client_id, new_password)
        
        if not success:
            logger.error(f"Failed to update password for client: {client.client_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        # Mark token as used
        token_repo = MagicLinkTokenRepository()
        token_repo.use_token(db, email, token)
        
        # Create access token for auto-login
        access_token = create_access_token(data={"sub": client.client_id, "email": client.email})
        
        return {
            "message": "Password reset successful. You can now log in with your new password.",
            "access_token": access_token,
            "token_type": "bearer",
            "client_id": client.client_id,
            "api_key": client.api_key  # Return the actual API key, not the password
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )
        
@router.get("/verify-email", response_model=Dict[str, Any])
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verify email address and activate client account.
    This endpoint ONLY verifies the email and activates the account.
    It does NOT provide login tokens - user must log in separately.
    """
    try:
        logger.info(f"Verifying email with token: {token[:20]}...")
        
        # Check if token exists in database first
        token_repo = MagicLinkTokenRepository()
        
        # Get token data from database
        token_data = token_repo.get_token_data(db, token)
        if not token_data:
            logger.error(f"Email verification token not found in database: {token[:20]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired verification link"
            )
        
        email = token_data.get("email")
        
        # Verify token matches email
        if not verify_verification_token(token, email):
            logger.error(f"Token verification failed for email: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification link"
            )
        
        # Get the client by email
        client_repo = ClientRepository()
        client = client_repo.get_by_email(db, email)
        
        if not client:
            logger.error(f"Client not found for email: {email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        if client.active:
            logger.info(f"Client already verified: {email}")
            return {
                "message": "Email already verified. You can now log in.",
                "already_verified": True,
                "verified": True
            }
        
        # Activate the client account with transaction safety
        try:
            client.active = True
            db.add(client)
            db.flush()  # Flush before marking token as used
            
            # Mark verification token as used
            token_repo.use_token(db, email, token)
            
            # Commit all changes together
            db.commit()
            
            logger.info(f"Email verification successful for: {email}")
            
            return {
                "message": "Email verification successful! Your account is now active. Please log in with your credentials.",
                "verified": True,
                "already_verified": False
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to activate account for {email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to activate account"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed due to a server error"
        )