# backend/app/services/auth/gmail_auth_service.py

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import secrets
import json
import base64
from urllib.parse import urlencode

from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import google.auth.exceptions

from app.core import logger
from app.core.config.settings import settings

class GmailAuthService:
    """
    Service for handling Gmail OAuth 2.0 authentication flow.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # OAuth 2.0 configuration
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify'
        ]
        
        # OAuth states will be encoded in the state parameter itself
        pass
    
    def create_oauth_config(
        self, 
        client_id: str, 
        client_secret: str,
        redirect_uri: str
    ) -> Dict[str, str]:
        """
        Create OAuth client configuration for Google API.
        
        Args:
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret
            redirect_uri: OAuth redirect URI
            
        Returns:
            OAuth configuration dictionary
        """
        return {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]
            }
        }
    
    def get_authorization_url(
        self, 
        client_id: str, 
        client_secret: str,
        redirect_uri: str,
        user_id: str
    ) -> Dict[str, str]:
        """
        Generate Gmail OAuth 2.0 authorization URL.
        
        Args:
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret
            redirect_uri: OAuth redirect URI
            user_id: User identifier for state tracking
            
        Returns:
            Dictionary containing authorization URL and state
        """
        
        try:
            # Create OAuth config
            oauth_config = self.create_oauth_config(client_id, client_secret, redirect_uri)
            
            # Create flow
            flow = Flow.from_client_config(
                oauth_config,
                scopes=self.scopes,
                redirect_uri=redirect_uri
            )
            
            # Create state with encoded data for CSRF protection
            state_data = {
                "user_id": user_id,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
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
    
    def exchange_code_for_tokens(
        self, 
        code: str, 
        state: str
    ) -> Dict[str, Any]:
        """
        Exchange OAuth authorization code for access and refresh tokens.
        
        Args:
            code: OAuth authorization code
            state: OAuth state for validation
            
        Returns:
            Dictionary containing tokens and user info
        """
        
        try:
            # Decode and validate state
            try:
                state_json = base64.urlsafe_b64decode(state.encode()).decode()
                state_data = json.loads(state_json)
                
                # Validate required fields
                required_fields = ["user_id", "client_id", "client_secret", "redirect_uri", "nonce"]
                if not all(field in state_data for field in required_fields):
                    raise Exception("Invalid state data structure")
                    
            except (json.JSONDecodeError, ValueError, Exception) as e:
                logger.error(f"Failed to decode OAuth state: {e}")
                raise Exception("Invalid or expired OAuth state")
            
            # Create OAuth config
            oauth_config = self.create_oauth_config(
                state_data["client_id"],
                state_data["client_secret"],
                state_data["redirect_uri"]
            )
            
            # Create flow
            flow = Flow.from_client_config(
                oauth_config,
                scopes=self.scopes,
                redirect_uri=state_data["redirect_uri"],
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
            
            # State is stateless, no cleanup needed
            
            result = {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
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
    
    def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, str]:
        """
        Refresh Gmail API access token using refresh token.
        
        Args:
            refresh_token: OAuth refresh token
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret
            
        Returns:
            Dictionary containing new access token
        """
        
        try:
            # Create credentials object
            credentials = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret
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
    
    def validate_credentials(
        self,
        access_token: str,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> bool:
        """
        Validate Gmail API credentials.
        
        Args:
            access_token: OAuth access token
            refresh_token: OAuth refresh token
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret
            
        Returns:
            True if credentials are valid, False otherwise
        """
        
        try:
            # Create credentials object
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret
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
        """Get OAuth state data for validation."""
        try:
            state_json = base64.urlsafe_b64decode(state.encode()).decode()
            return json.loads(state_json)
        except (json.JSONDecodeError, ValueError):
            return None
    
    def clear_oauth_state(self, state: str) -> None:
        """Clear OAuth state data (no-op for stateless implementation)."""
        pass