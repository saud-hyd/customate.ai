from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum

# Subscription schemas
class PlanType(str, Enum):
    free = "free"
    basic = "basic"
    professional = "professional"
    enterprise = "enterprise"

class SubscriptionStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    trial = "trial"
    past_due = "past_due"
    cancelled = "cancelled"
    pending_cancellation = "pending_cancellation"

class BillingCycle(str, Enum):
    monthly = "monthly"
    annually = "annually"

class CardDetails(BaseModel):
    brand: str
    last4: str
    exp_month: int
    exp_year: int

class PlanChangeRequest(BaseModel):
    plan_type: PlanType
    proration_behavior: Optional[str] = "create_prorations"  # or "none" to avoid proration

class SubscriptionCancelRequest(BaseModel):
    cancel_immediately: bool = False

class SubscriptionResponse(BaseModel):
    subscription_id: Optional[int] = None
    stripe_subscription_id: Optional[str] = None
    plan_type: str
    status: str
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None
    canceled_at: Optional[str] = None
    limits: Dict[str, Any]
    
    class Config:
        orm_mode = True

class CheckoutSessionRequest(BaseModel):
    plan_type: PlanType
    success_url: str
    cancel_url: str

class BillingPortalRequest(BaseModel):
    return_url: str

# Payment method schemas
class PaymentMethodRequest(BaseModel):
    payment_method_id: str
    set_as_default: bool = True

class BillingDetails(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, str]] = None

class PaymentMethodResponse(BaseModel):
    id: str
    type: str
    card: CardDetails
    billing_details: BillingDetails
    created: str
    is_default: bool = False

# Invoice schemas
class InvoiceResponse(BaseModel):
    id: str
    number: str
    amount_due: float
    amount_paid: float
    currency: str
    status: str
    created: str
    period_start: str
    period_end: str
    pdf_url: Optional[str] = None

# Usage and limits schemas
class LimitInfo(BaseModel):
    used: int
    limit: int
    percentage: float

class UsageLimitsResponse(BaseModel):
    current: Dict[str, LimitInfo]
    
    class Config:
        orm_mode = True

class PlanFeatures(BaseModel):
    message_limit: int
    user_limit: int
    storage_limit_mb: float
    collections_limit: int
    features: List[str]

class RecommendedPlanResponse(BaseModel):
    current_plan: str
    recommended_plan: str
    recommendation_reason: str
    current_limits: Dict[str, Any]
    recommended_limits: Dict[str, Any]
    usage_data: Dict[str, Any]
    
    class Config:
        orm_mode = True

# Client schemas
class ClientUpdateRequest(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None

class ClientSettingsUpdateRequest(BaseModel):
    primary_color: Optional[str] = None
    logo_url: Optional[str] = None
    greeting_message: Optional[str] = None
    enable_suggestions: Optional[bool] = None
    enable_typing_indicator: Optional[bool] = None
    widget_position: Optional[str] = None
    fallback_email: Optional[str] = None
    chatbot_name: Optional[str] = None
    custom_settings: Optional[Dict[str, Any]] = None

class ClientResponse(BaseModel):
    client_id: str
    name: str
    industry: str
    email: str
    website: Optional[str] = None
    phone: Optional[str] = None
    api_key: str
    active: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

class ClientSettingsResponse(BaseModel):
    client_id: str
    primary_color: str
    logo_url: Optional[str] = None
    greeting_message: Optional[str] = None
    enable_suggestions: bool
    enable_typing_indicator: bool
    widget_position: str
    fallback_email: Optional[str] = None
    chatbot_name: str
    custom_settings: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True

# API key schemas
class ApiKeyResponse(BaseModel):
    api_key: str
    
    class Config:
        orm_mode = True

class ApiKeyRegenerateRequest(BaseModel):
    confirm: bool = Field(..., description="Confirmation to regenerate API key")

# Widget schemas
class WidgetSettingsResponse(BaseModel):
    primary_color: str
    logo_url: Optional[str] = None
    greeting_message: Optional[str] = None
    enable_suggestions: bool
    enable_typing_indicator: bool
    widget_position: str
    chatbot_name: str
    
    class Config:
        orm_mode = True

class EmbedCodeResponse(BaseModel):
    html_code: str
    script_url: str
    
    class Config:
        orm_mode = True