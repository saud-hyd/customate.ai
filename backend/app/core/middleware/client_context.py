# File: backend/app/core/middleware/client_context.py

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import time

from app.core.database.session import SessionLocal
from app.repositories.client_repository import ClientRepository
from app.core import logger

class ClientContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts client context from requests.
    
    This middleware:
    1. Examines the request for API keys or tokens
    2. Identifies the client if possible
    3. Adds client context to the request state
    4. Measures request processing time for analytics
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        # Start timing for analytics
        start_time = time.time()
        client_id = None
        
        # Skip authentication for certain paths
        if not self._should_skip_auth(request.url.path):
            # Try to extract API key from header
            api_key = request.headers.get("X-API-Key")
            
            # If not in header, check query parameters for widget support
            if not api_key:
                api_key = request.query_params.get("apiKey")
                
            # If API key exists, lookup client
            if api_key:
                try:
                    logger.debug(f"Authenticating request with API key: {api_key[:8]}...")
                    db = SessionLocal()
                    client_repo = ClientRepository()
                    client = client_repo.get_by_api_key(db, api_key)
                    
                    if client:
                        # Set client context in request state for downstream handlers
                        request.state.client_id = client.client_id
                        request.state.client = client
                        client_id = client.client_id
                        logger.debug(f"Successfully authenticated client: {client_id}")
                    else:
                        # Log warning when client lookup fails but don't break the request flow
                        logger.warning(f"No client found for API key: {api_key[:8]}...")
                finally:
                    db.close()
                
        # Process the request
        response = await call_next(request)
        
        # Add client tracking header for debugging and analytics if client was identified
        if client_id:
            response.headers["X-Client-ID"] = client_id
            
        # Add processing time for analytics
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log request details for analytics
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"Client: {client_id or 'anonymous'} "
            f"Status: {response.status_code} "
            f"Process Time: {process_time:.4f}s"
        )
        
        # In the dispatch method after the request processing
        # Update usage tracking
        if client_id and response.status_code < 500:
            try:
                # Track user activity for subscription limits
                from app.services.analytics.usage_tracker import UsageTracker
                tracker = UsageTracker()
                
                # Increment active user count if this is a new user session
                user_id = request.headers.get("X-User-ID") or request.query_params.get("user_id")
                if user_id:
                    # In a real async implementation, this would need to be handled properly
                    # For now, we're using a sync method in an async context
                    db = SessionLocal()
                    try:
                        tracker.track_user_activity(db, client_id, user_id)
                    finally:
                        db.close()
            except Exception as e:
                logger.error(f"Error tracking user activity: {str(e)}")
        
        return response
        
    def _should_skip_auth(self, path: str) -> bool:
        """Check if authentication should be skipped for certain paths."""
        public_paths = [
            "/api/docs", 
            "/api/redoc", 
            "/api/openapi.json", 
            "/api/auth/token", 
            "/api/auth/register",
            "/api/auth/magic-link/request",
            "/api/auth/magic-link/verify",
            "/api/auth/password-reset/request",
            "/api/auth/password-reset/verify",
            "/api/widget/widget.js",
            "/api/widget/chat",
            "/",  # Root endpoint for health checks
        ]
        
        return any(path.startswith(public_path) for public_path in public_paths)