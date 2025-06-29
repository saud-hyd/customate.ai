import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.domain.analytics.entities import (
    StorageUsage, SubscriptionUsage, ChatMetrics, KnowledgeMetrics, DailyStats
)
from app.repositories.analytics_repository import (
    StorageUsageRepository, SubscriptionUsageRepository, 
    ChatMetricsRepository, KnowledgeMetricsRepository,
    DailyStatsRepository
)
from app.repositories.knowledge_repository import DocumentSourceRepository, KnowledgeItemRepository
from app.domain.knowledge.entities import KnowledgeItem

logger = logging.getLogger(__name__)

class UsageTracker:
    """Service for tracking resource usage and subscription limits."""
    
    def __init__(self):
        self.storage_repo = StorageUsageRepository()
        self.subscription_usage_repo = SubscriptionUsageRepository()
        self.chat_metrics_repo = ChatMetricsRepository()
        self.knowledge_metrics_repo = KnowledgeMetricsRepository()
        self.daily_stats_repo = DailyStatsRepository()
            
    def initialize_client_analytics(self, db: Session, client_id: str) -> None:
        """Initialize analytics records for a new client."""
        try:
            # Create initial daily stats
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Check if stats already exist for today
            existing_stats = self.daily_stats_repo.get_by_date(
                db, client_id, today
            )
            
            if not existing_stats:
                # Create new stats
                self.daily_stats_repo.create(db, obj_in={
                    "client_id": client_id,
                    "date": today,
                    "total_sessions": 0,
                    "total_messages": 0,
                    "total_searches": 0,
                    "total_users": 0,
                    "average_response_time_ms": 0,
                    "knowledge_usage_ratio": 0
                })
            
            # Initialize storage usage
            existing_storage = self.storage_repo.get_latest(db, client_id)
            
            if not existing_storage:
                self.storage_repo.create(db, obj_in={
                    "client_id": client_id,
                    "total_bytes": 0,
                    "document_bytes": 0,
                    "knowledge_bytes": 0,
                    "crawled_content_bytes": 0,  # Added for tracking crawled content
                    "recorded_at": datetime.utcnow()
                })
            
            # Initialize subscription usage
            self.initialize_subscription_usage(db, client_id)
            
        except Exception as e:
            logger.exception(f"Error initializing client analytics: {str(e)}")
            # Continue without failing - analytics are non-critical
    
    def initialize_subscription_usage(self, db: Session, client_id: str) -> None:
        """Initialize subscription usage tracking."""
        try:
            # Get current month
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # Check if usage record exists for current month
            existing_usage = self.subscription_usage_repo.get_by_month(
                db, client_id, current_month
            )
            
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
        except Exception as e:
            logger.exception(f"Error initializing subscription usage: {str(e)}")
    
    def track_chat_message(
        self, 
        db: Session,
        client_id: str,
        session_id: str,
        message_content: str,
        is_user_message: bool,
        response_time_ms: Optional[int] = None,
        user_id: Optional[str] = None,
        knowledge_used: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Track a chat message for analytics."""
        try:
            # Get today's date
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Get/create metrics for today
            chat_metrics = self.chat_metrics_repo.get_by_date(db, client_id, today)
            
            if not chat_metrics:
                # Create new record
                chat_metrics = self.chat_metrics_repo.create(db, obj_in={
                    "client_id": client_id,
                    "date": today,
                    "total_messages": 0,
                    "total_user_messages": 0,
                    "total_assistant_messages": 0,
                    "total_sessions": 0,
                    "average_response_time_ms": 0,
                    "knowledge_usage_count": 0,
                    "stats_metadata": {}
                })
            
            # Update metrics
            metrics_data = {}
            
            # Increment message count
            metrics_data["total_messages"] = chat_metrics.total_messages + 1
            
            # Update user/assistant message count
            if is_user_message:
                metrics_data["total_user_messages"] = chat_metrics.total_user_messages + 1
            else:
                # This is an assistant message
                metrics_data["total_assistant_messages"] = chat_metrics.total_assistant_messages + 1
                
                # Only increment subscription usage for assistant messages
                self._increment_message_count(db, client_id)
                
                # Track response time
                if response_time_ms:
                    # Calculate new average
                    current_avg = chat_metrics.average_response_time_ms or 0
                    current_count = chat_metrics.total_assistant_messages or 0
                    
                    if current_count > 0:
                        new_avg = ((current_avg * current_count) + response_time_ms) / (current_count + 1)
                        metrics_data["average_response_time_ms"] = new_avg
                    else:
                        metrics_data["average_response_time_ms"] = response_time_ms
                
                # Track knowledge usage
                if knowledge_used:
                    metrics_data["knowledge_usage_count"] = chat_metrics.knowledge_usage_count + 1
            
            # Update stats metadata
            new_metadata = chat_metrics.stats_metadata or {}
            
            # Add/update metadata with token counts, etc.
            if metadata:
                new_metadata.update(metadata)
            
            metrics_data["stats_metadata"] = new_metadata
            
            # Update metrics
            self.chat_metrics_repo.update(db, db_obj=chat_metrics, obj_in=metrics_data)
            
            # Update daily stats
            self._update_daily_stats(db, client_id)
                
        except Exception as e:
            logger.exception(f"Error tracking chat message: {str(e)}")
                
    def track_knowledge_search(
        self, 
        db: Session,
        client_id: str,
        query: str,
        results_count: int,
        search_type: str = "hybrid",
        response_time_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Track a knowledge base search for analytics."""
        try:
            # Get today's date
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Get/create metrics for today
            knowledge_metrics = self.knowledge_metrics_repo.get_by_date(db, client_id, today)
            
            if not knowledge_metrics:
                # Create new record
                knowledge_metrics = self.knowledge_metrics_repo.create(db, obj_in={
                    "client_id": client_id,
                    "date": today,
                    "search_count": 0,
                    "average_results": 0,
                    "zero_results_count": 0,
                    "average_response_time_ms": 0,
                    "stats_metadata": {}
                })
            
            # Update metrics
            metrics_data = {}
            
            # Increment search count
            metrics_data["search_count"] = knowledge_metrics.search_count + 1
            
            # Update average results
            current_avg = knowledge_metrics.average_results or 0
            current_count = knowledge_metrics.search_count or 0
            
            if current_count > 0:
                new_avg = ((current_avg * current_count) + results_count) / (current_count + 1)
                metrics_data["average_results"] = new_avg
            else:
                metrics_data["average_results"] = results_count
            
            # Track zero results
            if results_count == 0:
                metrics_data["zero_results_count"] = knowledge_metrics.zero_results_count + 1
            
            # Track response time
            if response_time_ms:
                current_avg = knowledge_metrics.average_response_time_ms or 0
                
                if current_count > 0:
                    new_avg = ((current_avg * current_count) + response_time_ms) / (current_count + 1)
                    metrics_data["average_response_time_ms"] = new_avg
                else:
                    metrics_data["average_response_time_ms"] = response_time_ms
            
            # Update stats metadata
            new_metadata = knowledge_metrics.stats_metadata or {}
            
            # Track search types
            search_types = new_metadata.get("search_types", {})
            search_types[search_type] = search_types.get(search_type, 0) + 1
            new_metadata["search_types"] = search_types
            
            # Add extra metadata
            if metadata:
                new_metadata.update(metadata)
            
            metrics_data["stats_metadata"] = new_metadata
            
            # Update metrics
            self.knowledge_metrics_repo.update(db, db_obj=knowledge_metrics, obj_in=metrics_data)
            
            # Update daily stats
            self._update_daily_stats(db, client_id)
                
        except Exception as e:
            logger.exception(f"Error tracking knowledge search: {str(e)}")
    
    def track_api_request(
        self, 
        db: Session,
        client_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int
    ) -> None:
        """Track an API request for analytics."""
        try:
            # Implementation for API request tracking
            # This would be updated in a more complete implementation
            pass
                
        except Exception as e:
            logger.exception(f"Error tracking API request: {str(e)}")
    
    def update_knowledge_counts(self, db: Session, client_id: str) -> None:
        """Update knowledge item and collection counts."""
        try:
            # Get daily stats
            today = datetime.utcnow().strftime("%Y-%m-%d")
            daily_stats = self.daily_stats_repo.get_by_date(db, client_id, today)
            
            if not daily_stats:
                # Create new record
                daily_stats = self.daily_stats_repo.create(db, obj_in={
                    "client_id": client_id,
                    "date": today,
                    "total_sessions": 0,
                    "total_messages": 0,
                    "total_searches": 0,
                    "total_users": 0,
                    "average_response_time_ms": 0,
                    "knowledge_usage_ratio": 0,
                    "stats_metadata": {}
                })
            
            # Calculate knowledge base stats
            from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository
            collection_repo = KnowledgeCollectionRepository()
            item_repo = KnowledgeItemRepository()
            
            # Get collection count
            collections = collection_repo.get_by_client_id(db, client_id)
            collection_count = len(collections)
            
            # Get item count
            items = item_repo.get_items_for_client(db, client_id)
            item_count = len(items)
            
            # Update metadata
            metadata = daily_stats.stats_metadata or {}
            metadata["knowledge_collections"] = collection_count
            metadata["knowledge_items"] = item_count
            
            # Update stats
            self.daily_stats_repo.update(db, db_obj=daily_stats, obj_in={
                "stats_metadata": metadata
            })
            
        except Exception as e:
            logger.exception(f"Error updating knowledge counts: {str(e)}")
    
    def _update_storage_usage(self, db: Session, client_id: str) -> None:
        """Update storage usage calculation - FIXED to include documents + crawling content"""
        try:
            # Get document statistics (actual file sizes)
            from app.repositories.knowledge_repository import DocumentSourceRepository
            docs_repo = DocumentSourceRepository()
            docs_stats = docs_repo.get_document_statistics(db, client_id)
            document_bytes = docs_stats.get("total_size_bytes", 0)
            
            logger.info(f"Document bytes for client {client_id}: {document_bytes}")
            
            # Get collection IDs for this client
            from sqlalchemy import text
            collections_query = text("""
                SELECT collection_id FROM knowledge_collections 
                WHERE client_id = :client_id
            """)
            collection_results = db.execute(collections_query, {"client_id": client_id})
            collection_ids = [row[0] for row in collection_results]
            
            kb_bytes = 0
            crawled_bytes = 0
            
            if collection_ids:
                # Calculate size from knowledge items with documents
                kb_size_query = text("""
                    SELECT COALESCE(SUM(LENGTH(content)), 0) as total_size
                    FROM knowledge_items
                    WHERE collection_id = ANY(:collection_ids)
                    AND source_document_id IS NOT NULL
                """)
                kb_result = db.execute(kb_size_query, {"collection_ids": collection_ids})
                kb_bytes = kb_result.scalar() or 0
                
                # Calculate size from crawled items (without source_document_id)
                crawled_size_query = text("""
                    SELECT COALESCE(SUM(LENGTH(content)), 0) as total_size
                    FROM knowledge_items
                    WHERE collection_id = ANY(:collection_ids)
                    AND source_document_id IS NULL
                """)
                crawled_result = db.execute(crawled_size_query, {"collection_ids": collection_ids})
                crawled_bytes = crawled_result.scalar() or 0
            
            logger.info(f"Knowledge base bytes for client {client_id}: {kb_bytes}")
            logger.info(f"Crawled content bytes for client {client_id}: {crawled_bytes}")
            
            # TOTAL STORAGE = Documents + Knowledge Content + Crawled Content
            total_storage_bytes = document_bytes + kb_bytes + crawled_bytes
            
            # Create or update storage usage record
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
            
    def _update_active_users(self, db: Session, client_id: str) -> None:
        """Update active user count for subscription usage."""
        try:
            # Calculate active users from chat sessions
            from app.domain.chat.entities import ChatSession
            from sqlalchemy import func, distinct
            
            # Get current month
            current_month = datetime.utcnow().strftime("%Y-%m")
            month_start = f"{current_month}-01"
            
            # Count distinct users this month
            active_users = db.query(func.count(distinct(ChatSession.user_id)))\
                .filter(
                    ChatSession.client_id == client_id,
                    ChatSession.created_at >= month_start,
                    ChatSession.user_id.isnot(None)
                )\
                .scalar() or 0
            
            # Update subscription usage
            usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if usage:
                self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                    "users_active": active_users,
                    "last_updated": datetime.utcnow()
                })
            
        except Exception as e:
            logger.exception(f"Error updating active users: {str(e)}")
    
    def _update_daily_stats(self, db: Session, client_id: str) -> None:
        """Update aggregate daily statistics."""
        try:
            # Get today's date
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Get chat metrics for today
            chat_metrics = self.chat_metrics_repo.get_by_date(db, client_id, today)
            
            # Get knowledge metrics for today
            knowledge_metrics = self.knowledge_metrics_repo.get_by_date(db, client_id, today)
            
            # Get/create daily stats
            daily_stats = self.daily_stats_repo.get_by_date(db, client_id, today)
            
            if not daily_stats:
                daily_stats = self.daily_stats_repo.create(db, obj_in={
                    "client_id": client_id,
                    "date": today,
                    "total_sessions": 0,
                    "total_messages": 0,
                    "total_searches": 0,
                    "total_users": 0,
                    "average_response_time_ms": 0,
                    "knowledge_usage_ratio": 0,
                    "stats_metadata": {}
                })
            
            # Update stats data
            stats_data = {}
            
            if chat_metrics:
                stats_data["total_messages"] = chat_metrics.total_messages
                stats_data["average_response_time_ms"] = chat_metrics.average_response_time_ms
                
                if chat_metrics.total_assistant_messages > 0:
                    # Calculate knowledge usage ratio
                    knowledge_usage_ratio = (
                        chat_metrics.knowledge_usage_count / chat_metrics.total_assistant_messages
                    ) if chat_metrics.total_assistant_messages > 0 else 0
                    
                    stats_data["knowledge_usage_ratio"] = knowledge_usage_ratio
            
            if knowledge_metrics:
                stats_data["total_searches"] = knowledge_metrics.search_count
            
            # Get total sessions for today
            from app.domain.chat.entities import ChatSession
            session_count = db.query(ChatSession)\
                .filter(
                    ChatSession.client_id == client_id,
                    func.date(ChatSession.created_at) == today
                )\
                .count()
            
            stats_data["total_sessions"] = session_count
            
            # Get unique users for today
            from sqlalchemy import distinct
            user_count = db.query(func.count(distinct(ChatSession.user_id)))\
                .filter(
                    ChatSession.client_id == client_id,
                    func.date(ChatSession.created_at) == today,
                    ChatSession.user_id.isnot(None)
                )\
                .scalar() or 0
            
            stats_data["total_users"] = user_count
            
            # Update storage metrics in metadata
            metadata = daily_stats.stats_metadata or {}
            
            # Get storage usage
            storage_usage = self.storage_repo.get_latest(db, client_id)
            if storage_usage:
                metadata["storage_usage"] = {
                    "total_bytes": storage_usage.total_bytes,
                    "document_bytes": storage_usage.document_bytes,
                    "knowledge_bytes": storage_usage.knowledge_bytes,
                    "crawled_content_bytes": storage_usage.crawled_content_bytes,
                }
            
            stats_data["stats_metadata"] = metadata
            
            # Update daily stats
            self.daily_stats_repo.update(db, db_obj=daily_stats, obj_in=stats_data)
            
        except Exception as e:
            logger.exception(f"Error updating daily stats: {str(e)}")
    
    def _increment_message_count(self, db: Session, client_id: str) -> None:
        """Increment message count for subscription usage - FIXED to ensure proper counting"""
        try:
            # Get current month
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # Get subscription usage for current month
            usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if usage:
                # Increment message count atomically
                current_count = usage.messages_used or 0
                self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                    "messages_used": current_count + 1,
                    "last_updated": datetime.utcnow()
                })
            else:
                # Initialize usage if it doesn't exist
                self.initialize_subscription_usage(db, client_id)
                # Then increment
                usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
                if usage:
                    self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                        "messages_used": 1,
                        "last_updated": datetime.utcnow()
                    })
            
        except Exception as e:
            logger.exception(f"Error incrementing message count: {str(e)}")
                
    def check_subscription_limits(self, db: Session, client_id: str) -> Dict[str, Any]:
        """Check if client is within subscription limits."""
        try:
            # Get current subscription
            from app.repositories.client_repository import SubscriptionRepository
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client_id)
            
            # Default limits if no subscription
            message_limit = 100  # Free tier default
            user_limit = 10  # Default user limit
            storage_limit = 0.5 * 1024 * 1024  # 500 kb
            
            if subscription:
                message_limit = subscription.message_limit or message_limit
                user_limit = subscription.user_limit or user_limit
                storage_limit = subscription.storage_limit_bytes or storage_limit
            
            # Get current usage
            current_month = datetime.utcnow().strftime("%Y-%m")
            usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            if not usage:
                # Initialize usage tracking
                self.initialize_subscription_usage(db, client_id)
                usage = self.subscription_usage_repo.get_by_month(db, client_id, current_month)
            
            # Prepare response - FIX: Changed users_active to active_users
            result = {
                "current": {
                    "messages": {
                        "used": usage.messages_used if usage else 0,
                        "limit": message_limit,
                        "percentage": min(100, ((usage.messages_used if usage else 0) / message_limit) * 100) if message_limit > 0 else 0
                    },
                    "users": {
                        # Changed from users_active to active_users
                        "used": usage.active_users if usage else 0,
                        "limit": user_limit,
                        "percentage": min(100, ((usage.active_users if usage else 0) / user_limit) * 100) if user_limit > 0 else 0
                    },
                    "storage": {
                        "used_bytes": usage.storage_used_bytes if usage else 0,
                        "limit_bytes": storage_limit,
                        "percentage": min(100, ((usage.storage_used_bytes if usage else 0) / storage_limit) * 100) if storage_limit > 0 else 0
                    }
                }
            }
            
            # Add historical data
            historical = []
            
            # Get previous months - limiting to just 2 months for better performance
            previous_months = self.subscription_usage_repo.get_previous_months(db, client_id, limit=2)
            
            for prev_usage in previous_months:
                # Skip current month which is already in "current"
                if prev_usage.month == current_month:
                    continue
                    
                historical.append({
                    "month": prev_usage.month,
                    "messages": {
                        "used": prev_usage.messages_used,
                        "limit": message_limit,
                        "percentage": min(100, (prev_usage.messages_used / message_limit) * 100) if message_limit > 0 else 0
                    },
                    "users": {
                        # Changed from users_active to active_users
                        "used": prev_usage.active_users,
                        "limit": user_limit,
                        "percentage": min(100, (prev_usage.active_users / user_limit) * 100) if user_limit > 0 else 0
                    },
                    "storage": {
                        "used_bytes": prev_usage.storage_used_bytes,
                        "limit_bytes": storage_limit,
                        "percentage": min(100, (prev_usage.storage_used_bytes / storage_limit) * 100) if storage_limit > 0 else 0
                    }
                })
            
            result["historical"] = historical
            
            # Add subscription plan info
            if subscription:
                result["subscription"] = {
                    "plan_type": subscription.plan_type,
                    "status": subscription.status,
                    "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None
                }
            else:
                result["subscription"] = {
                    "plan_type": "free",
                    "status": "active",
                    "expires_at": None
                }
            
            return result
            
        except Exception as e:
            logger.exception(f"Error checking subscription limits: {str(e)}")
            return {
                "error": str(e),
                "current": {
                    "messages": {"used": 0, "limit": 1000, "percentage": 0},
                    "users": {"used": 0, "limit": 10, "percentage": 0},
                    "storage": {"used_bytes": 0, "limit_bytes": 100 * 1024 * 1024, "percentage": 0}
                }
            }
                            
    def repair_subscription_data(self, db: Session) -> None:
        """Repair subscription usage data for all clients."""
        try:
            # Get all clients
            from app.domain.client.entities import Client
            clients = db.query(Client).all()
            
            for client in clients:
                logger.info(f"Repairing subscription data for client {client.client_id}")
                
                # Initialize if needed
                self.initialize_subscription_usage(db, client.client_id)
                
                # Update storage usage
                self._update_storage_usage(db, client.client_id)
                
                # Update active users
                self._update_active_users(db, client.client_id)
                
                # Update message count from chat metrics
                current_month = datetime.utcnow().strftime("%Y-%m")
                month_start = f"{current_month}-01"

                # Get total messages from chat metrics - only count assistant messages
                from app.domain.analytics.entities import ChatMetrics
                total_messages = db.query(func.sum(ChatMetrics.total_assistant_messages))\
                    .filter(
                        ChatMetrics.client_id == client.client_id,
                        ChatMetrics.date >= month_start
                    )\
                    .scalar() or 0

                # Update subscription usage
                usage = self.subscription_usage_repo.get_by_month(db, client.client_id, current_month)
                if usage:
                    self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                        "messages_used": total_messages,
                        "last_updated": datetime.utcnow()
                    })
            
            logger.info("Subscription data repair completed")
            
        except Exception as e:
            logger.exception(f"Error repairing subscription data: {str(e)}")
            
    def track_channel_message(
        self,
        db: Session,
        client_id: str,
        channel_id: str,
        conversation_id: str,
        message_content: str,
        direction: str,
        platform: str,
        message_type: str = "text"
    ) -> None:
        """
        Track a message sent through a social channel.
        
        Args:
            db: Database session
            client_id: Client ID
            channel_id: Channel ID
            conversation_id: Conversation ID
            message_content: Message content
            direction: Direction (inbound/outbound)
            platform: Platform type
            message_type: Message type
        """
        try:
            # Make sure subscription usage is initialized
            self.initialize_subscription_usage(db, client_id)
            
            # Track message in analytics
            from app.services.analytics.social_channel_analytics import SocialChannelAnalytics
            channel_analytics = SocialChannelAnalytics(db)
            channel_analytics.track_channel_message(
                client_id=client_id,
                channel_id=channel_id,
                conversation_id=conversation_id,
                direction=direction,
                platform=platform
            )
            
            # Increment message counter for subscription tracking
            self.subscription_usage_repo.increment_usage(db, client_id, "messages_used")
            
            # Update daily stats
            self._update_daily_stats(db, client_id)
            
            logger.info(f"Tracked channel message for client {client_id} on {platform}")
        except Exception as e:
            logger.error(f"Error tracking channel message: {str(e)}", exc_info=True)            