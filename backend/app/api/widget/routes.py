from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging

from app.core.database.dependencies import get_db
from app.repositories.client_repository import ClientRepository, ClientSettingsRepository
from app.domain.client.entities import Client

logger = logging.getLogger(__name__)
router = APIRouter()

def get_widget_client(api_key: str, db: Session) -> Optional[Client]:
    """Get client by API key for widget requests."""
    try:
        client_repo = ClientRepository()
        return client_repo.get_by_api_key(db, api_key)
    except Exception as e:
        logger.error(f"Error getting widget client: {e}")
        return None

@router.get("/settings")
async def get_widget_settings(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get widget settings - simplified version."""
    try:
        # Get API key from headers or query params
        api_key = (request.headers.get("X-API-Key") or 
                  request.headers.get("x-api-key") or 
                  request.query_params.get("api_key"))
        
        if not api_key:
            return _get_default_settings()
        
        # Validate client
        client = get_widget_client(api_key, db)
        if not client:
            return _get_default_settings()
        
        # Get settings
        settings_repo = ClientSettingsRepository()
        return settings_repo.get_widget_formatted_settings(db, client.client_id)
        
    except Exception as e:
        logger.error(f"Error getting widget settings: {str(e)}")
        return _get_default_settings()

@router.put("/settings")
async def update_widget_settings(
    settings: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Update widget settings - simplified version."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Update settings
        settings_repo = ClientSettingsRepository()
        updated_settings = settings_repo.update_widget_settings(db, client.client_id, settings)
        
        return {
            "message": "Settings updated successfully",
            "settings": settings_repo.get_widget_formatted_settings(db, client.client_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating widget settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test")
async def test_widget_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """Test endpoint for widget connectivity."""
    try:
        api_key = (request.headers.get("X-API-Key") or 
                  request.query_params.get("api_key"))
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        client = get_widget_client(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        return {
            "message": "Widget API is working!",
            "status": "success",
            "client_id": client.client_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Widget test error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def _get_default_settings():
    """Get default widget settings."""
    return {
        "primary_color": "#ea580c",
        "chatbot_name": "AI Assistant",
        "widget_position": "bottom-right",
        "enable_suggestions": True,
        "show_typing_indicator": True,
        "greeting_message": "Hello! How can I help you today!",
        "llm_provider": "deepseek",
        "llm_model": "deepseek-chat"
    }