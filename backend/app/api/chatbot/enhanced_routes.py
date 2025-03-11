# app/api/chatbot/enhanced_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List

from app.api.auth.dependencies import get_current_client
from app.core.database.dependencies import get_db
from app.domain.client.entities import Client
from app.services.chat.enhanced_chat_service import EnhancedChatService
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.deepseek_service import DeepSeekService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

@router.post("/message", response_model=Dict[str, Any])
async def send_message(
    message_data: Dict[str, Any],
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Send a message to the chatbot and get a response using enhanced knowledge integration."""
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
    
    # Initialize services with enhanced implementations
    llm_service = DeepSeekService()
    search_service = EnhancedSearchService(llm_service)
    industry_factory = IndustryFactory()
    context_manager = ContextManager()
    
    # Create enhanced chat service
    chat_service = EnhancedChatService(
        db=db,
        search_service=search_service,
        llm_service=llm_service,
        industry_factory=industry_factory,
        context_manager=context_manager,
    )
    
    # Process message with enhanced knowledge integration
    response = await chat_service.process_message(
        client_id=current_client.client_id,
        session_id=session_id,
        user_message=user_message,
        user_info=user_info
    )
    
    return response

@router.get("/history/{session_id}", response_model=List[Dict[str, Any]])
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get chat history for a specific session."""
    # Initialize services
    llm_service = DeepSeekService()
    search_service = EnhancedSearchService(llm_service)
    industry_factory = IndustryFactory()
    context_manager = ContextManager()
    
    # Create enhanced chat service
    chat_service = EnhancedChatService(
        db=db,
        search_service=search_service,
        llm_service=llm_service,
        industry_factory=industry_factory,
        context_manager=context_manager,
    )
    
    # Get history
    history = chat_service.get_chat_history(
        client_id=current_client.client_id,
        session_id=session_id,
        limit=limit
    )
    
    return history