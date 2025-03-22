from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientSettingsRepository

router = APIRouter(prefix="/widget", tags=["widget"])

@router.get("/settings", response_model=Dict[str, Any])
async def get_widget_settings(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, current_client.client_id)
    
    if not settings:
        # Create default settings if they don't exist
        settings = settings_repo.create(db, obj_in={"client_id": current_client.client_id})
    
    custom_settings = settings.custom_settings or {}
    
    return {
        "primary_color": settings.primary_color,
        "logo_url": settings.logo_url,
        "greeting_message": settings.greeting_message,
        "enable_suggestions": settings.enable_suggestions,
        "enable_typing_indicator": settings.enable_typing_indicator,
        "widget_position": settings.widget_position,
        "chatbot_name": settings.chatbot_name,
        "llm_provider": custom_settings.get("llm_provider", "deepseek"),
        "llm_model": custom_settings.get("llm_model"),
        # Return the full custom settings
        "custom_settings": custom_settings
    }
    
@router.put("/settings", response_model=Dict[str, Any])
async def update_widget_settings(
    settings_data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Update widget settings for the current client."""
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, current_client.client_id)
    
    # Map incoming settings to database fields
    db_settings = {
        "primary_color": settings_data.get("primary_color", "#4f46e5"),
        "chatbot_name": settings_data.get("chatbot_name", "AI Assistant"),
        "widget_position": settings_data.get("widget_position", "bottom-right"),
        "enable_typing_indicator": settings_data.get("show_typing_indicator", True),
        "enable_suggestions": settings_data.get("enable_suggestions", True),
        "greeting_message": settings_data.get("greeting_message"),
        # Add the custom settings to be saved in the database
        "custom_settings": settings_data.get("custom_settings", {}),
    }
    
    if not settings:
        # Create settings if they don't exist
        db_settings["client_id"] = current_client.client_id
        settings = settings_repo.create(db, obj_in=db_settings)
    else:
        # Update existing settings
        settings = settings_repo.update(db, db_obj=settings, obj_in=db_settings)
    
    # Return the complete updated settings
    return {
        "message": "Widget settings updated successfully",
        "settings": {
            "primary_color": settings.primary_color,
            "chatbot_name": settings.chatbot_name,
            "widget_position": settings.widget_position,
            "show_typing_indicator": settings.enable_typing_indicator,
            "enable_suggestions": settings.enable_suggestions,
            "greeting_message": settings.greeting_message,
            # Include custom settings in the response
            "custom_settings": settings.custom_settings
        }
    }