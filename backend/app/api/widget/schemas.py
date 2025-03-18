# backend/app/api/widget/schemas.py
from pydantic import BaseModel, Field
from typing import Optional

class WidgetConfigBase(BaseModel):
    """Base model for widget configuration."""
    primary_color: Optional[str] = Field(
        None, 
        description="Primary color for the widget", 
        example="#4f46e5"
    )
    chatbot_name: Optional[str] = Field(
        None, 
        description="Name displayed in the widget header", 
        example="AI Assistant"
    )
    greeting_message: Optional[str] = Field(
        None, 
        description="Initial greeting message", 
        example="Hello! How can I help you today?"
    )
    widget_position: Optional[str] = Field(
        None, 
        description="Position of the widget on the page", 
        example="bottom-right"
    )
    show_typing_indicator: Optional[bool] = Field(
        None, 
        description="Whether to show typing indicator"
    )
    enable_suggestions: Optional[bool] = Field(
        None, 
        description="Whether to enable suggested responses"
    )

class WidgetConfigCreate(WidgetConfigBase):
    """Schema for creating a complete widget configuration."""
    pass

class WidgetConfigUpdate(WidgetConfigBase):
    """Schema for updating specific widget configuration settings."""
    pass

class WidgetConfigResponse(WidgetConfigBase):
    """Schema for widget configuration response."""
    class Config:
        orm_mode = True