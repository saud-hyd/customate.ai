# backend/app/api/analytics/schemas.py
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# Base schemas
class TimeRange(BaseModel):
    """Time range parameters for analytics requests."""
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    days: Optional[int] = Field(30, description="Number of days to include")


class DateValue(BaseModel):
    """Date and value pair for time series data."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    value: float = Field(..., description="Value for the date")


# Request schemas
class DashboardOverviewRequest(BaseModel):
    """Request parameters for dashboard overview."""
    days: Optional[int] = Field(30, description="Number of days to include in the report")


class ChatPerformanceRequest(BaseModel):
    """Request parameters for chat performance report."""
    days: Optional[int] = Field(30, description="Number of days to include in the report")
    include_sessions: Optional[bool] = Field(True, description="Include session data")
    include_messages: Optional[bool] = Field(True, description="Include message data")


class KnowledgeUsageRequest(BaseModel):
    """Request parameters for knowledge usage report."""
    days: Optional[int] = Field(30, description="Number of days to include in the report")
    collection_id: Optional[str] = Field(None, description="Filter by collection ID")


class SubscriptionUsageRequest(BaseModel):
    """Request parameters for subscription usage report."""
    months: Optional[int] = Field(6, description="Number of months to include in the report")


class ApiUsageRequest(BaseModel):
    """Request parameters for API usage report."""
    days: Optional[int] = Field(30, description="Number of days to include in the report")
    endpoint: Optional[str] = Field(None, description="Filter by endpoint")


# Response schemas
# Update the DailyStats class in schemas.py
class DailyStats(BaseModel):
    """Daily statistics for dashboard."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    total_sessions: int = Field(..., description="Total number of chat sessions")
    total_messages: int = Field(..., description="Total number of messages")
    total_searches: int = Field(..., description="Total number of knowledge searches")
    total_users: int = Field(..., description="Total number of unique users")
    average_response_time_ms: Optional[float] = Field(None, description="Average response time in milliseconds")
    knowledge_usage_ratio: Optional[float] = Field(None, description="Ratio of responses using knowledge base")
    stats_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional statistics metadata")
    

class DashboardOverviewResponse(BaseModel):
    """Response schema for dashboard overview."""
    today: Dict[str, Any] = Field(..., description="Today's statistics")
    changes: Dict[str, float] = Field(..., description="Day over day changes in percentages")
    monthly: Dict[str, Any] = Field(..., description="Monthly aggregated statistics")
    subscription: Dict[str, Any] = Field(..., description="Subscription status and limits")
    time_period: Dict[str, Any] = Field(..., description="Time period for the report")


class ChatPerformanceResponse(BaseModel):
    """Response schema for chat performance report."""
    summary: Dict[str, Any] = Field(..., description="Summary statistics")
    time_series: List[Dict[str, Any]] = Field(..., description="Time series data for visualization")
    time_period: Dict[str, Any] = Field(..., description="Time period for the report")


class KnowledgeUsageResponse(BaseModel):
    """Response schema for knowledge usage report."""
    summary: Dict[str, Any] = Field(..., description="Summary statistics")
    time_series: List[Dict[str, Any]] = Field(..., description="Time series data for visualization")
    collection_distribution: Optional[List[Dict[str, Any]]] = Field(None, description="Distribution across collections")
    collection: Optional[Dict[str, Any]] = Field(None, description="Collection details if filtered by collection")
    time_period: Dict[str, Any] = Field(..., description="Time period for the report")


class SubscriptionUsageResponse(BaseModel):
    """Response schema for subscription usage report."""
    current: Optional[Dict[str, Any]] = Field(None, description="Current month usage")
    historical: List[Dict[str, Any]] = Field(..., description="Historical monthly usage")
    subscription: Optional[Dict[str, Any]] = Field(None, description="Subscription details")
    time_period: Dict[str, Any] = Field(..., description="Time period for the report")


class ApiUsageResponse(BaseModel):
    """Response schema for API usage report."""
    endpoint_stats: Dict[str, Any] = Field(..., description="Endpoint usage statistics")
    daily_usage: List[Dict[str, Any]] = Field(..., description="Daily usage data")
    user_agents: List[Dict[str, Any]] = Field(..., description="Top user agents")
    methods: List[Dict[str, Any]] = Field(..., description="HTTP method breakdown")
    time_period: Dict[str, Any] = Field(..., description="Time period for the report")


# Error response schema
class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Error details")