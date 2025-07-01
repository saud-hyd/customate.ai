# backend/app/core/middleware/analytics_middleware.py

import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session

from app.core.database.session import SessionLocal
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger

class AnalyticsMiddleware(BaseHTTPMiddleware):
    """
    Fixed middleware that properly tracks messages on all chat endpoints.
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
        
        # Chat endpoints that should increment message count
        self._message_endpoints = [
            "/api/chatbot/message",
            "/api/chatbot/message/stream", 
            "/api/widget/message",
            "/api/widget/message/stream"
        ]
    
    def _should_skip_tracking(self, path: str) -> bool:
        """Check if tracking should be skipped for this path."""
        return any(path.startswith(skip_path) for skip_path in self._endpoints_to_skip)
    
    def _is_chat_endpoint(self, path: str) -> bool:
        """Check if this is a chat endpoint that should increment message count."""
        return any(path.startswith(endpoint) for endpoint in self._message_endpoints)
    
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
                
                # INCREMENT MESSAGE COUNT FOR STREAM ENDPOINTS ONLY
                stream_endpoints = [
                    "/api/chatbot/message/stream",
                    "/api/widget/message/stream"
                ]
                
                if (any(request.url.path.startswith(endpoint) for endpoint in stream_endpoints) and 
                    response.status_code < 400):
                    
                    logger.info(f"Incrementing message count for client {client_id} on {request.url.path}")
                    success = self.usage_tracker._increment_message_count(db, client_id)
                    if success:
                        logger.info(f"✅ Message count incremented for {client_id}")
                    else:
                        logger.error(f"❌ Failed to increment message count for {client_id}")
                
                # Close the session
                db.close()
                
            except Exception as e:
                logger.error(f"Error in analytics middleware: {str(e)}")
                if 'db' in locals():
                    db.close()
        
        # Add processing time header for debugging
        response.headers["X-Process-Time-Ms"] = str(process_time_ms)
        
        return response