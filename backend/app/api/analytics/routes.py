# backend/app/api/analytics/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from app.domain.analytics.entities import ChatMetrics, KnowledgeMetrics
from app.repositories.analytics_repository import StorageUsageRepository, SubscriptionUsageRepository, ChatMetricsRepository, KnowledgeMetricsRepository, DailyStatsRepository

logger = logging.getLogger(__name__)

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.analytics.reporting_service import ReportingService
from app.services.analytics.usage_tracker import UsageTracker
from app.api.analytics.schemas import (
    DashboardOverviewRequest, ChatPerformanceRequest,
    KnowledgeUsageRequest, SubscriptionUsageRequest,
    ApiUsageRequest, DashboardOverviewResponse,
    ChatPerformanceResponse, KnowledgeUsageResponse,
    SubscriptionUsageResponse, ApiUsageResponse,
    ErrorResponse
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    days: int = Query(30, description="Number of days to include in report"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get dashboard overview analytics.
    
    Returns key metrics for the dashboard including today's stats,
    month-to-date comparisons, and subscription status.
    """
    reporting_service = ReportingService()
    
    # Track this API request
    usage_tracker = UsageTracker()
    usage_tracker.track_api_request(
        db=db,
        client_id=current_client.client_id,
        endpoint="/analytics/dashboard",
        method="GET",
        status_code=200,
        response_time_ms=0  # Will be updated later
    )
    
    result = reporting_service.get_dashboard_overview(db, current_client.client_id)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return result

@router.get("/chat", response_model=ChatPerformanceResponse)
async def get_chat_performance(
    days: int = Query(30, description="Number of days to include in report"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get chat performance analytics.
    
    Returns detailed chat metrics including message volumes,
    response times, knowledge usage, and time series data.
    """
    reporting_service = ReportingService()
    
    # Track this API request
    usage_tracker = UsageTracker()
    usage_tracker.track_api_request(
        db=db,
        client_id=current_client.client_id,
        endpoint="/analytics/chat",
        method="GET",
        status_code=200,
        response_time_ms=0
    )
    
    result = reporting_service.get_chat_performance_report(
        db, 
        current_client.client_id, 
        days=days
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return result

@router.get("/knowledge", response_model=KnowledgeUsageResponse)
async def get_knowledge_usage(
    days: int = Query(30, description="Number of days to include in report"),
    collection_id: Optional[str] = Query(None, description="Filter by collection ID"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get knowledge base usage analytics.
    
    Returns metrics on knowledge base usage including search volumes,
    relevance scores, and collection-specific statistics.
    """
    # Validate collection ID if provided
    if collection_id:
        from app.repositories.knowledge_repository import KnowledgeCollectionRepository
        collection_repo = KnowledgeCollectionRepository()
        collection = collection_repo.get_by_collection_id(db, collection_id)
        
        if not collection or collection.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )
    
    reporting_service = ReportingService()
    
    # Track this API request
    usage_tracker = UsageTracker()
    usage_tracker.track_api_request(
        db=db,
        client_id=current_client.client_id,
        endpoint="/analytics/knowledge",
        method="GET",
        status_code=200,
        response_time_ms=0
    )
    
    result = reporting_service.get_knowledge_usage_report(
        db, 
        current_client.client_id, 
        days=days, 
        collection_id=collection_id
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return result

# File: backend/app/api/analytics/routes.py

@router.get("/subscription", response_model=Dict[str, Any])
async def get_subscription_usage(
    months: int = Query(6, description="Number of months to include in report"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get subscription usage analytics.
    
    Returns metrics on subscription usage including message counts,
    active users, and storage usage against plan limits.
    """
    try:
        # Initialize usage tracker
        usage_tracker = UsageTracker()
        
        # Initialize subscription usage if it doesn't exist
        usage_tracker.initialize_subscription_usage(db, current_client.client_id)
        
        # Ensure storage_limit_bytes is set for the subscription
        from app.repositories.client_repository import SubscriptionRepository
        sub_repo = SubscriptionRepository()
        subscription = sub_repo.get_active_subscription(db, current_client.client_id)
        
        if subscription and not subscription.storage_limit_bytes:
            # Set default storage limit based on plan type
            if subscription.plan_type == "free":
                default_storage = 50 * 1024 * 1024  # 50 MB
            elif subscription.plan_type == "basic":
                default_storage = 500 * 1024 * 1024  # 500 MB
            elif subscription.plan_type == "professional":
                default_storage = 2 * 1024 * 1024 * 1024  # 2 GB
            else:
                default_storage = 10 * 1024 * 1024 * 1024  # 10 GB
                
            sub_repo.update(db, db_obj=subscription, obj_in={"storage_limit_bytes": default_storage})
            
        # Get usage data
        reporting_service = ReportingService()
        result = reporting_service.get_subscription_usage_report(db, current_client.client_id, months=months)
        
        # Force update of the data if we don't have current stats
        if not result.get("current"):
            # Try to manually recover usage data
            usage_tracker._update_storage_usage(db, current_client.client_id)
            usage_tracker._update_active_users(db, current_client.client_id)
            
            # Try again to get the data
            result = reporting_service.get_subscription_usage_report(db, current_client.client_id, months=months)
        
        return result
    except Exception as e:
        logger.exception(f"Error getting subscription usage: {str(e)}")
        
        # Return fallback data instead of error for better UX
        return {
            "current": {
                "messages": {"used": 0, "limit": 1000, "percentage": 0},
                "users": {"used": 0, "limit": 10, "percentage": 0},
                "storage": {"used_bytes": 0, "limit_bytes": 100 * 1024 * 1024, "percentage": 0}
            },
            "historical": [],
            "subscription": {
                "plan_type": "basic",
                "status": "active"
            }
        }
        
@router.get("/api-usage", response_model=ApiUsageResponse)
async def get_api_usage(
    days: int = Query(30, description="Number of days to include in report"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get API usage analytics.
    
    Returns metrics on API usage including endpoint statistics,
    response times, and usage patterns.
    """
    reporting_service = ReportingService()
    
    # Track this API request
    usage_tracker = UsageTracker()
    usage_tracker.track_api_request(
        db=db,
        client_id=current_client.client_id,
        endpoint="/analytics/api-usage",
        method="GET",
        status_code=200,
        response_time_ms=0
    )
    
    result = reporting_service.get_api_usage_report(
        db, 
        current_client.client_id, 
        days=days
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return result

@router.get("/subscription/limits", response_model=Dict[str, Any])
async def check_subscription_limits(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Check current subscription usage against limits.
    
    Returns detailed information about current usage versus
    subscription plan limits.
    """
    usage_tracker = UsageTracker()
    result = usage_tracker.check_subscription_limits(db, current_client.client_id)
    
    return result

@router.get("/performance", response_model=Dict[str, Any])
async def get_performance_metrics(
    days: int = Query(30, description="Number of days to include in report"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get detailed performance metrics for chatbot and search operations.
    
    Provides response times, token usage, and efficiency metrics for
    monitoring system performance.
    """
    reporting_service = ReportingService()
    
    # Track this API request
    usage_tracker = UsageTracker()
    usage_tracker.track_api_request(
        db=db,
        client_id=current_client.client_id,
        endpoint="/analytics/performance",
        method="GET",
        status_code=200,
        response_time_ms=0
    )
    
    # Calculate date range
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    try:
        # Get chat metrics for performance analysis
        chat_metrics = db.query(ChatMetrics).filter(
            ChatMetrics.client_id == current_client.client_id,
            ChatMetrics.date >= start_date,
            ChatMetrics.date <= end_date
        ).order_by(ChatMetrics.date).all()
        
        # Get knowledge metrics for search performance
        knowledge_metrics = db.query(KnowledgeMetrics).filter(
            KnowledgeMetrics.client_id == current_client.client_id,
            KnowledgeMetrics.date >= start_date,
            KnowledgeMetrics.date <= end_date
        ).order_by(KnowledgeMetrics.date).all()
        
        # Extract and aggregate performance data
        response_times = []
        token_usage = []
        search_performance = []
        
        for metric in chat_metrics:
            # Response time data
            response_times.append({
                "date": metric.date,
                "average_ms": metric.average_response_time_ms,
                "total_messages": metric.total_messages
            })
            
            # Token usage data (if available)
            if metric.stats_metadata and "total_tokens" in metric.stats_metadata:
                token_usage.append({
                    "date": metric.date,
                    "total_tokens": metric.stats_metadata.get("total_tokens", 0),
                    "prompt_tokens": metric.stats_metadata.get("prompt_tokens", 0),
                    "completion_tokens": metric.stats_metadata.get("completion_tokens", 0)
                })
        
        for metric in knowledge_metrics:
            # Search performance data
            if metric.stats_metadata:
                search_performance.append({
                    "date": metric.date,
                    "avg_response_time_ms": metric.stats_metadata.get("avg_response_time_ms", 0),
                    "vector_searches": metric.stats_metadata.get("vector_searches", 0),
                    "keyword_searches": metric.stats_metadata.get("keyword_searches", 0),
                    "hybrid_searches": metric.stats_metadata.get("hybrid_searches", 0),
                    "zero_results_searches": metric.stats_metadata.get("zero_results_searches", 0)
                })
        
        # Calculate performance summaries
        avg_response_time = sum(m.average_response_time_ms for m in chat_metrics if m.average_response_time_ms) / len([m for m in chat_metrics if m.average_response_time_ms]) if chat_metrics else None
        
        total_tokens = sum(metric.stats_metadata.get("total_tokens", 0) for metric in chat_metrics if metric.stats_metadata and "total_tokens" in metric.stats_metadata)
        
        avg_search_time = sum(metric.stats_metadata.get("avg_response_time_ms", 0) for metric in knowledge_metrics if metric.stats_metadata and "avg_response_time_ms" in metric.stats_metadata) / len([m for m in knowledge_metrics if m.stats_metadata and "avg_response_time_ms" in m.stats_metadata]) if knowledge_metrics else None
        
        return {
            "summary": {
                "avg_response_time_ms": avg_response_time,
                "total_tokens_used": total_tokens,
                "avg_search_time_ms": avg_search_time,
                "total_searches": sum(m.search_count for m in knowledge_metrics) if knowledge_metrics else 0,
                "total_messages": sum(m.total_messages for m in chat_metrics) if chat_metrics else 0
            },
            "response_times": response_times,
            "token_usage": token_usage,
            "search_performance": search_performance,
            "time_period": {
                "start_date": start_date,
                "end_date": end_date,
                "days": days
            }
        }
        
    except Exception as e:
        logger.exception(f"Error generating performance metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate performance metrics"
        )
        
@router.post("/reset", response_model=Dict[str, Any])
async def reset_analytics(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Reset and reinitialize analytics data for debugging.
    """
    usage_tracker = UsageTracker()
    
    try:
        # Initialize analytics
        usage_tracker.initialize_client_analytics(db, current_client.client_id)
        
        # Force update counts from existing data
        usage_tracker.update_knowledge_counts(db, current_client.client_id)
        usage_tracker._update_storage_usage(db, current_client.client_id)
        usage_tracker._update_active_users(db, current_client.client_id)
        usage_tracker._update_daily_stats(db, current_client.client_id)
        
        return {
            "success": True,
            "message": "Analytics data has been reset and reinitialized"
        }
    except Exception as e:
        logger.exception(f"Error resetting analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting analytics: {str(e)}"
        )

# Path: backend/app/api/analytics/routes.py
# Add this new endpoint to your existing routes.py file

@router.post("/update-usage", response_model=Dict[str, Any])
async def update_usage_data(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Manually update usage data from existing metrics.
    This endpoint helps recover from potential data inconsistencies.
    """
    try:
        usage_tracker = UsageTracker()
        
        # Initialize subscription usage if it doesn't exist
        usage_tracker.initialize_subscription_usage(db, current_client.client_id)
        
        # Update storage usage
        usage_tracker._update_storage_usage(db, current_client.client_id)
        
        # Update active users
        usage_tracker._update_active_users(db, current_client.client_id)
        
        # Get chat metrics for the current month
        from app.domain.analytics.entities import ChatMetrics
        from sqlalchemy import func
        current_month = datetime.utcnow().strftime("%Y-%m")
        month_start = f"{current_month}-01"
        
        # Calculate total messages for the current month
        total_messages = db.query(func.sum(ChatMetrics.total_messages))\
            .filter(
                ChatMetrics.client_id == current_client.client_id,
                ChatMetrics.date >= month_start
            ).scalar() or 0
        
        # Update the subscription usage with the total messages
        usage = usage_tracker.subscription_usage_repo.get_current_month(db, current_client.client_id)
        if usage:
            usage_tracker.subscription_usage_repo.update(db, db_obj=usage, obj_in={
                "messages_used": total_messages
            })
        
        return {
            "success": True,
            "message": "Usage data updated successfully"
        }
        
    except Exception as e:
        logger.exception(f"Error updating usage data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating usage data: {str(e)}"
        )
        
@router.post("/repair-subscription-data", response_model=Dict[str, Any])
async def repair_subscription_data(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Repair subscription usage data by initializing missing records.
    Only accessible by admins.
    """
    # Check if current client has admin privileges
    if current_client.email != "admin@customate.ai":  # Replace with proper admin check
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to perform this action"
        )
    
    usage_tracker = UsageTracker()
    usage_tracker.repair_subscription_data(db)
    
    return {
        "success": True,
        "message": "Subscription data repair initiated"
    }        
    
# Add this to backend/app/api/analytics/routes.py if it's not already there

@router.post("/sync-subscription-usage", response_model=Dict[str, Any])
async def sync_subscription_usage(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Manually synchronize subscription usage data with analytics metrics.
    This endpoint ensures the subscription usage is correctly updated from analytics data.
    """
    try:
        usage_tracker = UsageTracker()
        
        # Calculate total messages for the current month from chat metrics
        current_month = datetime.utcnow().strftime("%Y-%m")
        current_month_start = f"{current_month}-01"
        
        from sqlalchemy import func
        from app.domain.analytics.entities import ChatMetrics
        
        # Get total messages from chat metrics
        total_messages = db.query(func.sum(ChatMetrics.total_messages))\
            .filter(
                ChatMetrics.client_id == current_client.client_id,
                ChatMetrics.date >= current_month_start
            ).scalar() or 0
        
        # Get current subscription usage
        from app.repositories.analytics_repository import SubscriptionUsageRepository
        sub_usage_repo = SubscriptionUsageRepository()
        
        usage = sub_usage_repo.get_by_month(db, current_client.client_id, current_month)
        
        if not usage:
            # Initialize subscription usage if it doesn't exist
            usage_tracker.initialize_subscription_usage(db, current_client.client_id)
            usage = sub_usage_repo.get_by_month(db, current_client.client_id, current_month)
        
        if usage:
            # Update with accurate message count
            sub_usage_repo.update(db, db_obj=usage, obj_in={
                "messages_used": total_messages,
                "last_updated": datetime.utcnow()
            })
        
        # Update storage usage
        usage_tracker._update_storage_usage(db, current_client.client_id)
        
        # Update active users
        usage_tracker._update_active_users(db, current_client.client_id)
        
        return {
            "success": True,
            "message": "Subscription usage synchronized successfully",
            "updated_values": {
                "messages_count": total_messages
            }
        }
        
    except Exception as e:
        logging.exception(f"Error synchronizing subscription usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synchronize subscription usage: {str(e)}"
        )
        
# Add this to the existing routes.py file

@router.get("/storage", response_model=Dict[str, Any])
async def get_storage_statistics(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get detailed storage statistics including breakdown by type.
    """
    try:
        usage_tracker = UsageTracker()
        
        # Force update storage metrics to get the latest data
        usage_tracker._update_storage_usage(db, current_client.client_id)
        
        # Get the latest storage usage record
        storage_repo = StorageUsageRepository()
        storage = storage_repo.get_latest(db, current_client.client_id)
        
        if not storage:
            return {
                "total_bytes": 0,
                "document_bytes": 0, 
                "knowledge_bytes": 0,
                "crawled_content_bytes": 0,
                "percentage": 0,
                "limit_bytes": 0
            }
        
        # Get subscription to determine limit
        from app.repositories.client_repository import SubscriptionRepository
        sub_repo = SubscriptionRepository()
        subscription = sub_repo.get_active_subscription(db, current_client.client_id)
        
        # Default storage limit (50MB for free tier)
        storage_limit = 50 * 1024 * 1024
        
        if subscription:
            # Use plan-specific limit if available
            if subscription.storage_limit_bytes:
                storage_limit = subscription.storage_limit_bytes
            else:
                # Default limits based on plan type
                if subscription.plan_type == "basic":
                    storage_limit = 500 * 1024 * 1024
                elif subscription.plan_type == "professional":
                    storage_limit = 2 * 1024 * 1024 * 1024
                elif subscription.plan_type == "enterprise":
                    storage_limit = 10 * 1024 * 1024 * 1024
        
        # Calculate percentage
        percentage = min(100, (storage.total_bytes / storage_limit) * 100) if storage_limit > 0 else 0
        
        return {
            "total_bytes": storage.total_bytes,
            "document_bytes": storage.document_bytes,
            "knowledge_bytes": storage.knowledge_bytes,
            "crawled_content_bytes": storage.crawled_content_bytes,
            "percentage": percentage,
            "limit_bytes": storage_limit
        }
        
    except Exception as e:
        logger.exception(f"Error getting storage statistics: {str(e)}")
        return {
            "error": str(e),
            "total_bytes": 0,
            "document_bytes": 0,
            "knowledge_bytes": 0,
            "crawled_content_bytes": 0,
            "percentage": 0,
            "limit_bytes": 0
        }        