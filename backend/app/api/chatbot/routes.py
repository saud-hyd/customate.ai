from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import time
import traceback

from app.api.auth.dependencies import get_current_client
from app.core.database.dependencies import get_db
from app.domain.client.entities import Client
from app.services.chat.chat_service import ChatService
from app.services.knowledge.similarity_service import SimilarityService
from app.services.llm.deepseek_service import DeepSeekService
from app.services.llm.claude_service import ClaudeService
from app.services.llm.openai_service import OpenAIService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager
from app.services.analytics.usage_tracker import UsageTracker
from app.services.llm.llm_factory import LLMFactory
from app.core import logger

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

@router.post("/message", response_model=Dict[str, Any])
async def send_message(
    message_data: Dict[str, Any],
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Send a message to the chatbot and get a response."""
    start_time = time.time()
    
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
    
    # Use LLM Factory to get the correct LLM service
    llm_service = LLMFactory.create_llm_service(
        db, 
        current_client.client_id,
        message_data.get("llm_settings")  # Pass any override settings from request
    )
    
    # Initialize other services
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
    
    # Process message
    response = await chat_service.process_message(
        client_id=current_client.client_id,
        session_id=session_id,
        user_message=user_message,
        user_info=user_info
    )
    
    # Fixed tracking code
    usage_tracker = UsageTracker()
    try:
        # Pass the actual session_id from the response
        usage_tracker.track_chat_interaction(
            db=db,
            client_id=current_client.client_id,
            session_id=response.get("session_id", session_id),
            response_time_ms=int((time.time() - start_time) * 1000),
            used_knowledge=response.get("knowledge_used", False)  # Boolean value
        )
        
        # Also update daily stats explicitly to ensure they're calculated
        usage_tracker._update_daily_stats(db, current_client.client_id)
        
        logger.info(f"Successfully tracked chat interaction for client {current_client.client_id}")
    except Exception as e:
        logger.error(f"Error tracking chat interaction: {str(e)}", exc_info=True)
    
    return response

@router.get("/history/{session_id}", response_model=List[Dict[str, Any]])
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get chat history for a specific session."""
    # Use LLM Factory to get the correct LLM service
    llm_service = LLMFactory.create_llm_service(db, current_client.client_id)
    
    # Initialize other services
    similarity_service = SimilarityService(llm_service)
    industry_factory = IndustryFactory()
    context_manager = ContextManager()
    
    chat_service = ChatService(
        db=db,
        similarity_service=similarity_service,
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

@router.get("/test-llm/{provider}")
async def test_llm_directly(provider: str):
    """Test LLM provider directly with a simple prompt"""
    try:
        if provider == "claude":
            service = ClaudeService()
            response = await service.generate_response(
                user_message="Hello, can you say 'Testing Claude API' and nothing else?",
                conversation_history=[]
            )
            return {"success": True, "response": response}
        
        elif provider == "openai":
            service = OpenAIService()
            response = await service.generate_response(
                user_message="Hello, can you say 'Testing OpenAI API' and nothing else?",
                conversation_history=[]
            )
            return {"success": True, "response": response}
        
        elif provider == "deepseek":
            service = DeepSeekService()
            response = await service.generate_response(
                user_message="Hello, can you say 'Testing DeepSeek API' and nothing else?",
                conversation_history=[]
            )
            return {"success": True, "response": response}
        
        else:
            return {"success": False, "error": "Invalid provider"}
    
    except Exception as e:
        logger.exception(f"Error testing {provider}: {str(e)}")
        return {
            "success": False, 
            "error": str(e),
            "traceback": traceback.format_exc()
        }