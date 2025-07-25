# backend/app/core/middleware/integration_auth_middleware.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import jwt
from datetime import datetime, timedelta

from app.core.config.settings import settings
from app.core import logger

class IntegrationAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware for handling integration OAuth callback routes.
    
    This middleware:
    1. Intercepts OAuth callback routes
    2. Validates state parameter for CSRF protection
    3. Adds integration context to request
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        # Check if this is an OAuth callback route
        path = request.url.path
        
        if path.startswith("/api/integration/callback"):
            # Extract state parameter
            state = request.query_params.get("state")
            
            if state:
                try:
                    # Decode and validate state token
                    state_data = jwt.decode(
                        state,
                        settings.SECRET_KEY,
                        algorithms=["HS256"]
                    )
                    
                    # Check if state is expired
                    if "exp" in state_data and datetime.fromtimestamp(state_data["exp"]) < datetime.utcnow():
                        # State is expired, redirect to error page
                        return Response(
                            content="OAuth state expired. Please try again.",
                            status_code=400
                        )
                    
                    # Add state data to request
                    request.state.integration_id = state_data.get("integration_id")
                    request.state.client_id = state_data.get("client_id")
                    request.state.provider = state_data.get("provider")
                    
                except jwt.InvalidTokenError:
                    # Invalid state token, redirect to error page
                    return Response(
                        content="Invalid OAuth state. Please try again.",
                        status_code=400
                    )
            else:
                # Missing state parameter, redirect to error page
                return Response(
                    content="Missing OAuth state. Please try again.",
                    status_code=400
                )
        
        # Process the request
        response = await call_next(request)
        return response
    
    @staticmethod
    def generate_oauth_state(integration_id: str, client_id: str, provider: str) -> str:
        """
        Generate a secure state parameter for OAuth flow.
        
        Args:
            integration_id: Integration ID
            client_id: Client ID
            provider: Provider type
            
        Returns:
            JWT encoded state token
        """
        # Create state data with expiration
        state_data = {
            "integration_id": integration_id,
            "client_id": client_id,
            "provider": provider,
            "exp": datetime.utcnow() + timedelta(minutes=10)  # Expire after 10 minutes
        }
        
        # Encode state data as JWT
        state_token = jwt.encode(
            state_data,
            settings.SECRET_KEY,
            algorithm="HS256"
        )
        
        return state_token