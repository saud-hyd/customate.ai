# backend/app/repositories/analytics_repository.py
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
import logging

from app.repositories.base_repository import BaseRepository
from app.domain.analytics.entities import (
    ApiUsageLog, ChatMetrics, KnowledgeMetrics, 
    SubscriptionUsage, DailyStats, StorageUsage
)

class ApiUsageLogRepository(BaseRepository[ApiUsageLog, dict, dict]):
    """Repository for ApiUsageLog entity."""
    
    def __init__(self):
        super().__init__(ApiUsageLog)
    
    def get_by_client_id(self, db: Session, client_id: str, 
                         limit: int = 100, skip: int = 0) -> List[ApiUsageLog]:
        """Get API usage logs for a specific client."""
        return db.query(self.model)\
            .filter(self.model.client_id == client_id)\
            .order_by(desc(self.model.timestamp))\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    def get_by_date_range(self, db: Session, client_id: str, 
                           start_date: datetime, end_date: datetime) -> List[ApiUsageLog]:
        """Get API usage logs for a specific client within a date range."""
        return db.query(self.model)\
            .filter(
                self.model.client_id == client_id,
                self.model.timestamp >= start_date,
                self.model.timestamp <= end_date
            )\
            .order_by(desc(self.model.timestamp))\
            .all()
    
    def get_endpoint_stats(self, db: Session, client_id: str, 
                           days: int = 30) -> Dict[str, Any]:
        """Get endpoint usage statistics for a client."""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get count by endpoint
        endpoint_counts = db.query(
            self.model.endpoint,
            func.count(self.model.id).label('count'),
            func.avg(self.model.response_time_ms).label('avg_response_time')
        ).filter(
            self.model.client_id == client_id,
            self.model.timestamp >= cutoff_date
        ).group_by(
            self.model.endpoint
        ).all()
        
        # Get status code distribution
        status_counts = db.query(
            self.model.status_code,
            func.count(self.model.id).label('count')
        ).filter(
            self.model.client_id == client_id,
            self.model.timestamp >= cutoff_date
        ).group_by(
            self.model.status_code
        ).all()
        
        return {
            "endpoints": [{
                "endpoint": endpoint,
                "count": count,
                "avg_response_time_ms": round(avg_time, 2) if avg_time else None
            } for endpoint, count, avg_time in endpoint_counts],
            "status_codes": [{
                "status_code": status_code,
                "count": count
            } for status_code, count in status_counts]
        }

class ChatMetricsRepository(BaseRepository[ChatMetrics, dict, dict]):
    """Repository for ChatMetrics entity."""
    
    def __init__(self):
        super().__init__(ChatMetrics)
    
    def get_by_client_id(self, db: Session, client_id: str, 
                          limit: int = 100) -> List[ChatMetrics]:
        """Get chat metrics for a specific client."""
        return db.query(self.model)\
            .filter(self.model.client_id == client_id)\
            .order_by(desc(self.model.timestamp))\
            .limit(limit)\
            .all()
    
    def get_by_date(self, db: Session, client_id: str, date: str) -> Optional[ChatMetrics]:
        """Get chat metrics for a specific date."""
        return db.query(self.model)\
            .filter(
                self.model.client_id == client_id,
                self.model.date == date
            )\
            .first()
    
    def get_date_range_metrics(self, db: Session, client_id: str, 
                                start_date: str, end_date: str) -> List[ChatMetrics]:
        """Get chat metrics for a date range."""
        return db.query(self.model)\
            .filter(
                self.model.client_id == client_id,
                self.model.date >= start_date,
                self.model.date <= end_date
            )\
            .order_by(self.model.date)\
            .all()
    
    def update_or_create(self, db: Session, client_id: str, 
                          date: str, **metrics) -> ChatMetrics:
        """Update metrics for a specific date or create if not exists."""
        existing = self.get_by_date(db, client_id, date)
        
        if existing:
            for key, value in metrics.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_metrics = self.model(
                client_id=client_id,
                date=date,
                **metrics
            )
            db.add(new_metrics)
            db.commit()
            db.refresh(new_metrics)
            return new_metrics

class KnowledgeMetricsRepository(BaseRepository[KnowledgeMetrics, dict, dict]):
    """Repository for KnowledgeMetrics entity."""
    
    def __init__(self):
        super().__init__(KnowledgeMetrics)
    
    def get_by_client_id(self, db: Session, client_id: str, 
                          limit: int = 100) -> List[KnowledgeMetrics]:
        """Get knowledge metrics for a specific client."""
        return db.query(self.model)\
            .filter(self.model.client_id == client_id)\
            .order_by(desc(self.model.timestamp))\
            .limit(limit)\
            .all()
    
    def get_by_date(self, db: Session, client_id: str, date: str, 
                     collection_id: Optional[str] = None) -> Optional[KnowledgeMetrics]:
        """Get knowledge metrics for a specific date."""
        query = db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.date == date
        )
        
        if collection_id:
            query = query.filter(self.model.collection_id == collection_id)
        
        return query.first()
    
    def get_collection_metrics(self, db: Session, client_id: str, 
                                collection_id: str, 
                                days: int = 30) -> List[KnowledgeMetrics]:
        """Get metrics for a specific collection over time."""
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        return db.query(self.model)\
            .filter(
                self.model.client_id == client_id,
                self.model.collection_id == collection_id,
                self.model.date >= start_date
            )\
            .order_by(self.model.date)\
            .all()
    
    def update_or_create(self, db: Session, client_id: str, date: str, 
                          collection_id: Optional[str] = None, 
                          **metrics) -> KnowledgeMetrics:
        """Update metrics for a specific date or create if not exists."""
        existing = self.get_by_date(db, client_id, date, collection_id)
        
        if existing:
            for key, value in metrics.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_metrics = self.model(
                client_id=client_id,
                date=date,
                collection_id=collection_id,
                **metrics
            )
            db.add(new_metrics)
            db.commit()
            db.refresh(new_metrics)
            return new_metrics

class SubscriptionUsageRepository(BaseRepository[SubscriptionUsage, dict, dict]):
    """Repository for SubscriptionUsage entity."""
    
    def __init__(self):
        super().__init__(SubscriptionUsage)
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[SubscriptionUsage]:
        """Get subscription usage for a specific client."""
        return db.query(self.model)\
            .filter(self.model.client_id == client_id)\
            .order_by(desc(self.model.month_year))\
            .all()
    
    def get_by_month(self, db: Session, client_id: str, 
                      month_year: str) -> Optional[SubscriptionUsage]:
        """Get subscription usage for a specific month."""
        return db.query(self.model)\
            .filter(
                self.model.client_id == client_id,
                self.model.month_year == month_year
            )\
            .first()
    
    def get_current_month(self, db: Session, client_id: str) -> Optional[SubscriptionUsage]:
        """Get subscription usage for the current month."""
        current_month = datetime.utcnow().strftime("%Y-%m")
        return self.get_by_month(db, client_id, current_month)
    
    def increment_usage(self, db: Session, client_id: str, 
                         field: str, increment: int = 1) -> SubscriptionUsage:
        """
        Increment a usage counter field for the current month.
        
        Fixed to ensure proper updating of usage counts.
        """
        current_month = datetime.utcnow().strftime("%Y-%m")
        usage = self.get_by_month(db, client_id, current_month)
        
        # Get subscription ID from client's active subscription
        from app.repositories.client_repository import SubscriptionRepository
        sub_repo = SubscriptionRepository()
        subscription = sub_repo.get_active_subscription(db, client_id)
        
        if not subscription:
            raise ValueError(f"No active subscription found for client {client_id}")
        
        if not usage:
            # Create new usage record
            usage_data = {
                "client_id": client_id,
                "subscription_id": subscription.id,
                "month_year": current_month,
                field: increment,
                "messages_limit": subscription.message_limit,
                "active_users_limit": subscription.user_limit,
                "storage_limit_bytes": subscription.storage_limit_bytes
            }
            usage = self.create(db, obj_in=usage_data)
        else:
            # Update existing record
            # FIXED: Make sure we get current value or default to 0, and force commit immediately
            current_value = getattr(usage, field, 0) or 0
            setattr(usage, field, current_value + increment)
            setattr(usage, "last_updated", datetime.utcnow())
            db.add(usage)
            db.commit()
            db.refresh(usage)
        
        # Force query to refresh data to ensure consistency
        return self.get_by_month(db, client_id, current_month)
    
    def update_or_create(self, db: Session, client_id: str,
                          month_year: str, **data) -> SubscriptionUsage:
        """Update or create subscription usage for a specific month."""
        usage = self.get_by_month(db, client_id, month_year)
        
        if usage:
            # Update existing record
            for key, value in data.items():
                if hasattr(usage, key):
                    setattr(usage, key, value)
            setattr(usage, "last_updated", datetime.utcnow())
            db.add(usage)
            db.commit()
            db.refresh(usage)
            return usage
        else:
            # Create new record
            from app.repositories.client_repository import SubscriptionRepository
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client_id)
            
            if not subscription:
                raise ValueError(f"No active subscription found for client {client_id}")
                
            usage_data = {
                "client_id": client_id,
                "subscription_id": subscription.id,
                "month_year": month_year,
                "messages_limit": subscription.message_limit,
                "active_users_limit": subscription.user_limit,
                "storage_limit_bytes": subscription.storage_limit_bytes,
                **data
            }
            
            usage = self.create(db, obj_in=usage_data)
            return usage
    
    # Method needed by admin dashboard
    def get_total_messages(self, db: Session) -> int:
        """Get total messages across all clients."""
        result = db.query(func.sum(self.model.messages_used)).scalar()
        return result or 0

class DailyStatsRepository(BaseRepository[DailyStats, dict, dict]):
    """Repository for DailyStats entity."""
    
    def __init__(self):
        super().__init__(DailyStats)
    
    def get_by_date(self, db: Session, client_id: str, date: str) -> Optional[DailyStats]:
        """Get daily stats for a specific date."""
        return db.query(self.model)\
            .filter(
                self.model.client_id == client_id,
                self.model.date == date
            )\
            .first()
    
    def get_date_range(self, db: Session, client_id: str, 
                        start_date: str, end_date: str) -> List[DailyStats]:
        """Get daily stats for a date range."""
        return db.query(self.model)\
            .filter(
                self.model.client_id == client_id,
                self.model.date >= start_date,
                self.model.date <= end_date
            )\
            .order_by(self.model.date)\
            .all()
    
    def update_or_create(self, db: Session, client_id: str, 
                          date: str, **stats) -> DailyStats:
        """Update stats for a specific date or create if not exists."""
        existing = self.get_by_date(db, client_id, date)
        
        if existing:
            for key, value in stats.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            
            # Special handling for metadata which should be merged
            if 'metadata' in stats and existing.metadata:
                existing.metadata = {**existing.metadata, **stats['metadata']}
            
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_stats = self.model(
                client_id=client_id,
                date=date,
                **stats
            )
            db.add(new_stats)
            db.commit()
            db.refresh(new_stats)
            return new_stats
    
    # Methods needed by admin dashboard
    def get_platform_totals(self, db: Session, date: str) -> Dict[str, Any]:
        """Get platform-wide stats for a specific date."""
        result = db.query(
            func.sum(self.model.total_sessions).label("total_sessions"),
            func.sum(self.model.total_messages).label("total_messages"),
            func.sum(self.model.total_searches).label("total_searches"),
            func.avg(self.model.average_response_time_ms).label("avg_response_time_ms")  # Changed field name
        ).filter(self.model.date == date).first()
        
        if not result:
            return {
                "total_sessions": 0,
                "total_messages": 0,
                "total_searches": 0,
                "avg_response_time_ms": 0
            }
        
        return {
            "total_sessions": result.total_sessions or 0,
            "total_messages": result.total_messages or 0,
            "total_searches": result.total_searches or 0,
            "avg_response_time_ms": result.avg_response_time_ms or 0
        }
    
    def get_date_range_totals(
        self, 
        db: Session, 
        client_id: str, 
        start_date: str, 
        end_date: str
    ) -> Dict[str, Any]:
        """Get aggregated stats for a date range."""
        result = db.query(
            func.sum(self.model.total_sessions).label("total_sessions"),
            func.sum(self.model.total_messages).label("total_messages"),
            func.sum(self.model.total_searches).label("total_searches"),
            func.avg(self.model.average_response_time_ms).label("average_response_time_ms")  # Changed field name
        ).filter(
            self.model.client_id == client_id,
            self.model.date >= start_date,
            self.model.date <= end_date
        ).first()
        
        if not result:
            return {
                "total_sessions": 0,
                "total_messages": 0,
                "total_searches": 0,
                "average_response_time_ms": 0
            }
        
        return {
            "total_sessions": result.total_sessions or 0,
            "total_messages": result.total_messages or 0,
            "total_searches": result.total_searches or 0,
            "average_response_time_ms": result.average_response_time_ms or 0
        }
    
    def get_daily_platform_totals(
        self, 
        db: Session, 
        start_date: str, 
        end_date: str
    ) -> List[Dict[str, Any]]:
        """Get daily platform-wide stats for a date range."""
        results = db.query(
            self.model.date,
            func.sum(self.model.total_sessions).label("total_sessions"),
            func.sum(self.model.total_messages).label("total_messages"),
            func.sum(self.model.total_searches).label("total_searches"),
            func.avg(self.model.average_response_time_ms).label("avg_response_time_ms")  # Changed field name
        ).filter(
            self.model.date >= start_date,
            self.model.date <= end_date
        ).group_by(self.model.date).order_by(self.model.date).all()
        
        return [
            {
                "date": result.date,
                "total_sessions": result.total_sessions or 0,
                "total_messages": result.total_messages or 0,
                "total_searches": result.total_searches or 0,
                "avg_response_time_ms": result.avg_response_time_ms or 0
            }
            for result in results
        ]
        
# Update the StorageUsageRepository class in the existing file
class StorageUsageRepository(BaseRepository[StorageUsage, dict, dict]):
    """Repository for StorageUsage entity."""
    
    def __init__(self):
        super().__init__(StorageUsage)
    
    def get_latest(self, db: Session, client_id: str) -> Optional[StorageUsage]:
        """Get the latest storage usage record for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id
        ).order_by(desc(self.model.recorded_at)).first()
    
    def get_history(self, db: Session, client_id: str, days: int = 30) -> List[StorageUsage]:
        """Get storage usage history for a client."""
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        return db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.recorded_at >= cutoff_date
        ).order_by(self.model.recorded_at).all()

# Other repository classes remain the same        