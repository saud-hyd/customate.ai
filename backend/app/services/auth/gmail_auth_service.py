# backend/app/services/auth/gmail_auth_service.py

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import secrets
import json
import base64
from urllib.parse import urlencode
import asyncio
import time
import threading

from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import google.auth.exceptions

from app.core import logger
from app.core.config.settings import settings

class GmailAuthService:
    """
    Service for handling Gmail OAuth 2.0 authentication flow using platform credentials.
    """
    
    # Class-level cache to track used authorization codes with timestamps
    _used_codes = {}
    
    # Thread-safe lock for protecting code operations
    _global_lock = threading.RLock()
    
    # Set to track codes currently being processed
    _processing_codes = set()
    
    def __init__(self, db: Session):
        self.db = db
        
        # OAuth 2.0 configuration - Include OpenID Connect scopes that Google automatically adds
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send', 
            'https://www.googleapis.com/auth/gmail.modify',
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]
        
        # Validate platform OAuth configuration
        if not settings.is_gmail_oauth_configured():
            raise ValueError(
                "Gmail OAuth not configured. Please set GMAIL_OAUTH_CLIENT_ID and GMAIL_OAUTH_CLIENT_SECRET environment variables."
            )
    
    def create_oauth_config(self) -> Dict[str, str]:
        """
        Create OAuth client configuration for Google API using platform credentials.
            
        Returns:
            OAuth configuration dictionary
        """
        return {
            "web": {
                "client_id": settings.GMAIL_OAUTH_CLIENT_ID,
                "client_secret": settings.GMAIL_OAUTH_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GMAIL_OAUTH_REDIRECT_URI]
            }
        }
    
    def get_authorization_url(self, user_id: str) -> Dict[str, str]:
        """
        Generate Gmail OAuth 2.0 authorization URL using platform credentials.
        
        Args:
            user_id: User identifier for state tracking
            
        Returns:
            Dictionary containing authorization URL and state
        """
        
        try:
            # Create OAuth config using platform credentials
            oauth_config = self.create_oauth_config()
            
            # Create flow
            flow = Flow.from_client_config(
                oauth_config,
                scopes=self.scopes,
                redirect_uri=settings.GMAIL_OAUTH_REDIRECT_URI
            )
            
            # Create simplified state with encoded data for CSRF protection
            state_data = {
                "user_id": user_id,
                "nonce": secrets.token_urlsafe(16)  # Random nonce for security
            }
            
            # Encode state data as base64
            state_json = json.dumps(state_data)
            state = base64.urlsafe_b64encode(state_json.encode()).decode()
            
            # Generate authorization URL
            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                state=state,
                prompt='consent'  # Force consent to get refresh token
            )
            
            logger.info(f"Generated Gmail OAuth URL for user {user_id}")
            
            return {
                "authorization_url": auth_url,
                "state": state
            }
            
        except Exception as e:
            logger.error(f"Error generating Gmail OAuth URL: {e}")
            raise Exception(f"Failed to generate authorization URL: {e}")
    
    async def exchange_code_for_tokens_async(self, code: str, state: str) -> Dict[str, Any]:
        """
        Async version of token exchange with thread-safe locking to prevent duplicates.
        """
        # Use thread-safe locking for immediate protection
        with self._global_lock:
            # Check if code is already being processed
            if code in self._processing_codes:
                logger.warning(f"Code already being processed by another request: {code[:10]}...")
                raise Exception("This authorization code is already being processed. Please wait.")
            
            # Check if code was already used
            if code in self._used_codes:
                logger.warning(f"Code already used: {code[:10]}...")
                raise Exception("This authorization code has already been used. Please try connecting again.")
            
            # Mark as being processed
            self._processing_codes.add(code)
            logger.info(f"Starting token exchange for code: {code[:10]}...")
        
        try:
            # Call the synchronous version outside the lock (but with processing flag set)
            result = self.exchange_code_for_tokens(code, state)
            return result
        finally:
            # Always clean up processing flag
            with self._global_lock:
                self._processing_codes.discard(code)
    
    def exchange_code_for_tokens(self, code: str, state: str) -> Dict[str, Any]:
        """
        Exchange OAuth authorization code for access and refresh tokens using platform credentials.
        
        Args:
            code: OAuth authorization code
            state: OAuth state for validation
            
        Returns:
            Dictionary containing tokens and user info
        """
        
        try:
            # Mark code as used with timestamp (cleanup happens in async version)
            import time
            current_time = time.time()
            
            with self._global_lock:
                self._used_codes[code] = current_time
                
                # Clean up old codes to prevent memory leak (keep only last 100)
                if len(self._used_codes) > 100:
                    # Remove oldest codes
                    oldest_codes = sorted(self._used_codes.items(), key=lambda x: x[1])[:50]
                    for old_code, _ in oldest_codes:
                        self._used_codes.pop(old_code, None)
            
            # Decode and validate state
            try:
                state_json = base64.urlsafe_b64decode(state.encode()).decode()
                state_data = json.loads(state_json)
                
                # Validate required fields (simplified since we don't store credentials in state)
                required_fields = ["user_id", "nonce"]
                if not all(field in state_data for field in required_fields):
                    raise Exception("Invalid state data structure")
                    
            except (json.JSONDecodeError, ValueError, Exception) as e:
                logger.error(f"Failed to decode OAuth state: {e}")
                raise Exception("Invalid or expired OAuth state")
            
            # Create OAuth config using platform credentials
            oauth_config = self.create_oauth_config()
            
            # Create flow
            flow = Flow.from_client_config(
                oauth_config,
                scopes=self.scopes,
                redirect_uri=settings.GMAIL_OAUTH_REDIRECT_URI,
                state=state
            )
            
            # Exchange code for tokens
            flow.fetch_token(code=code)
            
            # Get credentials
            credentials = flow.credentials
            
            # Get user info from Gmail API
            from googleapiclient.discovery import build
            service = build('gmail', 'v1', credentials=credentials)
            profile = service.users().getProfile(userId='me').execute()
            
            result = {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,  # Platform client ID
                "client_secret": credentials.client_secret,  # Platform client secret
                "scopes": credentials.scopes,
                "user_info": {
                    "email": profile.get("emailAddress"),
                    "messages_total": profile.get("messagesTotal", 0),
                    "threads_total": profile.get("threadsTotal", 0)
                }
            }
            
            logger.info(f"Successfully exchanged OAuth code for Gmail tokens: {profile.get('emailAddress')}")
            
            return result
            
        except google.auth.exceptions.GoogleAuthError as e:
            logger.error(f"Google Auth error during token exchange: {e}")
            raise Exception(f"Authentication failed: {e}")
            
        except Exception as e:
            logger.error(f"Error exchanging OAuth code: {e}")
            raise Exception(f"Token exchange failed: {e}")
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """
        Refresh Gmail API access token using refresh token and platform credentials.
        
        Args:
            refresh_token: OAuth refresh token
            
        Returns:
            Dictionary containing new access token
        """
        
        try:
            # Create credentials object using platform credentials
            credentials = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GMAIL_OAUTH_CLIENT_ID,
                client_secret=settings.GMAIL_OAUTH_CLIENT_SECRET
            )
            
            # Refresh token
            credentials.refresh(Request())
            
            logger.info("Successfully refreshed Gmail access token")
            
            return {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "expires_at": credentials.expiry.isoformat() if credentials.expiry else None
            }
            
        except google.auth.exceptions.RefreshError as e:
            logger.error(f"Gmail token refresh failed: {e}")
            raise Exception(f"Token refresh failed: {e}")
            
        except Exception as e:
            logger.error(f"Error refreshing Gmail token: {e}")
            raise Exception(f"Token refresh error: {e}")
    
    def validate_credentials(self, access_token: str, refresh_token: str) -> bool:
        """
        Validate Gmail API credentials using platform OAuth configuration.
        
        Args:
            access_token: OAuth access token
            refresh_token: OAuth refresh token
            
        Returns:
            True if credentials are valid, False otherwise
        """
        
        try:
            # Create credentials object using platform credentials
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GMAIL_OAUTH_CLIENT_ID,
                client_secret=settings.GMAIL_OAUTH_CLIENT_SECRET
            )
            
            # Test API access
            from googleapiclient.discovery import build
            service = build('gmail', 'v1', credentials=credentials)
            profile = service.users().getProfile(userId='me').execute()
            
            logger.info(f"Gmail credentials validated for: {profile.get('emailAddress')}")
            return True
            
        except Exception as e:
            logger.error(f"Gmail credential validation failed: {e}")
            return False
    
    def revoke_access(self, access_token: str) -> bool:
        """
        Revoke Gmail API access token.
        
        Args:
            access_token: OAuth access token to revoke
            
        Returns:
            True if revocation successful, False otherwise
        """
        
        try:
            import requests
            
            response = requests.post(
                'https://oauth2.googleapis.com/revoke',
                params={'token': access_token},
                headers={'content-type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code == 200:
                logger.info("Gmail access token revoked successfully")
                return True
            else:
                logger.error(f"Gmail token revocation failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error revoking Gmail token: {e}")
            return False
    
    def get_oauth_state_data(self, state: str) -> Optional[Dict[str, Any]]:
        """Get OAuth state data for validation (simplified for platform credentials)."""
        try:
            state_json = base64.urlsafe_b64decode(state.encode()).decode()
            state_data = json.loads(state_json)
            # Validate that required fields exist
            if "user_id" in state_data and "nonce" in state_data:
                return state_data
            return None
        except (json.JSONDecodeError, ValueError):
            return None
    
    def clear_oauth_state(self, state: str) -> None:
        """Clear OAuth state data (no-op for stateless implementation)."""
        pass