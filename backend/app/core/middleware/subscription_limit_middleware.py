# backend/app/core/middleware/subscription_limit_middleware.py

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import time
from typing import Dict, Any

from app.core.database.session import SessionLocal
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger

class SubscriptionLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces subscription limits on stream endpoints.
    Only checks message limits for streaming chat endpoints.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.usage_tracker = UsageTracker()
        
        # Only these endpoints are limited for messages
        self._limited_endpoints = [
            "/api/chatbot/message/stream",
            "/api/widget/message/stream"
        ]
        
        # Paths that should never be limited
        self._exempt_paths = [
            "/api/docs",
            "/api/redoc", 
            "/api/openapi.json",
            "/api/auth",
            "/api/client/subscription",
            "/api/webhook",
            "/health",
            "/metrics"
        ]
    
    def _should_check_message_limits(self, path: str) -> bool:
        """Check if this path should have message limits enforced."""
        # Skip exempt paths
        if any(path.startswith(exempt) for exempt in self._exempt_paths):
            return False
        
        # Check if it's a limited endpoint
        return any(path.startswith(endpoint) for endpoint in self._limited_endpoints)
    
    def _create_limit_response(self, limit_info: Dict[str, Any]) -> JSONResponse:
        """Create response when limits are exceeded."""
        plan_type = limit_info.get("plan_type", "free")
        messages_used = limit_info.get("messages_used", 0)
        message_limit = limit_info.get("message_limit", 0)
        
        # Upgrade recommendations based on plan
        upgrade_text = {
            "free": "Upgrade to Basic plan for 2,000 messages/month",
            "basic": "Upgrade to Standard plan for 5,000 messages/month", 
            "standard": "Upgrade to Professional plan for 12,000 messages/month",
            "professional": "Contact support for enterprise solutions"
        }
        
        return JSONResponse(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            content={
                "error": "message_limit_exceeded",
                "message": f"You've used {messages_used} of {message_limit} messages this month. Please upgrade your plan to continue.",
                "usage": {
                    "used": messages_used,
                    "limit": message_limit,
                    "percentage": limit_info.get("percentage", 0)
                },
                "plan_type": plan_type,
                "upgrade_recommendation": upgrade_text.get(plan_type, "Upgrade your plan for higher limits"),
                "upgrade_url": "/dashboard/subscription"
            }
        )
    
    async def dispatch(self, request: Request, call_next):
        # Only check limits if we have a client ID and it's a limited endpoint
        if (not hasattr(request.state, "client_id") or 
            not self._should_check_message_limits(request.url.path)):
            return await call_next(request)
        
        client_id = request.state.client_id
        
        try:
            db = SessionLocal()
            
            # Check message limits BEFORE processing the request
            limits_check = self.usage_tracker.check_message_limits(db, client_id)
            
            # If limits exceeded, block the request
            if not limits_check["within_limits"]:
                logger.warning(f"Message limit exceeded for client {client_id}: {limits_check['messages_used']}/{limits_check['message_limit']}")
                db.close()
                return self._create_limit_response(limits_check)
            
            # Process the request
            response = await call_next(request)
            
            # Add usage warning headers if approaching limit (80%+)
            percentage = limits_check.get("percentage", 0)
            if percentage >= 80:
                if percentage >= 95:
                    response.headers["X-Usage-Warning"] = "critical"
                    response.headers["X-Usage-Message"] = f"Critical: Only {limits_check['remaining']} messages left!"
                elif percentage >= 90:
                    response.headers["X-Usage-Warning"] = "high"
                    response.headers["X-Usage-Message"] = f"Warning: Only {limits_check['remaining']} messages remaining"
                else:
                    response.headers["X-Usage-Warning"] = "medium"
                    response.headers["X-Usage-Message"] = f"Notice: {percentage:.0f}% of message limit used"
                
                response.headers["X-Usage-Remaining"] = str(limits_check["remaining"])
                response.headers["X-Usage-Percentage"] = str(percentage)
            
            db.close()
            return response
            
        except Exception as e:
            logger.exception(f"Error in subscription limit middleware: {str(e)}")
            if 'db' in locals():
                db.close()
            
            # In case of error, allow the request to proceed (fail open)
            return await call_next(request)