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
    "/api/knowledge/documents/upload": "storage",  # This should catch the upload
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
        # Skip if not authenticated
        if not hasattr(request.state, 'client_id'):
            return await call_next(request)
        
        client_id = request.state.client_id
        path = request.url.path
        
        # Skip exempt paths
        if self._is_exempt_path(path):
            return await call_next(request)
        
        # Check if this endpoint needs quota validation
        if quota_config := ENDPOINT_LIMIT_MAPPING.get(path):
            quota_type, amount = quota_config
            
            # For file uploads, get actual file size
            if quota_type == "storage" and path.startswith("/api/knowledge/documents/upload"):
                # Let the upload endpoint handle storage validation directly
                # since it needs to read the file content anyway
                pass
            else:
                # Check other quota types
                limits_exceeded, limit_info = self._check_limits_cache(client_id, path)
                
                if limits_exceeded:
                    return self._create_limit_exceeded_response(limit_info)
        
        # Process request
        response = await call_next(request)
        
        # Increment usage counters for successful requests
        if response.status_code < 400:
            # Don't increment storage here - it's handled in the upload endpoint
            if path.startswith("/api/chatbot/message"):
                # Increment message count
                db = SessionLocal()
                try:
                    usage_tracker = UsageTracker()
                    usage_tracker._increment_message_count(db, client_id)
                except Exception as e:
                    logger.error(f"Error incrementing message count: {str(e)}")
                finally:
                    db.close()
        
        return response    
    def _should_bypass_check(self, path: str) -> bool:
        """Check if path should bypass limit checking."""
        return any(path.startswith(exempt_path) for exempt_path in EXEMPT_PATHS)
    
    def _check_limits_cache(self, client_id: str, path: str) -> tuple:
        """
        Check if client has exceeded limits BEFORE allowing action.
        
        Returns:
            tuple: (limits_exceeded, limit_info)
        """
        current_time = time.time()
        
        # Get fresh limits data
        db = SessionLocal()
        try:
            # Get subscription info for limits
            from app.repositories.client_repository import SubscriptionRepository
            from app.services.subscription.stripe_service import PLAN_LIMITS
            
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client_id)
            
            # Default limits (free plan)
            plan_type = subscription.plan_type if subscription else "free"
            plan_limits = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])
            
            message_limit = plan_limits["message_limit"]
            user_limit = plan_limits["user_limit"]
            storage_limit_bytes = int(plan_limits["storage_limit_mb"] * 1024 * 1024)
            
            # Calculate current usage
            current_month = datetime.utcnow().strftime("%Y-%m")
            current_month_start = f"{current_month}-01"
            
            # Get messages from subscription usage
            from app.repositories.analytics_repository import SubscriptionUsageRepository
            usage_repo = SubscriptionUsageRepository()
            usage = usage_repo.get_by_month(db, client_id, current_month)
            total_messages = usage.messages_used if usage else 0
            
            # Get active users from chat sessions
            from app.domain.chat.entities import ChatSession
            from sqlalchemy import func, distinct
            total_users = db.query(func.count(distinct(ChatSession.user_id)))\
                .filter(
                    ChatSession.client_id == client_id,
                    ChatSession.created_at >= current_month_start,
                    ChatSession.user_id.isnot(None)
                ).scalar() or 0
            
            # Get TOTAL storage (documents + knowledge + crawled)
            # Force update storage calculation first
            usage_tracker = UsageTracker()
            usage_tracker._update_storage_usage(db, client_id)
            
            # Get updated storage
            from app.repositories.analytics_repository import StorageUsageRepository
            storage_repo = StorageUsageRepository()
            storage_record = storage_repo.get_latest(db, client_id)
            storage_bytes = storage_record.total_bytes if storage_record else 0
            
            # Calculate percentages
            message_percentage = (total_messages / message_limit * 100) if message_limit > 0 else 0
            user_percentage = (total_users / user_limit * 100) if user_limit > 0 else 0
            storage_percentage = (storage_bytes / storage_limit_bytes * 100) if storage_limit_bytes > 0 else 0
            
            # Create limits info
            limits = {
                "messages": {
                    "used": total_messages,
                    "limit": message_limit,
                    "percentage": message_percentage,
                    "exceeded": message_percentage >= 100
                },
                "users": {
                    "used": total_users,
                    "limit": user_limit,
                    "percentage": user_percentage,
                    "exceeded": user_percentage >= 100
                },
                "storage": {
                    "used": storage_bytes,
                    "limit": storage_limit_bytes,
                    "percentage": storage_percentage,
                    "exceeded": storage_percentage >= 100
                }
            }
            
            # Update cache
            self.limit_check_cache[client_id] = {
                "cache_time": current_time,
                "limits": limits
            }
            
            # Check if any limits exceeded
            messages_exceeded = limits["messages"]["exceeded"]
            users_exceeded = limits["users"]["exceeded"]
            storage_exceeded = limits["storage"]["exceeded"]
            
            if messages_exceeded:
                return True, {
                    "limit_type": "messages",
                    "used": limits["messages"]["used"],
                    "limit": limits["messages"]["limit"],
                    "percentage": limits["messages"]["percentage"]
                }
            
            if users_exceeded:
                return True, {
                    "limit_type": "users",
                    "used": limits["users"]["used"],
                    "limit": limits["users"]["limit"],
                    "percentage": limits["users"]["percentage"]
                }
            
            if storage_exceeded:
                return True, {
                    "limit_type": "storage",
                    "used": limits["storage"]["used"],
                    "limit": limits["storage"]["limit"],
                    "percentage": limits["storage"]["percentage"]
                }
            
            # For specific endpoints, check the relevant limit type for PRE-VALIDATION
            limit_type = self._get_limit_type_for_path(path)
            if limit_type and limit_type in limits:
                # For storage uploads, check if upload would exceed limit
                if limit_type == "storage" and path.startswith("/api/knowledge/documents/upload"):
                    # This will be checked again in the upload handler with actual file size
                    pass
                elif limits[limit_type]["exceeded"]:
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
async def _get_file_size_from_request(self, request: Request) -> int:
    """Extract file size from upload request"""
    try:
        # For multipart form data (file uploads)
        if request.headers.get("content-type", "").startswith("multipart/form-data"):
            # Read the content length from headers
            content_length = request.headers.get("content-length")
            if content_length:
                return int(content_length)
        return 0
    except Exception as e:
        logger.error(f"Error getting file size from request: {str(e)}")
        return 0                