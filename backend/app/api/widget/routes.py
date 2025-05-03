# backend/app/api/widget/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import time

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client  # Use existing auth
from app.domain.client.entities import Client
from app.services.chat.chat_service import ChatService
from app.services.knowledge.similarity_service import SimilarityService
from app.services.llm.deepseek_service import DeepSeekService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager
from app.core import logger

router = APIRouter()

@router.get("/settings")
async def get_widget_settings(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get widget settings for the current client."""
    if not current_client or not current_client.settings:
        # Return default settings if client has no settings
        return {
            "primary_color": "#4f46e5",
            "chatbot_name": "AI Assistant",
            "widget_position": "bottom-right",
            "enable_suggestions": True,
            "enable_typing_indicator": True,
            "greeting_message": "Hello! How can I help you today?"
        }
    
    # Return client's settings
    settings = current_client.settings
    return {
        "primary_color": settings.primary_color,
        "logo_url": settings.logo_url,
        "chatbot_name": settings.chatbot_name,
        "greeting_message": settings.greeting_message,
        "enable_suggestions": settings.enable_suggestions,
        "enable_typing_indicator": settings.enable_typing_indicator,
        "widget_position": settings.widget_position
    }

@router.post("/message")
async def widget_send_message(
    message_data: Dict[str, Any],
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Widget endpoint for sending a message to the chatbot."""
    if "message" not in message_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field is required"
        )
    
    # Extract data from request
    user_message = message_data["message"]
    session_id = message_data.get("session_id")
    
    # Collect user info for analytics
    user_info = {
        "user_id": message_data.get("user_id"),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "referrer": request.headers.get("referer"),
    }
    
    # Initialize services (similar to the chatbot endpoint)
    llm_service = DeepSeekService()
    similarity_service = SimilarityService(llm_service)
    industry_factory = IndustryFactory()
    context_manager = ContextManager()
    
    # Create chat service
    chat_service = ChatService(
        db=db,
        similarity_service=similarity_service,
        llm_service=llm_service,
        industry_factory=industry_factory,
        context_manager=context_manager,
    )
    
    try:
        # Process message
        response = await chat_service.process_message(
            client_id=current_client.client_id,
            session_id=session_id,
            user_message=user_message,
            user_info=user_info
        )
        
        return response
    except Exception as e:
        logger.error(f"Error processing widget message: {str(e)}")
        return {
            "message": {
                "content": "I'm sorry, I encountered an error while processing your request. Please try again later.",
                "role": "assistant",
                "id": f"error-{int(time.time())}",
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            },
            "session_id": session_id,
            "error": str(e)
        }
@router.get("/settings")
async def get_chatbot_settings(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get chatbot settings for the current client."""
    if not current_client or not current_client.settings:
        # Return default settings if client has no settings
        return {
            "primary_color": "#4f46e5",
            "chatbot_name": "AI Assistant",
            "widget_position": "bottom-right",
            "enable_suggestions": True,
            "enable_typing_indicator": True,
            "greeting_message": "Hello! How can I help you today?"
        }
    
    # Return client's settings
    settings = current_client.settings
    return {
        "primary_color": settings.primary_color,
        "logo_url": settings.logo_url,
        "chatbot_name": settings.chatbot_name,
        "greeting_message": settings.greeting_message,
        "enable_suggestions": settings.enable_suggestions,
        "enable_typing_indicator": settings.enable_typing_indicator,
        "widget_position": settings.widget_position
    }        