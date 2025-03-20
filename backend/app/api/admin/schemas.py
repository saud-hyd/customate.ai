# backend/app/api/admin/schemas.py
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class AdminRole(str, Enum):
    admin = "admin"
    support = "support"
    billing = "billing"
    readonly = "readonly"

class AdminUserResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: AdminRole

class ClientListResponse(BaseModel):
    client_id: str
    name: str
    email: str
    industry: str
    active: bool
    created_at: str
    plan_type: str
    plan_status: str
    usage: Optional[Dict[str, Any]] = None

class ClientSubscription(BaseModel):
    plan_type: str
    status: str
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    payment_id: Optional[str] = None

class ClientSettings(BaseModel):
    primary_color: Optional[str] = None
    logo_url: Optional[str] = None
    greeting_message: Optional[str] = None
    chatbot_name: Optional[str] = None

class ClientUsage(BaseModel):
    messages_used: int = 0
    messages_limit: int = 0
    active_users: int = 0
    active_users_limit: int = 0
    storage_used_bytes: int = 0
    storage_limit_bytes: int = 0
    percentage_used: float = 0

class ClientAnalytics(BaseModel):
    total_sessions: int = 0
    total_messages: int = 0
    total_searches: int = 0
    average_response_time_ms: float = 0

class PaymentRecord(BaseModel):
    payment_id: str
    amount: int
    currency: str
    status: str
    created: str
    invoice_id: Optional[str] = None
    description: Optional[str] = None

class ClientDetailResponse(BaseModel):
    client_id: str
    name: str
    email: str
    industry: str
    website: Optional[str] = None
    phone: Optional[str] = None
    active: bool
    created_at: str
    api_key: str
    subscription: Optional[ClientSubscription] = None
    settings: Optional[ClientSettings] = None
    usage: Optional[ClientUsage] = None
    analytics: ClientAnalytics
    payment_history: List[PaymentRecord] = []

class AdminDashboardResponse(BaseModel):
    clients: Dict[str, Any]
    revenue: Dict[str, Any]
    usage: Dict[str, Any]
    historical_data: List[Dict[str, Any]]
    last_updated: str

class PaymentOverviewResponse(BaseModel):
    revenue: Dict[str, Any]
    subscriptions: Dict[str, int]
    problem_payments: List[Dict[str, Any]]
    as_of: str

class PaymentHistoryResponse(BaseModel):
    payments: List[Dict[str, Any]]
    total: int
    filtered: int

class SystemStatsResponse(BaseModel):
    database: Dict[str, Any]
    performance: Dict[str, Any]
    storage: Dict[str, Any]
    clients: Dict[str, Any]
    timestamp: str

class NotificationRequest(BaseModel):
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    type: str = Field("admin_announcement", description="Notification type")
    client_id: Optional[str] = Field(None, description="Single client ID to notify")
    client_ids: Optional[List[str]] = Field(None, description="List of client IDs to notify")
    all_clients: bool = Field(False, description="Send to all active clients")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class RefundRequest(BaseModel):
    amount: Optional[int] = Field(None, description="Amount to refund in cents, if partial refund")
    reason: str = Field("requested_by_customer", description="Reason for refund")

class PlanChangeRequest(BaseModel):
    plan_type: str = Field(..., description="New plan type")
    prorate: bool = Field(True, description="Whether to prorate charges")