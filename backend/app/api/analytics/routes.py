# backend/app/api/analytics/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from app.domain.analytics.entities import ChatMetrics, KnowledgeMetrics

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

@router.get("/subscription", response_model=SubscriptionUsageResponse)
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
    reporting_service = ReportingService()
    
    # Track this API request
    usage_tracker = UsageTracker()
    usage_tracker.track_api_request(
        db=db,
        client_id=current_client.client_id,
        endpoint="/analytics/subscription",
        method="GET",
        status_code=200,
        response_time_ms=0
    )
    
    result = reporting_service.get_subscription_usage_report(
        db, 
        current_client.client_id, 
        months=months
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return result

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