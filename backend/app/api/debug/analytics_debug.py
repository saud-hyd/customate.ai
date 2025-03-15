from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.domain.analytics.entities import DailyStats, ChatMetrics, KnowledgeMetrics, SubscriptionUsage
from app.repositories.analytics_repository import DailyStatsRepository, ChatMetricsRepository, KnowledgeMetricsRepository, SubscriptionUsageRepository
from app.repositories.knowledge_repository import KnowledgeCollectionRepository
from app.core import logger

router = APIRouter(prefix="/debug", tags=["debug"])

@router.post("/inject-analytics", response_model=Dict[str, Any])
async def inject_test_analytics(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Inject test analytics data directly into the database for debugging.
    """
    try:
        client_id = current_client.client_id
        today = datetime.utcnow().strftime("%Y-%m-%d")
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        current_month = datetime.utcnow().strftime("%Y-%m")
        
        # Insert daily stats
        daily_stats_repo = DailyStatsRepository()
        
        # Today's stats
        daily_stats_repo.create(db, obj_in={
            "client_id": client_id,
            "date": today,
            "total_sessions": 5,
            "total_messages": 12,
            "total_searches": 8,
            "total_users": 3,
            "average_response_time_ms": 250.5,
            "knowledge_usage_ratio": 0.75,
            "stats_metadata": {"test_data": True}
        })
        
        # Yesterday's stats
        daily_stats_repo.create(db, obj_in={
            "client_id": client_id,
            "date": yesterday,
            "total_sessions": 3,
            "total_messages": 7,
            "total_searches": 5,
            "total_users": 2,
            "average_response_time_ms": 220.0,
            "knowledge_usage_ratio": 0.60,
            "stats_metadata": {"test_data": True}
        })
        
        # Chat metrics
        chat_metrics_repo = ChatMetricsRepository()
        chat_metrics_repo.create(db, obj_in={
            "client_id": client_id,
            "session_id": None,
            "total_messages": 12,
            "average_response_time_ms": 250.5,
            "knowledge_usage_count": 9,
            "user_satisfaction": 4.5,
            "timestamp": datetime.utcnow(),
            "date": today
        })
        
        # Get first collection or create one
        collection_repo = KnowledgeCollectionRepository()
        collections = collection_repo.get_by_client_id(db, client_id)
        
        collection_id = None
        if collections:
            collection_id = collections[0].collection_id
        else:
            # Create a test collection if none exists
            collection = collection_repo.create(db, obj_in={
                "client_id": client_id,
                "name": "Test Collection",
                "description": "Auto-created for analytics testing",
                "type": "test"
            })
            collection_id = collection.collection_id
        
        # Knowledge metrics
        knowledge_metrics_repo = KnowledgeMetricsRepository()
        knowledge_metrics_repo.create(db, obj_in={
            "client_id": client_id,
            "collection_id": collection_id,
            "search_count": 8,
            "average_relevance_score": 0.82,
            "items_count": 15,
            "document_count": 3,
            "date": today,
            "timestamp": datetime.utcnow()
        })
        
        # Subscription usage
        sub_usage_repo = SubscriptionUsageRepository()
        
        # Get subscription info
        from app.repositories.client_repository import SubscriptionRepository
        sub_repo = SubscriptionRepository()
        subscription = sub_repo.get_active_subscription(db, client_id)
        
        if subscription:
            sub_usage_repo.create(db, obj_in={
                "client_id": client_id,
                "subscription_id": subscription.id,
                "month_year": current_month,
                "messages_used": 150,
                "messages_limit": subscription.message_limit or 1000,
                "active_users": 5,
                "active_users_limit": subscription.user_limit or 10,
                "storage_used_bytes": 1024 * 1024 * 5,  # 5MB
                "storage_limit_bytes": 1024 * 1024 * 100,  # 100MB
                "last_updated": datetime.utcnow()
            })
        
        # Return success
        return {
            "success": True,
            "message": "Test analytics data injected successfully",
            "client_id": client_id,
            "date": today
        }
    
    except Exception as e:
        logger.exception(f"Error injecting test analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error injecting test analytics: {str(e)}"
        )
        
@router.get("/check-db-integrity", response_model=Dict[str, Any])
async def check_database_integrity(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Check database integrity and report any issues that might affect analytics.
    """
    try:
        client_id = current_client.client_id
        issues = []
        stats = {}
        
        # Check client
        from app.repositories.client_repository import ClientRepository
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, client_id)
        if not client:
            issues.append("Client not found in database")
        else:
            stats["client"] = {
                "id": client.id,
                "client_id": client.client_id,
                "name": client.name
            }
        
        # Check subscription
        from app.repositories.client_repository import SubscriptionRepository
        sub_repo = SubscriptionRepository()
        subscription = sub_repo.get_active_subscription(db, client_id)
        if not subscription:
            issues.append("No active subscription found")
        else:
            stats["subscription"] = {
                "id": subscription.id,
                "plan_type": subscription.plan_type,
                "status": subscription.status
            }
        
        # Check daily stats
        daily_stats_repo = DailyStatsRepository()
        today = datetime.utcnow().strftime("%Y-%m-%d")
        daily_stats = daily_stats_repo.get_by_date(db, client_id, today)
        if not daily_stats:
            issues.append("No daily stats found for today")
        else:
            stats["daily_stats"] = {
                "id": daily_stats.id,
                "client_id": daily_stats.client_id,
                "date": daily_stats.date,
                "total_messages": daily_stats.total_messages
            }
        
        # Check chat metrics
        chat_metrics_repo = ChatMetricsRepository()
        chat_metrics = chat_metrics_repo.get_by_date(db, client_id, today)
        if not chat_metrics:
            issues.append("No chat metrics found for today")
        else:
            stats["chat_metrics"] = {
                "id": chat_metrics.id,
                "client_id": chat_metrics.client_id,
                "date": chat_metrics.date,
                "total_messages": chat_metrics.total_messages
            }
        
        # Check knowledge metrics
        knowledge_metrics_repo = KnowledgeMetricsRepository()
        knowledge_metrics = db.query(KnowledgeMetrics).filter(
            KnowledgeMetrics.client_id == client_id
        ).all()
        if not knowledge_metrics:
            issues.append("No knowledge metrics found")
        else:
            stats["knowledge_metrics"] = {
                "count": len(knowledge_metrics),
                "first_record": {
                    "id": knowledge_metrics[0].id,
                    "client_id": knowledge_metrics[0].client_id,
                    "date": knowledge_metrics[0].date
                } if knowledge_metrics else None
            }
        
        # Check subscription usage
        sub_usage_repo = SubscriptionUsageRepository()
        current_month = datetime.utcnow().strftime("%Y-%m")
        usage = sub_usage_repo.get_by_month(db, client_id, current_month)
        if not usage:
            issues.append("No subscription usage found for current month")
        else:
            stats["subscription_usage"] = {
                "id": usage.id,
                "client_id": usage.client_id,
                "month_year": usage.month_year,
                "messages_used": usage.messages_used
            }
        
        # Check raw counts in tables
        from sqlalchemy import func
        
        raw_counts = {
            "chat_sessions": db.query(func.count()).filter_by(client_id=client_id).select_from(db.query(db.table("chat_sessions")).filter_by(client_id=client_id).subquery()).scalar() or 0,
            "chat_messages": db.query(func.count()).filter_by(client_id=client_id).select_from(db.query(db.table("chat_messages")).filter_by(client_id=client_id).subquery()).scalar() or 0,
            "knowledge_collections": db.query(func.count()).filter_by(client_id=client_id).select_from(db.query(db.table("knowledge_collections")).filter_by(client_id=client_id).subquery()).scalar() or 0,
            "knowledge_items": db.query(func.count()).select_from(db.query(db.table("knowledge_items")).join(db.table("knowledge_collections"), db.table("knowledge_items").c.collection_id == db.table("knowledge_collections").c.collection_id).filter(db.table("knowledge_collections").c.client_id == client_id).subquery()).scalar() or 0,
        }
        
        stats["raw_counts"] = raw_counts
        
        return {
            "client_id": client_id,
            "issues": issues,
            "stats": stats,
            "raw_sql_check": "Check database directly if needed"
        }
    
    except Exception as e:
        logger.exception(f"Error checking database integrity: {str(e)}")
        return {
            "error": str(e),
            "message": "Error checking database integrity"
        }        