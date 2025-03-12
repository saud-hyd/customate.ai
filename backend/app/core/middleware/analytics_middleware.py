# backend/app/core/middleware/analytics_middleware.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import time

from app.core.database.session import SessionLocal
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger

class AnalyticsMiddleware(BaseHTTPMiddleware):
    """
    Middleware that tracks API usage for analytics.
    
    This middleware:
    1. Measures request processing time
    2. Records API endpoint usage
    3. Tracks response status codes
    4. Collects user agent information
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.usage_tracker = UsageTracker()
        self._endpoints_to_skip = [
            "/api/docs", 
            "/api/redoc", 
            "/api/openapi.json",
            "/metrics",
            "/health",
            "/favicon.ico",
            "/static",
        ]
    
    async def dispatch(self, request: Request, call_next):
        # Skip tracking for certain endpoints
        if self._should_skip_tracking(request.url.path):
            return await call_next(request)
        
        # Start timing
        start_time = time.time()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        process_time_ms = int(process_time * 1000)
        
        # Only track if we can identify the client
        if hasattr(request.state, "client_id"):
            # Get client ID from request state (set by ClientContextMiddleware)
            client_id = request.state.client_id
            
            try:
                # Open a new database session
                db = SessionLocal()
                
                # Track the API request
                self.usage_tracker.track_api_request(
                    db=db,
                    client_id=client_id,
                    endpoint=request.url.path,
                    method=request.method,
                    status_code=response.status_code,
                    response_time_ms=process_time_ms,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")
                )
                
                # Close the session
                db.close()
                
            except Exception as e:
                logger.error(f"Error tracking API usage: {str(e)}")
        
        # Add processing time header for debugging
        response.headers["X-Process-Time-Ms"] = str(process_time_ms)
        
        return response
    
    def _should_skip_tracking(self, path: str) -> bool:
        """Check if tracking should be skipped for this path."""
        return any(path.startswith(skip_path) for skip_path in self._endpoints_to_skip)