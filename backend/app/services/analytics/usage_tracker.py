# backend/app/services/analytics/usage_tracker.py
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Set
from sqlalchemy.orm import Session
import json

from app.repositories.analytics_repository import (
    ApiUsageLogRepository, ChatMetricsRepository,
    KnowledgeMetricsRepository, SubscriptionUsageRepository,
    DailyStatsRepository
)
from app.core import logger

class UsageTracker:
    """
    Service for tracking various usage metrics across the platform.
    
    This service provides methods to track:
    - API endpoint usage
    - Chat interactions and metrics
    - Knowledge base usage
    - Subscription usage against limits
    - Daily aggregated statistics
    """
    
    def __init__(self):
        self.api_log_repo = ApiUsageLogRepository()
        self.chat_metrics_repo = ChatMetricsRepository()
        self.knowledge_metrics_repo = KnowledgeMetricsRepository()
        self.subscription_usage_repo = SubscriptionUsageRepository()
        self.daily_stats_repo = DailyStatsRepository()
        
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
        """
        Track an API request.
        
        Args:
            db: Database session
            client_id: Client ID
            endpoint: API endpoint path
            method: HTTP method (GET, POST, etc.)
            status_code: HTTP status code
            response_time_ms: Response time in milliseconds
            ip_address: Optional client IP address
            user_agent: Optional client user agent
        """
        try:
            # Create API usage log
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
            
            # Update subscription usage for API calls
            if endpoint.startswith("/api/") and status_code < 500:
                self.update_subscription_usage(db, client_id)
                
        except Exception as e:
            logger.error(f"Error tracking API request: {str(e)}")
    
    def track_chat_interaction(
        self,
        db: Session,
        client_id: str,
        session_id: str,
        response_time_ms: int,
        used_knowledge: bool,
        user_satisfaction: Optional[float] = None
    ) -> None:
        """
        Track a chat interaction.
        
        Args:
            db: Database session
            client_id: Client ID
            session_id: Chat session ID
            response_time_ms: Response generation time in milliseconds
            used_knowledge: Whether knowledge base was used in response
            user_satisfaction: Optional user satisfaction rating (1-5)
        """
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Update chat metrics for today
            existing = self.chat_metrics_repo.get_by_date(db, client_id, today)
            
            if existing:
                # Update existing metrics
                total_messages = existing.total_messages + 1
                knowledge_usage = existing.knowledge_usage_count + (1 if used_knowledge else 0)
                
                # Calculate new average response time
                if existing.average_response_time_ms:
                    avg_response_time = (
                        (existing.average_response_time_ms * existing.total_messages) + response_time_ms
                    ) / total_messages
                else:
                    avg_response_time = response_time_ms
                
                # Update metrics
                self.chat_metrics_repo.update(db, db_obj=existing, obj_in={
                    "total_messages": total_messages,
                    "average_response_time_ms": avg_response_time,
                    "knowledge_usage_count": knowledge_usage,
                    "user_satisfaction": user_satisfaction if user_satisfaction else existing.user_satisfaction,
                    "timestamp": datetime.utcnow()
                })
            else:
                # Create new metrics
                self.chat_metrics_repo.create(db, obj_in={
                    "client_id": client_id,
                    "session_id": session_id,
                    "total_messages": 1,
                    "average_response_time_ms": response_time_ms,
                    "knowledge_usage_count": 1 if used_knowledge else 0,
                    "user_satisfaction": user_satisfaction,
                    "timestamp": datetime.utcnow(),
                    "date": today
                })
            
            # Update subscription usage for chat messages
            self.subscription_usage_repo.increment_usage(db, client_id, "messages_used")
            
            # Update daily stats
            self._update_daily_stats(db, client_id)
            
        except Exception as e:
            logger.error(f"Error tracking chat interaction: {str(e)}")
    
    def track_knowledge_search(
        self,
        db: Session,
        client_id: str,
        query: str,
        collection_id: Optional[str] = None,
        results_count: int = 0,
        relevance_scores: Optional[List[float]] = None
    ) -> None:
        """
        Track a knowledge base search.
        
        Args:
            db: Database session
            client_id: Client ID
            query: Search query text
            collection_id: Optional knowledge collection ID
            results_count: Number of results returned
            relevance_scores: Optional list of relevance scores
        """
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Calculate average relevance if scores provided
            avg_relevance = None
            if relevance_scores and len(relevance_scores) > 0:
                avg_relevance = sum(relevance_scores) / len(relevance_scores)
            
            # Update knowledge metrics for today
            existing = self.knowledge_metrics_repo.get_by_date(db, client_id, today, collection_id)
            
            if existing:
                # Update existing metrics
                search_count = existing.search_count + 1
                
                # Calculate new average relevance
                if avg_relevance:
                    if existing.average_relevance_score:
                        new_avg_relevance = (
                            (existing.average_relevance_score * existing.search_count) + avg_relevance
                        ) / search_count
                    else:
                        new_avg_relevance = avg_relevance
                else:
                    new_avg_relevance = existing.average_relevance_score
                
                # Update metrics
                self.knowledge_metrics_repo.update(db, db_obj=existing, obj_in={
                    "search_count": search_count,
                    "average_relevance_score": new_avg_relevance
                })
            else:
                # Create new metrics
                self.knowledge_metrics_repo.create(db, obj_in={
                    "client_id": client_id,
                    "collection_id": collection_id,
                    "search_count": 1,
                    "average_relevance_score": avg_relevance,
                    "items_count": 0,  # Will be updated separately
                    "document_count": 0,  # Will be updated separately
                    "date": today
                })
            
            # Update daily stats
            daily_stats = self.daily_stats_repo.get_by_date(db, client_id, today)
            if daily_stats:
                self.daily_stats_repo.update(db, db_obj=daily_stats, obj_in={
                    "total_searches": daily_stats.total_searches + 1
                })
            
        except Exception as e:
            logger.error(f"Error tracking knowledge search: {str(e)}")
    
    def update_knowledge_counts(
        self, 
        db: Session,
        client_id: str,
        collection_id: Optional[str] = None
    ) -> None:
        """
        Update knowledge item and document counts.
        
        Args:
            db: Database session
            client_id: Client ID
            collection_id: Optional knowledge collection ID
        """
        try:
            from app.repositories.knowledge_repository import (
                KnowledgeCollectionRepository,
                KnowledgeItemRepository,
                DocumentSourceRepository
            )
            
            today = datetime.utcnow().strftime("%Y-%m-%d")
            items_repo = KnowledgeItemRepository()
            docs_repo = DocumentSourceRepository()
            collections_repo = KnowledgeCollectionRepository()
            
            # If no collection specified, update metrics for all collections
            if not collection_id:
                collections = collections_repo.get_by_client_id(db, client_id)
                collection_ids = [c.collection_id for c in collections]
            else:
                collection_ids = [collection_id]
            
            # Update metrics for each collection
            for col_id in collection_ids:
                # Get item and document counts
                items = items_repo.get_by_collection_id(db, col_id)
                
                # Only count processed documents
                docs = docs_repo.get_documents_for_collection(db, col_id)
                processed_docs = [d for d in docs if d.status == "processed"]
                
                # Update knowledge metrics
                existing = self.knowledge_metrics_repo.get_by_date(db, client_id, today, col_id)
                
                if existing:
                    self.knowledge_metrics_repo.update(db, db_obj=existing, obj_in={
                        "items_count": len(items),
                        "document_count": len(processed_docs)
                    })
                else:
                    self.knowledge_metrics_repo.create(db, obj_in={
                        "client_id": client_id,
                        "collection_id": col_id,
                        "search_count": 0,
                        "items_count": len(items),
                        "document_count": len(processed_docs),
                        "date": today
                    })
                    
            # Update storage usage in subscription
            self._update_storage_usage(db, client_id)
            
        except Exception as e:
            logger.error(f"Error updating knowledge counts: {str(e)}")
    
    def update_subscription_usage(self, db: Session, client_id: str) -> None:
        """
        Update subscription usage metrics.
        
        Args:
            db: Database session
            client_id: Client ID
        """
        try:
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # Get subscription info
            from app.repositories.client_repository import SubscriptionRepository
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client_id)
            
            if not subscription:
                logger.warning(f"No active subscription found for client {client_id}")
                return
            
            # Get unique active users
            self._update_active_users(db, client_id)
            
        except Exception as e:
            logger.error(f"Error updating subscription usage: {str(e)}")
    
    def _update_storage_usage(self, db: Session, client_id: str) -> None:
        """Update storage usage for client subscription."""
        try:
            from app.repositories.knowledge_repository import DocumentSourceRepository
            docs_repo = DocumentSourceRepository()
            
            # Get document statistics
            stats = docs_repo.get_document_statistics(db, client_id)
            total_bytes = stats.get("total_size_bytes", 0)
            
            # Update subscription usage
            usage = self.subscription_usage_repo.get_current_month(db, client_id)
            if usage:
                self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                    "storage_used_bytes": total_bytes
                })
            
        except Exception as e:
            logger.error(f"Error updating storage usage: {str(e)}")
    
    def _update_active_users(self, db: Session, client_id: str) -> None:
        """Update active users count for subscription."""
        try:
            current_month = datetime.utcnow().strftime("%Y-%m")
            start_date = f"{current_month}-01"
            
            # Get unique user IDs from chat sessions this month
            from app.repositories.chat_repository import ChatSessionRepository
            session_repo = ChatSessionRepository()
            
            # Get all sessions from this month
            from datetime import datetime
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            
            from sqlalchemy import func, distinct
            from app.domain.chat.entities import ChatSession
            
            unique_users = db.query(func.count(distinct(ChatSession.user_id)))\
                .filter(
                    ChatSession.client_id == client_id,
                    ChatSession.user_id.isnot(None),
                    ChatSession.created_at >= start_datetime
                )\
                .scalar() or 0
            
            # Update subscription usage
            usage = self.subscription_usage_repo.get_current_month(db, client_id)
            if usage:
                self.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                    "active_users": unique_users
                })
            
        except Exception as e:
            logger.error(f"Error updating active users: {str(e)}")
    
    def track_response_performance(
        self,
        db: Session,
        client_id: str,
        session_id: str,
        response_time_ms: int,
        token_count: int,
        knowledge_used: bool,
        prompt_tokens: int = 0,
        completion_tokens: int = 0
    ) -> None:
        """
        Track detailed performance metrics for chatbot responses.
        
        Args:
            db: Database session
            client_id: Client ID
            session_id: Chat session ID
            response_time_ms: Response generation time in milliseconds
            token_count: Total token count for the interaction
            knowledge_used: Whether knowledge base was used
            prompt_tokens: Number of tokens in the prompt
            completion_tokens: Number of tokens in the completion
        """
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Update chat metrics for today
            existing = self.chat_metrics_repo.get_by_date(db, client_id, today)
            
            if existing:
                # Calculate averages with current values
                total_messages = existing.total_messages + 1
                knowledge_usage = existing.knowledge_usage_count + (1 if knowledge_used else 0)
                
                # Calculate new average response time
                if existing.average_response_time_ms:
                    avg_response_time = (
                        (existing.average_response_time_ms * existing.total_messages) + response_time_ms
                    ) / total_messages
                else:
                    avg_response_time = response_time_ms
                
                # Update metrics including token counts
                updated_metadata = existing.stats_metadata or {}
                updated_metadata.update({
                    "total_tokens": (updated_metadata.get("total_tokens", 0) or 0) + token_count,
                    "prompt_tokens": (updated_metadata.get("prompt_tokens", 0) or 0) + prompt_tokens,
                    "completion_tokens": (updated_metadata.get("completion_tokens", 0) or 0) + completion_tokens,
                    "interactions_with_knowledge": (updated_metadata.get("interactions_with_knowledge", 0) or 0) + (1 if knowledge_used else 0)
                })
                
                self.chat_metrics_repo.update(db, db_obj=existing, obj_in={
                    "total_messages": total_messages,
                    "average_response_time_ms": avg_response_time,
                    "knowledge_usage_count": knowledge_usage,
                    "stats_metadata": updated_metadata,
                    "timestamp": datetime.utcnow()
                })
            else:
                # Create new metrics record
                metadata = {
                    "total_tokens": token_count,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "interactions_with_knowledge": 1 if knowledge_used else 0
                }
                
                self.chat_metrics_repo.create(db, obj_in={
                    "client_id": client_id,
                    "session_id": session_id,
                    "total_messages": 1,
                    "average_response_time_ms": response_time_ms,
                    "knowledge_usage_count": 1 if knowledge_used else 0,
                    "stats_metadata": metadata,
                    "timestamp": datetime.utcnow(),
                    "date": today
                })
        
        except Exception as e:
            logger.error(f"Error tracking response performance: {str(e)}")

    def track_search_performance(
        self,
        db: Session,
        client_id: str,
        query: str,
        results_count: int,
        response_time_ms: int,
        search_type: str = "hybrid",
        collection_id: Optional[str] = None,
        relevance_scores: Optional[List[float]] = None
    ) -> None:
        """
        Track search performance metrics.
        
        Args:
            db: Database session
            client_id: Client ID
            query: Search query text
            results_count: Number of results returned
            response_time_ms: Response time in milliseconds
            search_type: Type of search (vector, keyword, hybrid)
            collection_id: Optional collection ID
            relevance_scores: Optional list of relevance scores
        """
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Calculate average relevance if scores provided
            avg_relevance = None
            if relevance_scores and len(relevance_scores) > 0:
                avg_relevance = sum(relevance_scores) / len(relevance_scores)
            
            # Update knowledge metrics for today with performance data
            existing = self.knowledge_metrics_repo.get_by_date(db, client_id, today, collection_id)
            
            if existing:
                # Update existing metrics with performance data
                search_count = existing.search_count + 1
                
                # Calculate new average relevance
                if avg_relevance:
                    if existing.average_relevance_score:
                        new_avg_relevance = (
                            (existing.average_relevance_score * existing.search_count) + avg_relevance
                        ) / search_count
                    else:
                        new_avg_relevance = avg_relevance
                else:
                    new_avg_relevance = existing.average_relevance_score
                
                # Update with search performance stats
                stats_metadata = existing.stats_metadata or {}
                stats_metadata.update({
                    f"{search_type}_searches": (stats_metadata.get(f"{search_type}_searches", 0) or 0) + 1,
                    "total_response_time_ms": (stats_metadata.get("total_response_time_ms", 0) or 0) + response_time_ms,
                    "avg_response_time_ms": ((stats_metadata.get("total_response_time_ms", 0) or 0) + response_time_ms) / search_count,
                    "zero_results_searches": (stats_metadata.get("zero_results_searches", 0) or 0) + (1 if results_count == 0 else 0),
                    "query_lengths": stats_metadata.get("query_lengths", []) + [len(query)]
                })
                
                self.knowledge_metrics_repo.update(db, db_obj=existing, obj_in={
                    "search_count": search_count,
                    "average_relevance_score": new_avg_relevance,
                    "stats_metadata": stats_metadata
                })
            else:
                # Create new metrics with performance data
                stats_metadata = {
                    f"{search_type}_searches": 1,
                    "total_response_time_ms": response_time_ms,
                    "avg_response_time_ms": response_time_ms,
                    "zero_results_searches": 1 if results_count == 0 else 0,
                    "query_lengths": [len(query)]
                }
                
                self.knowledge_metrics_repo.create(db, obj_in={
                    "client_id": client_id,
                    "collection_id": collection_id,
                    "search_count": 1,
                    "average_relevance_score": avg_relevance,
                    "items_count": 0,  # Will be updated separately
                    "document_count": 0,  # Will be updated separately
                    "stats_metadata": stats_metadata,
                    "date": today
                })
            
            # Update daily stats
            daily_stats = self.daily_stats_repo.get_by_date(db, client_id, today)
            if daily_stats:
                self.daily_stats_repo.update(db, db_obj=daily_stats, obj_in={
                    "total_searches": daily_stats.total_searches + 1
                })
            
        except Exception as e:
            logger.error(f"Error tracking search performance: {str(e)}")
    
    # Update the _update_daily_stats method in the UsageTracker class
    def _update_daily_stats(self, db: Session, client_id: str) -> None:
        """Update or create daily statistics aggregates."""
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Get existing stats or create new
            daily_stats = self.daily_stats_repo.get_by_date(db, client_id, today)
            
            # Count total sessions today
            from app.repositories.chat_repository import ChatSessionRepository
            from app.domain.chat.entities import ChatSession
            session_repo = ChatSessionRepository()
            
            # Get today's timestamp range
            today_start = datetime.strptime(f"{today} 00:00:00", "%Y-%m-%d %H:%M:%S")
            today_end = datetime.strptime(f"{today} 23:59:59", "%Y-%m-%d %H:%M:%S")
            
            # Count sessions
            session_count = db.query(ChatSession)\
                .filter(
                    ChatSession.client_id == client_id,
                    ChatSession.created_at >= today_start,
                    ChatSession.created_at <= today_end
                )\
                .count()
            
            # Count unique users
            from sqlalchemy import func, distinct
            unique_users = db.query(func.count(distinct(ChatSession.user_id)))\
                .filter(
                    ChatSession.client_id == client_id,
                    ChatSession.user_id.isnot(None),
                    ChatSession.created_at >= today_start,
                    ChatSession.created_at <= today_end
                )\
                .scalar() or 0
            
            # Get chat metrics
            chat_metrics = self.chat_metrics_repo.get_by_date(db, client_id, today)
            total_messages = chat_metrics.total_messages if chat_metrics else 0
            avg_response_time = chat_metrics.average_response_time_ms if chat_metrics else None
            knowledge_usage = chat_metrics.knowledge_usage_count if chat_metrics else 0
            
            # Calculate knowledge usage ratio
            knowledge_ratio = (knowledge_usage / total_messages) if total_messages > 0 else 0
            
            # Get total searches
            from sqlalchemy import func
            from app.domain.analytics.entities import KnowledgeMetrics
            
            total_searches = db.query(func.sum(KnowledgeMetrics.search_count))\
                .filter(
                    KnowledgeMetrics.client_id == client_id,
                    KnowledgeMetrics.date == today
                )\
                .scalar() or 0
            
            # Update or create daily stats
            if daily_stats:
                self.daily_stats_repo.update(db, db_obj=daily_stats, obj_in={
                    "total_sessions": session_count,
                    "total_messages": total_messages,
                    "total_searches": total_searches,
                    "total_users": unique_users,
                    "average_response_time_ms": avg_response_time,
                    "knowledge_usage_ratio": knowledge_ratio
                })
            else:
                self.daily_stats_repo.create(db, obj_in={
                    "client_id": client_id,
                    "date": today,
                    "total_sessions": session_count,
                    "total_messages": total_messages,
                    "total_searches": total_searches,
                    "total_users": unique_users,
                    "average_response_time_ms": avg_response_time,
                    "knowledge_usage_ratio": knowledge_ratio,
                    "stats_metadata": {}  # Initialize with empty JSON object
                })
                
        except Exception as e:
            logger.error(f"Error updating daily stats: {str(e)}")
                        
    def check_subscription_limits(self, db: Session, client_id: str) -> Dict[str, Any]:
        """
        Check if client has exceeded subscription limits.
        
        Args:
            db: Database session
            client_id: Client ID
            
        Returns:
            Dictionary with limit status information
        """
        try:
            usage = self.subscription_usage_repo.get_current_month(db, client_id)
            
            if not usage:
                return {
                    "within_limits": True,
                    "message": "No usage data available"
                }
            
            # Check message limit
            messages_limit_reached = False
            if usage.messages_limit and usage.messages_used >= usage.messages_limit:
                messages_limit_reached = True
            
            # Check user limit
            users_limit_reached = False
            if usage.active_users_limit and usage.active_users >= usage.active_users_limit:
                users_limit_reached = True
            
            # Check storage limit
            storage_limit_reached = False
            if usage.storage_limit_bytes and usage.storage_used_bytes >= usage.storage_limit_bytes:
                storage_limit_reached = True
            
            # Build response
            response = {
                "within_limits": not (messages_limit_reached or users_limit_reached or storage_limit_reached),
                "limits": {
                    "messages": {
                        "used": usage.messages_used,
                        "limit": usage.messages_limit,
                        "exceeded": messages_limit_reached,
                        "percentage": (usage.messages_used / usage.messages_limit * 100) if usage.messages_limit else 0
                    },
                    "users": {
                        "active": usage.active_users,
                        "limit": usage.active_users_limit,
                        "exceeded": users_limit_reached,
                        "percentage": (usage.active_users / usage.active_users_limit * 100) if usage.active_users_limit else 0
                    },
                    "storage": {
                        "used_bytes": usage.storage_used_bytes,
                        "limit_bytes": usage.storage_limit_bytes,
                        "exceeded": storage_limit_reached,
                        "percentage": (usage.storage_used_bytes / usage.storage_limit_bytes * 100) if usage.storage_limit_bytes else 0
                    }
                }
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error checking subscription limits: {str(e)}")
            return {
                "within_limits": True,
                "error": "Error checking limits"
            }