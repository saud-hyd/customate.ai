# backend/app/api/analytics/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

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