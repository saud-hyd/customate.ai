from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.repositories.client_repository import ClientRepository, ClientSettingsRepository
from app.domain.client.entities import Client, ClientSettings

router = APIRouter(prefix="/client", tags=["client"])

@router.get("", response_model=Dict[str, Any])
async def get_client_info(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get information about the current client."""
    client_repo = ClientRepository()
    client = client_repo.get_by_client_id(db, current_client.client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get client settings
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, client.client_id)
    
    return {
        "client_id": client.client_id,
        "name": client.name,
        "industry": client.industry,
        "email": client.email,
        "website": client.website,
        "phone": client.phone,
        "api_key": client.api_key,
        "active": client.active,
        "created_at": client.created_at.isoformat(),
        "settings": {
            "primary_color": settings.primary_color if settings else "#4f46e5",
            "logo_url": settings.logo_url if settings else None,
            "greeting_message": settings.greeting_message if settings else None,
            "enable_suggestions": settings.enable_suggestions if settings else True,
            "enable_typing_indicator": settings.enable_typing_indicator if settings else True,
            "widget_position": settings.widget_position if settings else "bottom-right",
            "chatbot_name": settings.chatbot_name if settings else "AI Assistant",
        }
    }

@router.put("/settings", response_model=Dict[str, Any])
async def update_client_settings(
    settings_data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Update client settings."""
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, current_client.client_id)
    
    if not settings:
        # Create settings if they don't exist
        settings = settings_repo.create(db, obj_in={"client_id": current_client.client_id})
    
    # Update settings
    updated_settings = settings_repo.update(db, db_obj=settings, obj_in=settings_data)
    
    return {
        "message": "Settings updated successfully",
        "settings": {
            "primary_color": updated_settings.primary_color,
            "logo_url": updated_settings.logo_url,
            "greeting_message": updated_settings.greeting_message,
            "enable_suggestions": updated_settings.enable_suggestions,
            "enable_typing_indicator": updated_settings.enable_typing_indicator,
            "widget_position": updated_settings.widget_position,
            "chatbot_name": updated_settings.chatbot_name,
        }
    }
    
@router.get("/subscription", response_model=Dict[str, Any])
async def get_client_subscription(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get current subscription information including usage from analytics."""
    try:
        # Initialize Stripe service
        from app.services.subscription.stripe_service import StripeService
        stripe_service = StripeService()
        
        # Get subscription information directly from analytics
        subscription_info = await stripe_service.get_subscription_info(current_client, db)
        
        return subscription_info
    except Exception as e:
        logger.exception(f"Error getting subscription info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve subscription information: {str(e)}"
        )    