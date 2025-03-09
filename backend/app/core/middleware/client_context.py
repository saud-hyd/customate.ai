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
            
            # If API key exists, lookup client
            if api_key:
                try:
                    db = SessionLocal()
                    client_repo = ClientRepository()
                    client = client_repo.get_by_api_key(db, api_key)
                    
                    if client:
                        # Set client context in request state for downstream handlers
                        request.state.client_id = client.client_id
                        request.state.client = client
                        client_id = client.client_id
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
        
        return response
        
    def _should_skip_auth(self, path: str) -> bool:
        """Check if authentication should be skipped for certain paths."""
        public_paths = [
            "/api/docs", 
            "/api/redoc", 
            "/api/openapi.json", 
            "/api/auth/token", 
            "/api/auth/register",
            "/",  # Root endpoint for health checks
        ]
        
        return any(path.startswith(public_path) for public_path in public_paths)