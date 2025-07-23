# backend/app/core/middleware/telephony_middleware.py
"""
Telephony Middleware - Track call usage and enforce subscription limits.
Follows the same pattern as AnalyticsMiddleware in your codebase.
"""

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import time
import json

from app.core.database.session import get_db_session
from app.repositories.telephony_repository import CallRepository, PhoneNumberRepository
from app.repositories.client_repository import ClientRepository
from app.core import logger
from app.core.config import get_settings

settings = get_settings()


class TelephonyMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track telephony usage and enforce subscription limits.
    
    Features:
    - Track call minutes for subscription billing
    - Enforce phone number limits per plan
    - Monitor concurrent call limits
    - Log telephony API usage
    - Rate limiting for voice processing endpoints
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.call_repo = CallRepository()
        self.phone_repo = PhoneNumberRepository()
        self.client_repo = ClientRepository()
    
    async def dispatch(self, request: Request, call_next):
        """Process telephony requests with usage tracking and limits."""
        
        # Only process telephony-related requests
        if not self._is_telephony_request(request):
            return await call_next(request)
        
        start_time = time.time()
        client_id = self._extract_client_id(request)
        
        try:
            # Pre-request validation
            if client_id:
                await self._validate_client_limits(request, client_id)
            
            # Process request
            response = await call_next(request)
            
            # Post-request tracking
            if client_id and response.status_code < 400:
                await self._track_usage(request, response, client_id, start_time)
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Telephony middleware error: {str(e)}")
            return await call_next(request)
    
    def _is_telephony_request(self, request: Request) -> bool:
        """Check if request is telephony-related."""
        telephony_paths = [
            "/api/telephony/",
            "/api/telephony/webhooks/",
        ]
        return any(request.url.path.startswith(path) for path in telephony_paths)
    
    def _extract_client_id(self, request: Request) -> Optional[str]:
        """Extract client_id from request context or auth."""
        # Check if client_id is already in request state (set by ClientContextMiddleware)
        if hasattr(request.state, 'client_id'):
            return request.state.client_id
        
        # For webhook requests, extract from call data
        if "/webhooks/" in request.url.path:
            return None  # Webhooks will be handled differently
        
        # Try to extract from headers or auth
        api_key = request.headers.get("X-API-Key") or request.headers.get("Authorization")
        if api_key:
            try:
                with get_db_session() as db:
                    client = self.client_repo.get_by_api_key(db, api_key.replace("Bearer ", ""))
                    return client.client_id if client else None
            except Exception:
                return None
        
        return None
    
    async def _validate_client_limits(self, request: Request, client_id: str):
        """Validate client subscription limits before processing request."""
        try:
            with get_db_session() as db:
                # Get client subscription info
                client = self.client_repo.get_by_client_id(db, client_id)
                if not client:
                    raise HTTPException(status_code=404, detail="Client not found")
                
                # Check phone number limits for provisioning requests
                if request.method == "POST" and "phone-numbers/provision" in request.url.path:
                    await self._check_phone_number_limits(db, client_id, client.subscription_plan)
                
                # Check call minute limits for voice processing
                if "voice" in request.url.path or "process" in request.url.path:
                    await self._check_call_minute_limits(db, client_id, client.subscription_plan)
                
                # Check concurrent call limits
                if request.method == "POST" and "/calls/" in request.url.path:
                    await self._check_concurrent_call_limits(db, client_id, client.subscription_plan)
                    
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Client limit validation failed: {str(e)}")
            # Don't block request on validation errors, just log
    
    async def _check_phone_number_limits(self, db: Session, client_id: str, plan: str):
        """Check if client can provision more phone numbers."""
        current_count = self.phone_repo.count_by_client_id(db, client_id)
        
        # Define limits per plan (adjust based on your subscription plans)
        limits = {
            "free": 1,
            "basic": 3,
            "pro": 10,
            "enterprise": 50
        }
        
        limit = limits.get(plan, 1)  # Default to free tier
        
        if current_count >= limit:
            logger.warning(f"Client {client_id} hit phone number limit: {current_count}/{limit}")
            raise HTTPException(
                status_code=403,
                detail=f"Phone number limit reached. Your {plan} plan allows {limit} numbers."
            )
    
    async def _check_call_minute_limits(self, db: Session, client_id: str, plan: str):
        """Check if client has exceeded monthly call minute limits."""
        monthly_minutes = self.call_repo.get_monthly_usage(db, client_id)
        
        # Define limits per plan (in minutes)
        limits = {
            "free": 100,      # 100 minutes
            "basic": 500,     # 500 minutes  
            "pro": 2000,      # 2000 minutes
            "enterprise": -1  # Unlimited
        }
        
        limit = limits.get(plan, 100)
        
        if limit > 0 and monthly_minutes >= limit:
            logger.warning(f"Client {client_id} hit call minute limit: {monthly_minutes}/{limit}")
            raise HTTPException(
                status_code=403,
                detail=f"Monthly call minute limit reached. Your {plan} plan allows {limit} minutes."
            )
    
    async def _check_concurrent_call_limits(self, db: Session, client_id: str, plan: str):
        """Check concurrent call limits."""
        active_calls = self.call_repo.get_active_calls_by_client_id(db, client_id)
        current_count = len(active_calls)
        
        # Define concurrent call limits per plan
        limits = {
            "free": 1,        # 1 concurrent call
            "basic": 3,       # 3 concurrent calls
            "pro": 10,        # 10 concurrent calls
            "enterprise": 50  # 50 concurrent calls
        }
        
        limit = limits.get(plan, 1)
        
        if current_count >= limit:
            logger.warning(f"Client {client_id} hit concurrent call limit: {current_count}/{limit}")
            raise HTTPException(
                status_code=403,
                detail=f"Concurrent call limit reached. Your {plan} plan allows {limit} simultaneous calls."
            )
    
    async def _track_usage(self, request: Request, response: Response, client_id: str, start_time: float):
        """Track telephony usage for analytics and billing."""
        try:
            processing_time = time.time() - start_time
            
            # Create usage record
            usage_data = {
                "client_id": client_id,
                "endpoint": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "processing_time_ms": round(processing_time * 1000, 2),
                "user_agent": request.headers.get("user-agent", ""),
                "ip_address": self._get_client_ip(request)
            }
            
            # Add specific tracking for different endpoint types
            if "phone-numbers" in request.url.path:
                usage_data["operation_type"] = "phone_management"
            elif "calls" in request.url.path:
                usage_data["operation_type"] = "call_management"
            elif "voice" in request.url.path or "process" in request.url.path:
                usage_data["operation_type"] = "voice_processing"
            elif "analytics" in request.url.path:
                usage_data["operation_type"] = "analytics"
            
            # Log the usage (you might want to store this in a separate analytics table)
            logger.info(
                f"📞 Telephony Usage: {client_id} | {request.method} {request.url.path} | "
                f"{response.status_code} | {processing_time*1000:.1f}ms"
            )
            
            # Store in analytics table if you have one
            # self.analytics_repo.create_usage_record(db, usage_data)
            
        except Exception as e:
            logger.error(f"Usage tracking failed: {str(e)}")
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"


class TelephonyRateLimiter:
    """
    Rate limiter specifically for voice processing endpoints.
    Prevents abuse of expensive voice operations.
    """
    
    def __init__(self):
        self.request_counts = {}  # client_id -> {timestamp: count}
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
    
    def is_rate_limited(self, client_id: str, operation: str) -> bool:
        """Check if client is rate limited for specific operation."""
        self._cleanup_old_entries()
        
        current_time = time.time()
        window_start = current_time - 60  # 1-minute window
        
        key = f"{client_id}:{operation}"
        if key not in self.request_counts:
            self.request_counts[key] = []
        
        # Count requests in current window
        recent_requests = [
            timestamp for timestamp in self.request_counts[key]
            if timestamp > window_start
        ]
        
        # Define rate limits per operation
        limits = {
            "voice_processing": 30,  # 30 requests per minute
            "call_initiation": 10,   # 10 calls per minute
            "phone_provisioning": 5  # 5 provisions per minute
        }
        
        limit = limits.get(operation, 20)  # Default limit
        
        if len(recent_requests) >= limit:
            logger.warning(f"Rate limit exceeded for {client_id}:{operation} - {len(recent_requests)}/{limit}")
            return True
        
        # Record this request
        self.request_counts[key].append(current_time)
        return False
    
    def _cleanup_old_entries(self):
        """Remove old request timestamps to prevent memory bloat."""
        if time.time() - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff_time = time.time() - 300  # Keep last 5 minutes
        
        for key in list(self.request_counts.keys()):
            self.request_counts[key] = [
                timestamp for timestamp in self.request_counts[key]
                if timestamp > cutoff_time
            ]
            
            # Remove empty entries
            if not self.request_counts[key]:
                del self.request_counts[key]
        
        self.last_cleanup = time.time()


# Global rate limiter instance
rate_limiter = TelephonyRateLimiter()


async def check_rate_limit(request: Request):
    """Dependency to check rate limits on specific endpoints."""
    client_id = getattr(request.state, 'client_id', None)
    if not client_id:
        return
    
    # Determine operation type
    operation = "voice_processing"
    if "phone-numbers/provision" in request.url.path:
        operation = "phone_provisioning"
    elif "/calls/" in request.url.path and request.method == "POST":
        operation = "call_initiation"
    
    if rate_limiter.is_rate_limited(client_id, operation):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for {operation}. Please try again later."
        )