from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import json
import time
from typing import Dict, Any, List, Optional

from app.core.database.session import SessionLocal
from app.services.analytics.usage_tracker import UsageTracker
from app.repositories.client_repository import SubscriptionRepository
from app.core import logger
from app.services.notification.notification_service import NotificationService

# Path patterns that should bypass limit checking
EXEMPT_PATHS = [
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/api/auth",
    "/api/client/subscription",
    "/api/webhook",
    "/health",
    "/metrics"
]

# Endpoint specific limit types
ENDPOINT_LIMIT_MAPPING = {
    "/api/chatbot/message": "messages",
    "/api/chatbot/stream": "messages",
    "/api/chatbot/message/stream": "messages",
    "/api/knowledge/documents/upload": "storage",
    "/api/knowledge/collection": "collections"
}

class SubscriptionLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces subscription usage limits.
    
    This middleware:
    1. Checks if the client has exceeded their subscription limits
    2. Blocks requests that would exceed limits
    3. Provides clear error messages
    4. Tracks near-limit usage for notifications
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.usage_tracker = UsageTracker()
        self.subscription_repo = SubscriptionRepository()
        self.notification_service = NotificationService()
        
        # Thresholds for notifications
        self.notification_thresholds = [50, 75, 90, 95]  # Percentages
        
        # Cache of recent client notifications to prevent spam
        # Structure: {client_id: {limit_type: {threshold: last_notification_time}}}
        self.notification_cache = {}
        
        # Cache of recent limit checks to reduce DB load
        # Structure: {client_id: {cache_time: timestamp, limits: {...}}}
        self.limit_check_cache = {}
        # Cache TTL in seconds
        self.cache_ttl = 300  # 5 minutes
    
    async def dispatch(self, request: Request, call_next):
        # Skip check for exempt paths
        if self._should_bypass_check(request.url.path):
            return await call_next(request)
        
        # Skip if no client context
        if not hasattr(request.state, "client_id"):
            return await call_next(request)
        
        client_id = request.state.client_id
        
        # Check cache first to avoid DB lookup for every request
        limits_exceeded, limit_info = self._check_limits_cache(client_id, request.url.path)
        
        if limits_exceeded:
            # Client has exceeded limits, return error response
            return self._create_limit_exceeded_response(limit_info)
        
        # Check for approaching limits and send notifications if needed
        await self._check_and_notify_approaching_limits(client_id, limit_info)
        
        # Process the request
        response = await call_next(request)
        
        # For some endpoints like storage uploads, we need to update usage after the request
        if self._should_update_usage_after(request.url.path, response.status_code):
            await self._update_usage_after_request(client_id, request, response)
        
        return response
    
    def _should_bypass_check(self, path: str) -> bool:
        """Check if path should bypass limit checking."""
        return any(path.startswith(exempt_path) for exempt_path in EXEMPT_PATHS)
    
    def _check_limits_cache(self, client_id: str, path: str) -> tuple:
        """
        Check if client has exceeded limits, using cache if available.
        
        Returns:
            tuple: (limits_exceeded, limit_info)
        """
        current_time = time.time()
        
        # Check cache first
        if client_id in self.limit_check_cache:
            cache_entry = self.limit_check_cache[client_id]
            cache_age = current_time - cache_entry["cache_time"]
            
            # Use cache if relatively fresh
            if cache_age < self.cache_ttl:
                limits = cache_entry["limits"]
                
                # Check if any limits exceeded
                for limit_type, limit_data in limits.items():
                    if limit_data["percentage"] >= 100:
                        limit_info = {
                            "limit_type": limit_type,
                            "used": limit_data["used"],
                            "limit": limit_data["limit"],
                            "percentage": limit_data["percentage"]
                        }
                        return True, limit_info
                
                # For specific endpoints, check the relevant limit type
                limit_type = self._get_limit_type_for_path(path)
                if limit_type and limit_type in limits:
                    if limits[limit_type]["percentage"] >= 100:
                        return True, {
                            "limit_type": limit_type,
                            "used": limits[limit_type]["used"],
                            "limit": limits[limit_type]["limit"],
                            "percentage": limits[limit_type]["percentage"]
                        }
                
                # No limits exceeded
                return False, limits
        
        # No cache hit or cache expired, check database
        db = SessionLocal()
        try:
            # Get fresh limits data
            limits_data = self.usage_tracker.check_subscription_limits(db, client_id)
            
            # Update cache
            self.limit_check_cache[client_id] = {
                "cache_time": current_time,
                "limits": limits_data.get("current", {})
            }
            
            limits = limits_data.get("current", {})
            
            # Check if any limits exceeded
            for limit_type, limit_data in limits.items():
                if limit_data["percentage"] >= 100:
                    limit_info = {
                        "limit_type": limit_type,
                        "used": limit_data["used"],
                        "limit": limit_data["limit"],
                        "percentage": limit_data["percentage"]
                    }
                    return True, limit_info
            
            # For specific endpoints, check the relevant limit type
            limit_type = self._get_limit_type_for_path(path)
            if limit_type and limit_type in limits:
                if limits[limit_type]["percentage"] >= 100:
                    return True, {
                        "limit_type": limit_type,
                        "used": limits[limit_type]["used"],
                        "limit": limits[limit_type]["limit"],
                        "percentage": limits[limit_type]["percentage"]
                    }
            
            # No limits exceeded
            return False, limits
        finally:
            db.close()
    
    def _get_limit_type_for_path(self, path: str) -> Optional[str]:
        """Get the limit type associated with a specific endpoint path."""
        for endpoint_pattern, limit_type in ENDPOINT_LIMIT_MAPPING.items():
            if path.startswith(endpoint_pattern):
                return limit_type
        return None
    
    def _create_limit_exceeded_response(self, limit_info: Dict[str, Any]) -> Response:
        """Create a response for when limits are exceeded."""
        limit_type = limit_info["limit_type"]
        percentage = limit_info["percentage"]
        
        # Friendly messages based on limit type
        messages = {
            "messages": "You've reached your monthly message limit. Please upgrade your plan to continue using the chatbot.",
            "users": "You've reached your monthly active users limit. Please upgrade your plan to add more users.",
            "storage": "You've reached your storage limit. Please upgrade your plan to add more storage space.",
            "collections": "You've reached your knowledge collections limit. Please upgrade your plan to create more collections."
        }
        
        # Upgrade suggestions
        suggestion = "Visit the subscription page to upgrade your plan."
        
        response_body = {
            "error": "subscription_limit_exceeded",
            "message": messages.get(limit_type, f"You've reached your {limit_type} limit."),
            "limit_type": limit_type,
            "usage_percentage": percentage,
            "suggestion": suggestion,
            "upgrade_url": "/dashboard/subscription/upgrade"
        }
        
        return Response(
            content=json.dumps(response_body),
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            media_type="application/json"
        )
    
    async def _check_and_notify_approaching_limits(self, client_id: str, limits_info: Dict[str, Any]) -> None:
        """Check if client is approaching limits and send notifications if needed."""
        current_time = time.time()
        
        # Initialize notification cache for this client if not exists
        if client_id not in self.notification_cache:
            self.notification_cache[client_id] = {}
        
        # Check each limit type
        for limit_type, limit_data in limits_info.items():
            percentage = limit_data.get("percentage", 0)
            
            # Skip if usage is low
            if percentage < self.notification_thresholds[0]:
                continue
            
            # Initialize notification cache for this limit type if not exists
            if limit_type not in self.notification_cache[client_id]:
                self.notification_cache[client_id][limit_type] = {}
            
            # Find the highest threshold that has been reached
            reached_threshold = None
            for threshold in sorted(self.notification_thresholds, reverse=True):
                if percentage >= threshold:
                    reached_threshold = threshold
                    break
            
            if reached_threshold is None:
                continue
            
            # Check if we've recently sent a notification for this threshold
            last_notification_time = self.notification_cache[client_id][limit_type].get(reached_threshold, 0)
            notification_age = current_time - last_notification_time
            
            # Only send notification if it's been at least 24 hours since the last one
            if notification_age > 86400:  # 24 hours in seconds
                # Send notification
                await self._send_limit_notification(
                    client_id=client_id,
                    limit_type=limit_type,
                    percentage=percentage,
                    threshold=reached_threshold,
                    limit_data=limit_data
                )
                
                # Update notification cache
                self.notification_cache[client_id][limit_type][reached_threshold] = current_time
    
    async def _send_limit_notification(
        self,
        client_id: str,
        limit_type: str,
        percentage: float,
        threshold: int,
        limit_data: Dict[str, Any]
    ) -> None:
        """Send a notification about approaching limits."""
        try:
            # Format message based on limit type
            limit_name = {
                "messages": "message",
                "users": "active user",
                "storage": "storage",
                "collections": "knowledge collection"
            }.get(limit_type, limit_type)
            
            used = limit_data.get("used", 0)
            limit = limit_data.get("limit", 0)
            
            title = f"Approaching {limit_name} limit - {threshold}% used"
            message = (
                f"You've used {percentage:.1f}% of your monthly {limit_name} limit "
                f"({used} of {limit}). "
                f"To ensure uninterrupted service, consider upgrading your subscription plan."
            )
            
            # Send both in-app and email notifications
            db = SessionLocal()
            try:
                await self.notification_service.send_notification(
                    db=db,
                    client_id=client_id,
                    title=title,
                    message=message,
                    notification_type="limit_warning",
                    metadata={
                        "limit_type": limit_type,
                        "percentage": percentage,
                        "threshold": threshold,
                        "used": used,
                        "limit": limit
                    },
                    send_email=True
                )
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"Error sending limit notification for {client_id}: {str(e)}")
    
    def _should_update_usage_after(self, path: str, status_code: int) -> bool:
        """Check if usage should be updated after this request."""
        # Only update for successful requests
        if status_code >= 400:
            return False
        
        # Update for storage-affecting endpoints
        if path.startswith("/api/knowledge/documents/upload"):
            return True
        
        return False
    
    async def _update_usage_after_request(self, client_id: str, request: Request, response: Response) -> None:
        """Update usage metrics after request completion."""
        try:
            db = SessionLocal()
            
            # For document uploads, update storage usage
            if request.url.path.startswith("/api/knowledge/documents/upload"):
                # Get response content to determine file size
                response_body = {}
                try:
                    response_body = json.loads(response.body.decode('utf-8'))
                except Exception:
                    pass
                
                # If response includes file size, update storage usage
                if isinstance(response_body, dict) and "file_size" in response_body:
                    file_size = response_body["file_size"]
                    self.usage_tracker.update_storage_usage(
                        db, 
                        client_id, 
                        additional_bytes=file_size
                    )
            
            # Invalidate cache for this client
            if client_id in self.limit_check_cache:
                del self.limit_check_cache[client_id]
                
        except Exception as e:
            logger.error(f"Error updating usage after request for {client_id}: {str(e)}")
        finally:
            db.close()