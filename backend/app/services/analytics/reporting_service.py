# backend/app/services/analytics/reporting_service.py
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.repositories.analytics_repository import (
    ApiUsageLogRepository, ChatMetricsRepository,
    KnowledgeMetricsRepository, SubscriptionUsageRepository,
    DailyStatsRepository
)
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger

class ReportingService:
    """
    Service for generating analytics reports.
    
    This service provides methods to generate various reports:
    - Dashboard overview reports
    - Chat performance reports
    - Knowledge base usage reports
    - Subscription usage reports
    - Custom date range reports
    """
    
    def __init__(self):
        self.api_log_repo = ApiUsageLogRepository()
        self.chat_metrics_repo = ChatMetricsRepository()
        self.knowledge_metrics_repo = KnowledgeMetricsRepository()
        self.subscription_usage_repo = SubscriptionUsageRepository()
        self.daily_stats_repo = DailyStatsRepository()
        self.usage_tracker = UsageTracker()
    
    def get_dashboard_overview(self, db: Session, client_id: str) -> Dict[str, Any]:
        """
        Generate dashboard overview report.
        
        Args:
            db: Database session
            client_id: Client ID
            
        Returns:
            Dictionary with dashboard overview data
        """
        try:
            # Get today and yesterday dates
            today = datetime.utcnow().strftime("%Y-%m-%d")
            yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            
            # Get last 30 days date
            thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            # Get today's stats
            today_stats = self.daily_stats_repo.get_by_date(db, client_id, today)
            yesterday_stats = self.daily_stats_repo.get_by_date(db, client_id, yesterday)
            
            # Get last 30 days stats
            monthly_stats = self.daily_stats_repo.get_date_range(
                db, 
                client_id, 
                thirty_days_ago, 
                today
            )
            
            # Calculate monthly totals and averages
            total_sessions = sum(stat.total_sessions for stat in monthly_stats) if monthly_stats else 0
            total_messages = sum(stat.total_messages for stat in monthly_stats) if monthly_stats else 0
            total_searches = sum(stat.total_searches for stat in monthly_stats) if monthly_stats else 0
            
            # Calculate averages
            avg_sessions = total_sessions / 30 if total_sessions > 0 else 0
            avg_messages = total_messages / 30 if total_messages > 0 else 0
            avg_searches = total_searches / 30 if total_searches > 0 else 0
            
            # Calculate response time averages
            response_times = [
                stat.average_response_time_ms for stat in monthly_stats 
                if stat.average_response_time_ms is not None
            ]
            avg_response_time = sum(response_times) / len(response_times) if response_times else None
            
            # Calculate average knowledge usage ratio
            knowledge_ratios = [
                stat.knowledge_usage_ratio for stat in monthly_stats 
                if stat.knowledge_usage_ratio is not None
            ]
            avg_knowledge_ratio = sum(knowledge_ratios) / len(knowledge_ratios) if knowledge_ratios else 0
            
            # Get today's data with default values for missing data
            today_data = {
                "sessions": today_stats.total_sessions if today_stats else 0,
                "messages": today_stats.total_messages if today_stats else 0,
                "searches": today_stats.total_searches if today_stats else 0,
                "users": today_stats.total_users if today_stats else 0,
                "avg_response_time_ms": today_stats.average_response_time_ms if today_stats else None,
                "knowledge_usage_ratio": today_stats.knowledge_usage_ratio if today_stats else 0
            }
            
            # Calculate day-over-day changes
            yest_sessions = yesterday_stats.total_sessions if yesterday_stats else 0
            yest_messages = yesterday_stats.total_messages if yesterday_stats else 0
            yest_searches = yesterday_stats.total_searches if yesterday_stats else 0
            yest_users = yesterday_stats.total_users if yesterday_stats else 0
            
            # Avoid division by zero
            session_change = ((today_data["sessions"] - yest_sessions) / yest_sessions * 100) if yest_sessions > 0 else 0
            message_change = ((today_data["messages"] - yest_messages) / yest_messages * 100) if yest_messages > 0 else 0
            search_change = ((today_data["searches"] - yest_searches) / yest_searches * 100) if yest_searches > 0 else 0
            user_change = ((today_data["users"] - yest_users) / yest_users * 100) if yest_users > 0 else 0
            
            # Check subscription limits
            subscription_status = self.usage_tracker.check_subscription_limits(db, client_id)
            
            # Build report
            report = {
                "today": today_data,
                "changes": {
                    "sessions": session_change,
                    "messages": message_change,
                    "searches": search_change,
                    "users": user_change
                },
                "monthly": {
                    "total_sessions": total_sessions,
                    "total_messages": total_messages,
                    "total_searches": total_searches,
                    "avg_sessions_per_day": avg_sessions,
                    "avg_messages_per_day": avg_messages,
                    "avg_searches_per_day": avg_searches,
                    "avg_response_time_ms": avg_response_time,
                    "avg_knowledge_usage_ratio": avg_knowledge_ratio
                },
                "subscription": subscription_status,
                "time_period": {
                    "start_date": thirty_days_ago,
                    "end_date": today
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating dashboard overview: {str(e)}")
            return {
                "error": "Failed to generate dashboard overview",
                "details": str(e)
            }
    
    def get_chat_performance_report(
        self, 
        db: Session, 
        client_id: str, 
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Generate chat performance report.
        
        Args:
            db: Database session
            client_id: Client ID
            days: Number of days to include in report
            
        Returns:
            Dictionary with chat performance report data
        """
        try:
            # Get date range
            end_date = datetime.utcnow().strftime("%Y-%m-%d")
            start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
            
            # Get daily chat metrics
            daily_stats = self.daily_stats_repo.get_date_range(db, client_id, start_date, end_date)
            
            # Create time series data
            time_series = [{
                "date": stat.date,
                "total_messages": stat.total_messages,
                "total_sessions": stat.total_sessions,
                "knowledge_usage_ratio": stat.knowledge_usage_ratio,
                "average_response_time_ms": stat.average_response_time_ms
            } for stat in daily_stats]
            
            # Sort by date
            time_series.sort(key=lambda x: x["date"])
            
            # Calculate overall metrics
            total_messages = sum(stat.total_messages for stat in daily_stats) if daily_stats else 0
            total_sessions = sum(stat.total_sessions for stat in daily_stats) if daily_stats else 0
            
            # Calculate knowledge usage
            knowledge_messages = sum(
                int(stat.total_messages * stat.knowledge_usage_ratio) 
                for stat in daily_stats 
                if stat.knowledge_usage_ratio is not None
            )
            
            # Calculate response time statistics
            response_times = [
                stat.average_response_time_ms for stat in daily_stats 
                if stat.average_response_time_ms is not None
            ]
            
            avg_response_time = sum(response_times) / len(response_times) if response_times else None
            min_response_time = min(response_times) if response_times else None
            max_response_time = max(response_times) if response_times else None
            
            # Build report
            report = {
                "summary": {
                    "total_messages": total_messages,
                    "total_sessions": total_sessions,
                    "messages_per_session": total_messages / total_sessions if total_sessions > 0 else 0,
                    "knowledge_usage_percentage": (knowledge_messages / total_messages * 100) if total_messages > 0 else 0,
                    "avg_response_time_ms": avg_response_time,
                    "min_response_time_ms": min_response_time,
                    "max_response_time_ms": max_response_time
                },
                "time_series": time_series,
                "time_period": {
                    "start_date": start_date,
                    "end_date": end_date,
                    "days": days
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating chat performance report: {str(e)}")
            return {
                "error": "Failed to generate chat performance report",
                "details": str(e)
            }
    
    def get_knowledge_usage_report(
        self, 
        db: Session, 
        client_id: str, 
        days: int = 30,
        collection_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate knowledge base usage report.
        
        Args:
            db: Database session
            client_id: Client ID
            days: Number of days to include in report
            collection_id: Optional collection ID to filter report
            
        Returns:
            Dictionary with knowledge usage report data
        """
        try:
            # Get date range
            end_date = datetime.utcnow().strftime("%Y-%m-%d")
            start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
            
            # If collection_id specified, get metrics for that collection
            if collection_id:
                metrics = db.query(self.knowledge_metrics_repo.model)\
                    .filter(
                        self.knowledge_metrics_repo.model.client_id == client_id,
                        self.knowledge_metrics_repo.model.collection_id == collection_id,
                        self.knowledge_metrics_repo.model.date >= start_date,
                        self.knowledge_metrics_repo.model.date <= end_date
                    )\
                    .order_by(self.knowledge_metrics_repo.model.date)\
                    .all()
                
                # Create time series data for the collection
                time_series = [{
                    "date": metric.date,
                    "search_count": metric.search_count,
                    "average_relevance_score": metric.average_relevance_score,
                    "items_count": metric.items_count,
                    "document_count": metric.document_count
                } for metric in metrics]
                
                # Get collection name
                from app.repositories.knowledge_repository import KnowledgeCollectionRepository
                collection_repo = KnowledgeCollectionRepository()
                collection = collection_repo.get_by_collection_id(db, collection_id)
                collection_name = collection.name if collection else "Unknown"
                
                # Build collection-specific report
                report = {
                    "collection": {
                        "id": collection_id,
                        "name": collection_name
                    },
                    "summary": {
                        "total_searches": sum(metric.search_count for metric in metrics) if metrics else 0,
                        "avg_relevance_score": sum(metric.average_relevance_score for metric in metrics if metric.average_relevance_score) / len([m for m in metrics if m.average_relevance_score]) if metrics else 0,
                        "current_items": metrics[-1].items_count if metrics else 0,
                        "current_documents": metrics[-1].document_count if metrics else 0
                    },
                    "time_series": time_series,
                    "time_period": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "days": days
                    }
                }
                
            else:
                # Get metrics aggregated across all collections
                from sqlalchemy import func
                from app.domain.analytics.entities import KnowledgeMetrics
                
                # Get daily aggregated metrics
                daily_metrics = db.query(
                    KnowledgeMetrics.date,
                    func.sum(KnowledgeMetrics.search_count).label('search_count'),
                    func.avg(KnowledgeMetrics.average_relevance_score).label('avg_relevance'),
                    func.sum(KnowledgeMetrics.items_count).label('items_count'),
                    func.sum(KnowledgeMetrics.document_count).label('document_count')
                ).filter(
                    KnowledgeMetrics.client_id == client_id,
                    KnowledgeMetrics.date >= start_date,
                    KnowledgeMetrics.date <= end_date
                ).group_by(
                    KnowledgeMetrics.date
                ).order_by(
                    KnowledgeMetrics.date
                ).all()
                
                # Create time series data
                time_series = [{
                    "date": metric.date,
                    "search_count": metric.search_count,
                    "average_relevance_score": metric.avg_relevance,
                    "items_count": metric.items_count,
                    "document_count": metric.document_count
                } for metric in daily_metrics]
                
                # Get collection distribution
                collection_metrics = db.query(
                    KnowledgeMetrics.collection_id,
                    func.sum(KnowledgeMetrics.search_count).label('search_count')
                ).filter(
                    KnowledgeMetrics.client_id == client_id,
                    KnowledgeMetrics.date >= start_date,
                    KnowledgeMetrics.date <= end_date,
                    KnowledgeMetrics.collection_id.isnot(None)
                ).group_by(
                    KnowledgeMetrics.collection_id
                ).all()
                
                # Get collection names
                from app.repositories.knowledge_repository import KnowledgeCollectionRepository
                collection_repo = KnowledgeCollectionRepository()
                
                collection_distribution = []
                for c_id, search_count in collection_metrics:
                    collection = collection_repo.get_by_collection_id(db, c_id)
                    if collection:
                        collection_distribution.append({
                            "id": c_id,
                            "name": collection.name,
                            "search_count": search_count
                        })
                
                # Calculate total searches
                total_searches = sum(metric.search_count for metric in daily_metrics) if daily_metrics else 0
                
                # Calculate relevance scores
                relevance_scores = [metric.avg_relevance for metric in daily_metrics if metric.avg_relevance is not None]
                avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0
                
                # Get current counts from most recent day
                current_items = daily_metrics[-1].items_count if daily_metrics else 0
                current_documents = daily_metrics[-1].document_count if daily_metrics else 0
                
                # Build overall report
                report = {
                    "summary": {
                        "total_searches": total_searches,
                        "avg_relevance_score": avg_relevance,
                        "current_items": current_items,
                        "current_documents": current_documents,
                        "search_per_day": total_searches / days if days > 0 else 0
                    },
                    "time_series": time_series,
                    "collection_distribution": collection_distribution,
                    "time_period": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "days": days
                    }
                }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating knowledge usage report: {str(e)}")
            return {
                "error": "Failed to generate knowledge usage report",
                "details": str(e)
            }
    
    def get_subscription_usage_report(self, db: Session, client_id: str, months: int = 6) -> Dict[str, Any]:
        """
        Generate subscription usage report.
        
        Args:
            db: Database session
            client_id: Client ID
            months: Number of months to include in report
            
        Returns:
            Dictionary with subscription usage report data
        """
        try:
            # Get usage for recent months
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # Create a list of month strings going back the specified number of months
            month_strings = []
            for i in range(months):
                date = datetime.utcnow() - timedelta(days=30 * i)
                month_strings.append(date.strftime("%Y-%m"))
            
            # Get usage data for each month
            monthly_usage = []
            for month in month_strings:
                usage = self.subscription_usage_repo.get_by_month(db, client_id, month)
                if usage:
                    monthly_usage.append({
                        "month": month,
                        "messages_used": usage.messages_used,
                        "messages_limit": usage.messages_limit,
                        "active_users": usage.active_users,
                        "active_users_limit": usage.active_users_limit,
                        "storage_used_bytes": usage.storage_used_bytes,
                        "storage_limit_bytes": usage.storage_limit_bytes
                    })
            
            # Get subscription details
            from app.repositories.client_repository import SubscriptionRepository
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client_id)
            
            subscription_details = None
            if subscription:
                subscription_details = {
                    "id": subscription.id,
                    "plan_type": subscription.plan_type,
                    "status": subscription.status,
                    "message_limit": subscription.message_limit,
                    "user_limit": subscription.user_limit,
                    "starts_at": subscription.starts_at.isoformat() if subscription.starts_at else None,
                    "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None
                }
            
            # Get current month's usage
            current = self.subscription_usage_repo.get_current_month(db, client_id)
            current_usage = None
            if current:
                messages_percent = (current.messages_used / current.messages_limit * 100) if current.messages_limit else 0
                users_percent = (current.active_users / current.active_users_limit * 100) if current.active_users_limit else 0
                storage_percent = (current.storage_used_bytes / current.storage_limit_bytes * 100) if current.storage_limit_bytes else 0
                
                current_usage = {
                    "messages": {
                        "used": current.messages_used,
                        "limit": current.messages_limit,
                        "percentage": messages_percent
                    },
                    "users": {
                        "used": current.active_users,
                        "limit": current.active_users_limit,
                        "percentage": users_percent
                    },
                    "storage": {
                        "used_bytes": current.storage_used_bytes,
                        "limit_bytes": current.storage_limit_bytes,
                        "percentage": storage_percent,
                        "used_mb": round(current.storage_used_bytes / (1024 * 1024), 2) if current.storage_used_bytes else 0,
                        "limit_mb": round(current.storage_limit_bytes / (1024 * 1024), 2) if current.storage_limit_bytes else 0
                    }
                }
            
            # Build report
            report = {
                "current": current_usage,
                "historical": monthly_usage,
                "subscription": subscription_details,
                "time_period": {
                    "months": months
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating subscription usage report: {str(e)}")
            return {
                "error": "Failed to generate subscription usage report",
                "details": str(e)
            }
    
    def get_api_usage_report(self, db: Session, client_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Generate API usage report.
        
        Args:
            db: Database session
            client_id: Client ID
            days: Number of days to include in report
            
        Returns:
            Dictionary with API usage report data
        """
        try:
            # Get stats for endpoints
            endpoint_stats = self.api_log_repo.get_endpoint_stats(db, client_id, days)
            
            # Get date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get daily usage breakdown
            from sqlalchemy import func
            from app.domain.analytics.entities import ApiUsageLog
            
            daily_usage = db.query(
                func.strftime('%Y-%m-%d', ApiUsageLog.timestamp).label('date'),
                func.count(ApiUsageLog.id).label('count'),
                func.avg(ApiUsageLog.response_time_ms).label('avg_response_time')
            ).filter(
                ApiUsageLog.client_id == client_id,
                ApiUsageLog.timestamp >= start_date,
                ApiUsageLog.timestamp <= end_date
            ).group_by(
                func.strftime('%Y-%m-%d', ApiUsageLog.timestamp)
            ).order_by(
                func.strftime('%Y-%m-%d', ApiUsageLog.timestamp)
            ).all()
            
            # Format daily usage
            daily_usage_data = [{
                "date": day.date,
                "request_count": day.count,
                "avg_response_time_ms": round(day.avg_response_time, 2) if day.avg_response_time else None
            } for day in daily_usage]
            
            # Get top user agents
            user_agents = db.query(
                ApiUsageLog.user_agent,
                func.count(ApiUsageLog.id).label('count')
            ).filter(
                ApiUsageLog.client_id == client_id,
                ApiUsageLog.timestamp >= start_date,
                ApiUsageLog.timestamp <= end_date,
                ApiUsageLog.user_agent.isnot(None)
            ).group_by(
                ApiUsageLog.user_agent
            ).order_by(
                desc(func.count(ApiUsageLog.id))
            ).limit(5).all()
            
            user_agent_data = [{
                "user_agent": agent.user_agent,
                "count": agent.count
            } for agent in user_agents]
            
            # Get method breakdown
            methods = db.query(
                ApiUsageLog.method,
                func.count(ApiUsageLog.id).label('count')
            ).filter(
                ApiUsageLog.client_id == client_id,
                ApiUsageLog.timestamp >= start_date,
                ApiUsageLog.timestamp <= end_date
            ).group_by(
                ApiUsageLog.method
            ).order_by(
                desc(func.count(ApiUsageLog.id))
            ).all()
            
            method_data = [{
                "method": method.method,
                "count": method.count
            } for method in methods]
            
            # Build report
            report = {
                "endpoint_stats": endpoint_stats,
                "daily_usage": daily_usage_data,
                "user_agents": user_agent_data,
                "methods": method_data,
                "time_period": {
                    "start_date": start_date.strftime("%Y-%m-%d"),
                    "end_date": end_date.strftime("%Y-%m-%d"),
                    "days": days
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating API usage report: {str(e)}")
            return {
                "error": "Failed to generate API usage report",
                "details": str(e)
            }