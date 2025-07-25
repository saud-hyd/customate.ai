# backend/app/services/integration/auth_manager.py
import httpx
import base64
import time
from typing import Dict, Any, Optional
from urllib.parse import urlencode
from datetime import datetime, timedelta

from app.core import logger

class IntegrationAuthManager:
    """
    Manager for handling authentication with external services.
    
    This manager:
    1. Handles different authentication methods (API key, OAuth)
    2. Manages OAuth token refresh
    3. Securely stores credentials
    """
    
    def __init__(self):
        # In production, this would be replaced with a secure credential store
        self._token_cache = {}
    
    async def authenticate_oauth(
        self,
        provider: str,
        auth_code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        token_url: str
    ) -> Dict[str, Any]:
        """
        Complete OAuth authentication flow.
        
        Args:
            provider: Service provider
            auth_code: Authorization code from OAuth flow
            client_id: OAuth client ID
            client_secret: OAuth client secret
            redirect_uri: Redirect URI used in authentication
            token_url: URL for token exchange
            
        Returns:
            Authentication result with tokens
        """
        try:
            # Prepare token request
            data = {
                "grant_type": "authorization_code",
                "code": auth_code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri
            }
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }
            
            # Make token request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_url,
                    data=urlencode(data),
                    headers=headers,
                    timeout=30.0
                )
            
            # Check response
            if response.status_code == 200:
                token_data = response.json()
                
                # Cache token with expiration time
                if "expires_in" in token_data:
                    expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                    token_data["expires_at"] = expires_at.timestamp()
                
                # Store in cache using a unique key
                cache_key = f"{provider}:{client_id}"
                self._token_cache[cache_key] = token_data
                
                return {
                    "success": True,
                    "credentials": {
                        "access_token": token_data.get("access_token"),
                        "refresh_token": token_data.get("refresh_token"),
                        "token_type": token_data.get("token_type", "Bearer"),
                        "expires_at": token_data.get("expires_at")
                    },
                    "provider_data": {
                        "instance_url": token_data.get("instance_url")
                    }
                }
            else:
                logger.error(f"OAuth token exchange failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"OAuth token exchange failed: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            logger.exception(f"Error in OAuth authentication: {str(e)}")
            return {
                "success": False,
                "error": f"Authentication error: {str(e)}"
            }
    
    async def refresh_oauth_token(
        self,
        provider: str,
        refresh_token: str,
        client_id: str,
        client_secret: str,
        token_url: str
    ) -> Dict[str, Any]:
        """
        Refresh an expired OAuth token.
        
        Args:
            provider: Service provider
            refresh_token: OAuth refresh token
            client_id: OAuth client ID
            client_secret: OAuth client secret
            token_url: URL for token refresh
            
        Returns:
            Refreshed authentication result
        """
        try:
            # Prepare refresh request
            data = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret
            }
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }
            
            # Make refresh request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_url,
                    data=urlencode(data),
                    headers=headers,
                    timeout=30.0
                )
            
            # Check response
            if response.status_code == 200:
                token_data = response.json()
                
                # Cache token with expiration time
                if "expires_in" in token_data:
                    expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                    token_data["expires_at"] = expires_at.timestamp()
                
                # Store in cache using a unique key
                cache_key = f"{provider}:{client_id}"
                self._token_cache[cache_key] = token_data
                
                return {
                    "success": True,
                    "credentials": {
                        "access_token": token_data.get("access_token"),
                        "refresh_token": token_data.get("refresh_token", refresh_token),  # Use old refresh token if not provided
                        "token_type": token_data.get("token_type", "Bearer"),
                        "expires_at": token_data.get("expires_at")
                    },
                    "provider_data": {
                        "instance_url": token_data.get("instance_url")
                    }
                }
            else:
                logger.error(f"OAuth token refresh failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"OAuth token refresh failed: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            logger.exception(f"Error in OAuth token refresh: {str(e)}")
            return {
                "success": False,
                "error": f"Token refresh error: {str(e)}"
            }
    
    def is_token_expired(self, credentials: Dict[str, Any]) -> bool:
        """
        Check if an OAuth token is expired.
        
        Args:
            credentials: Authentication credentials
            
        Returns:
            Boolean indicating if token is expired
        """
        if "expires_at" in credentials:
            # Add buffer time to avoid edge cases
            buffer_seconds = 60
            return time.time() + buffer_seconds >= credentials["expires_at"]
        
        # If no expires_at, assume not expired
        return False
    
    def get_basic_auth_header(self, username: str, password: str) -> str:
        """
        Create basic authentication header.
        
        Args:
            username: Username
            password: Password
            
        Returns:
            Base64 encoded auth header value
        """
        auth_str = f"{username}:{password}"
        encoded_auth = base64.b64encode(auth_str.encode()).decode()
        return f"Basic {encoded_auth}"