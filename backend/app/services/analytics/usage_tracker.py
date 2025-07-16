# backend/app/services/analytics/usage_tracker.py

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.repositories.analytics_repository import (
    ApiUsageLogRepository, ChatMetricsRepository,
    KnowledgeMetricsRepository, SubscriptionUsageRepository,
    DailyStatsRepository, StorageUsageRepository
)
from app.domain.analytics.entities import (
    ApiUsageLog, ChatMetrics, KnowledgeMetrics,
    SubscriptionUsage, DailyStats, StorageUsage
)

logger = logging.getLogger(__name__)

class UsageTracker:
    """Service for tracking usage metrics including storage and message counting."""
    
    def __init__(self):
        self.api_log_repo = ApiUsageLogRepository()
        self.chat_metrics_repo = ChatMetricsRepository()
        self.knowledge_metrics_repo = KnowledgeMetricsRepository()
        self.subscription_usage_repo = SubscriptionUsageRepository()
        self.daily_stats_repo = DailyStatsRepository()
        self.storage_repo = StorageUsageRepository()

    def initialize_subscription_usage(self, db: Session, client_id: str) -> None:
        """Initialize subscription usage tracking for a client."""
        try:
            # Get current month
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # Check if usage record exists for current month
            existing_usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if not existing_usage:
                # Create new usage record
                self.subscription_usage_repo.create(db, obj_in={
                    "client_id": client_id,
                    "month": current_month,
                    "messages_used": 0,
                    "users_active": 0,
                    "storage_used_bytes": 0,
                    "last_updated": datetime.utcnow()
                })
                logger.info(f"Initialized subscription usage for client {client_id}")
        except Exception as e:
            logger.exception(f"Error initializing subscription usage: {str(e)}")

    def _increment_message_count(self, db: Session, client_id: str) -> bool:
        """
        Increment message count for subscription usage.
        Returns True if successful, False otherwise.
        """
        try:
            # Get current month
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # Get or create subscription usage record
            usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if not usage:
                # Initialize if doesn't exist
                self.initialize_subscription_usage(db, client_id)
                usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if usage:
                # Increment message count
                current_count = usage.messages_used or 0
                updated_usage = self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                    "messages_used": current_count + 1,
                    "last_updated": datetime.utcnow()
                })
                logger.info(f"Message count incremented: {current_count} -> {current_count + 1} for client {client_id}")
                return True
            else:
                logger.error(f"Could not find or create subscription usage for client {client_id}")
                return False
                
        except Exception as e:
            logger.exception(f"Error incrementing message count for {client_id}: {str(e)}")
            return False

    def check_message_limits(self, db: Session, client_id: str) -> Dict[str, Any]:
        """
        Check if client is within message limits.
        Returns status and limit information.
        """
        try:
            # Get current month usage
            current_month = datetime.utcnow().strftime("%Y-%m")
            usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if not usage:
                # Initialize if doesn't exist
                self.initialize_subscription_usage(db, client_id)
                usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            # Get subscription to determine limits
            from app.repositories.client_repository import SubscriptionRepository
            from app.services.subscription.stripe_service import PLAN_LIMITS
            
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client_id)
            
            # Get message limit from plan
            plan_type = subscription.plan_type if subscription else "free"
            plan_limits = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])
            message_limit = subscription.message_limit if subscription and subscription.message_limit else plan_limits["message_limit"]
            
            messages_used = usage.messages_used if usage else 0
            within_limits = messages_used < message_limit
            
            return {
                "within_limits": within_limits,
                "messages_used": messages_used,
                "message_limit": message_limit,
                "percentage": min(100, (messages_used / message_limit) * 100) if message_limit > 0 else 0,
                "remaining": max(0, message_limit - messages_used),
                "plan_type": plan_type
            }
            
        except Exception as e:
            logger.exception(f"Error checking message limits for {client_id}: {str(e)}")
            # Default to allowing if error (fail open)
            return {
                "within_limits": True,
                "messages_used": 0,
                "message_limit": 1000,
                "percentage": 0,
                "remaining": 1000,
                "plan_type": "free"
            }

    def track_api_request(
        self,
        db: Session,
        client_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Track API request for analytics."""
        try:
            self.api_log_repo.create(db, obj_in={
                "client_id": client_id,
                "endpoint": endpoint,
                "method": method,
                "status_code": status_code,
                "response_time_ms": response_time_ms,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            logger.exception(f"Error tracking API request: {str(e)}")

    def _update_storage_usage(self, db: Session, client_id: str) -> None:
        """Update storage usage calculations - keeping existing working implementation."""
        try:
            # Calculate total storage from all sources
            from app.domain.knowledge.entities import KnowledgeItem, DocumentSource, KnowledgeCollection
            from app.domain.client.entities import CrawledContent
            from sqlalchemy import func
            
            # Get document storage - FIXED: correct field name and entity
            document_bytes = db.query(func.coalesce(func.sum(DocumentSource.file_size), 0))\
                .filter(DocumentSource.client_id == client_id)\
                .scalar() or 0
            
            # Get knowledge base storage - FIXED: proper join through collection
            kb_items = db.query(func.count(KnowledgeItem.id))\
                .join(KnowledgeCollection, KnowledgeItem.collection_id == KnowledgeCollection.collection_id)\
                .filter(KnowledgeCollection.client_id == client_id)\
                .scalar() or 0
            
            # Estimate embedding storage (1536 dimensions * 4 bytes per float)
            kb_bytes = kb_items * 1536 * 4
            
            # Get crawled content storage - this should be correct already
            crawled_bytes = db.query(func.coalesce(func.sum(func.length(CrawledContent.content)), 0))\
                .filter(CrawledContent.client_id == client_id)\
                .scalar() or 0
            
            # Calculate total
            total_storage_bytes = document_bytes + kb_bytes + crawled_bytes
            
            # Update or create storage usage record
            storage_usage = self.storage_repo.get_latest(db, client_id)
            
            if not storage_usage:
                self.storage_repo.create(db, obj_in={
                    "client_id": client_id,
                    "total_bytes": total_storage_bytes,
                    "document_bytes": document_bytes,
                    "knowledge_bytes": kb_bytes,
                    "crawled_content_bytes": crawled_bytes,
                    "recorded_at": datetime.utcnow()
                })
            else:
                self.storage_repo.update(db, db_obj=storage_usage, obj_in={
                    "total_bytes": total_storage_bytes,
                    "document_bytes": document_bytes,
                    "knowledge_bytes": kb_bytes,
                    "crawled_content_bytes": crawled_bytes,
                    "recorded_at": datetime.utcnow()
                })
            
            # Update subscription usage storage metrics
            current_month = datetime.utcnow().strftime("%Y-%m")
            usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if usage:
                self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                    "storage_used_bytes": total_storage_bytes,
                    "last_updated": datetime.utcnow()
                })
            
        except Exception as e:
            logger.exception(f"Error updating storage usage: {str(e)}")

    def check_subscription_limits(self, db: Session, client_id: str) -> Dict[str, Any]:
        """Check if client is within subscription limits for all resources."""
        try:
            # Get current subscription
            from app.repositories.client_repository import SubscriptionRepository
            from app.services.subscription.stripe_service import PLAN_LIMITS
            
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client_id)
            
            # Get plan limits
            plan_type = subscription.plan_type if subscription else "free"
            plan_limits = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])
            
            message_limit = subscription.message_limit if subscription and subscription.message_limit else plan_limits["message_limit"]
            user_limit = subscription.user_limit if subscription and subscription.user_limit else plan_limits["user_limit"]
            storage_limit = subscription.storage_limit_bytes if subscription and subscription.storage_limit_bytes else plan_limits["storage_limit_mb"] * 1024 * 1024
            
            # Get current usage
            current_month = datetime.utcnow().strftime("%Y-%m")
            usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if not usage:
                # Initialize usage tracking
                self.initialize_subscription_usage(db, client_id)
                usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            # Calculate current values
            messages_used = usage.messages_used if usage else 0
            users_active = usage.users_active if usage else 0
            storage_used = usage.storage_used_bytes if usage else 0
            
            # Check limits
            message_within_limits = messages_used < message_limit
            user_within_limits = users_active < user_limit
            storage_within_limits = storage_used < storage_limit
            
            # Overall status
            within_limits = message_within_limits and user_within_limits and storage_within_limits
            
            return {
                "within_limits": within_limits,
                "limits": {
                    "messages": {
                        "used": messages_used,
                        "limit": message_limit,
                        "percentage": min(100, (messages_used / message_limit) * 100) if message_limit > 0 else 0,
                        "exceeded": not message_within_limits
                    },
                    "users": {
                        "used": users_active,
                        "limit": user_limit,
                        "percentage": min(100, (users_active / user_limit) * 100) if user_limit > 0 else 0,
                        "exceeded": not user_within_limits
                    },
                    "storage": {
                        "used_bytes": storage_used,
                        "limit_bytes": storage_limit,
                        "percentage": min(100, (storage_used / storage_limit) * 100) if storage_limit > 0 else 0,
                        "exceeded": not storage_within_limits
                    }
                }
            }
            
        except Exception as e:
            logger.exception(f"Error checking subscription limits: {str(e)}")
            return {
                "within_limits": True,
                "limits": {
                    "messages": {"used": 0, "limit": 1000, "percentage": 0, "exceeded": False},
                    "users": {"used": 0, "limit": 10, "percentage": 0, "exceeded": False},
                    "storage": {"used_bytes": 0, "limit_bytes": 1024*1024, "percentage": 0, "exceeded": False}
                }
            }
            
    def sync_message_counts_from_database(self, db: Session, client_id: str) -> int:
        """Sync message counts from actual database messages."""
        try:
            from app.domain.chat.entities import ChatSession, ChatMessage
            from sqlalchemy import func
            from datetime import datetime
            
            current_month = datetime.utcnow().strftime("%Y-%m")
            month_start = f"{current_month}-01"
            
            # Count actual assistant messages
            actual_count = db.query(func.count(ChatMessage.id))\
                .join(ChatSession, ChatSession.session_id == ChatMessage.session_id)\
                .filter(
                    ChatSession.client_id == client_id,
                    ChatMessage.role == 'assistant',
                    ChatMessage.created_at >= month_start
                )\
                .scalar() or 0
            
            return actual_count
            
        except Exception as e:
            logger.exception(f"Error syncing message counts: {str(e)}")
            return 0