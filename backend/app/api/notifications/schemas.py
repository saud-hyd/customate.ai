from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class NotificationBase(BaseModel):
    """Base notification schema."""
    title: str
    message: str
    type: str
    notification_metadata: Optional[Dict[str, Any]] = None

class NotificationResponse(NotificationBase):
    """Response schema for a notification."""
    id: int
    notification_id: str
    client_id: str
    read: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

class NotificationsResponse(BaseModel):
    """Response schema for multiple notifications."""
    notifications: List[NotificationResponse]
    unread_count: int
    total: int

class MarkAsReadResponse(BaseModel):
    """Response schema for marking notifications as read."""
    success: bool
    count: int

class NotificationPreferenceBase(BaseModel):
    """Base notification preference schema."""
    email_limit_warnings: Optional[bool] = None
    email_subscription_updates: Optional[bool] = None
    email_system_updates: Optional[bool] = None
    inapp_limit_warnings: Optional[bool] = None
    inapp_subscription_updates: Optional[bool] = None
    inapp_system_updates: Optional[bool] = None
    push_limit_warnings: Optional[bool] = None
    push_subscription_updates: Optional[bool] = None
    push_system_updates: Optional[bool] = None
    limit_warning_threshold: Optional[int] = None
    custom_email: Optional[str] = None

class NotificationPreferenceUpdate(NotificationPreferenceBase):
    """Schema for updating notification preferences."""
    pass

class NotificationPreferenceResponse(NotificationPreferenceBase):
    """Response schema for notification preferences."""
    preference_id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class SendNotificationRequest(BaseModel):
    """Schema for sending a notification."""
    client_id: str = Field(..., description="Client ID to send notification to")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    type: str = Field(..., description="Notification type")
    notification_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    send_email: bool = Field(False, description="Whether to also send an email")

class BulkNotificationRequest(BaseModel):
    """Schema for sending notifications to multiple clients."""
    client_ids: List[str] = Field(..., description="List of client IDs to send notifications to")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    type: str = Field(..., description="Notification type")
    notification_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    send_email: bool = Field(False, description="Whether to also send emails")