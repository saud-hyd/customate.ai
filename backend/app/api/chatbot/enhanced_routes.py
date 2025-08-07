# app/api/chatbot/enhanced_routes.py
import time
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import json
import asyncio

from app.api.auth.dependencies import get_current_client
from app.core.database.dependencies import get_db
from app.domain.client.entities import Client
from app.services.chat.enhanced_chat_service import EnhancedChatService
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.openai_service import OpenAIService
from app.services.chat.context_manager import ContextManager
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger
from app.core.config.settings import settings


router = APIRouter(prefix="/chatbot", tags=["chatbot"])

def get_openai_service() -> OpenAIService:
    """Get optimized OpenAI service with GPT-4.1-mini model."""
    if not settings.OPENAI_API_KEY:
        logger.error("OpenAI API key not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service not available. Please contact administrator."
        )
    
    return OpenAIService(model_name="gpt-4.1-mini-2025-04-14")

    

@router.get("/history/{session_id}", response_model=List[Dict[str, Any]])
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get chat history for a specific session using OpenAI."""
    # Get OpenAI service
    try:
        llm_service = get_openai_service()
        logger.info("Using OpenAI GPT-4.1-mini-2025-04-14 for chat history retrieval")
    except Exception as e:
        logger.error(f"Error initializing OpenAI service for history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI service unavailable. Please try again later."
        )
    
    # Initialize services
    search_service = EnhancedSearchService(llm_service)
    context_manager = ContextManager()
    
    # Create enhanced chat service
    chat_service = EnhancedChatService(
        db=db,
        search_service=search_service,
        llm_service=llm_service,
        context_manager=context_manager,
    )
    
    # Get history
    history = chat_service.get_chat_history(
        client_id=current_client.client_id,
        session_id=session_id,
        limit=limit
    )
    
    return history

@router.post("/message/stream")
async def send_message_stream(
    message_data: Dict[str, Any],
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):    
    """Send a message to the chatbot and get a streaming response using OpenAI."""
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
    
    # Validate OpenAI API key before proceeding
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured. Please contact administrator."
        )
    
    # Initialize OpenAI service
    try:
        llm_service = get_openai_service()
        logger.info("Using OpenAI GPT-4.1-mini-2025-04-14 for streaming chat")
    except Exception as e:
        logger.error(f"Error initializing OpenAI service: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI service unavailable. Please try again later."
        )
    
    # Initialize simplified services
    search_service = EnhancedSearchService(llm_service)
    context_manager = ContextManager()
    
    # Create simplified chat service
    chat_service = EnhancedChatService(
        db=db,
        search_service=search_service,
        llm_service=llm_service,
        context_manager=context_manager,
    )
    
    async def stream_response():
        """Generate the streaming response using OpenAI."""
        # Send model info first
        model_info = {
            "type": "model_info",
            "provider": "openai",
            "model": "gpt-4.1-mini-2025-04-14",
            "timestamp": time.time()
        }
        yield f"data: {json.dumps(model_info)}\n\n"
        
        session_id_value = None
        knowledge_used = False
        integration_used = False
        final_response = None
        
        try:
            async for chunk in chat_service.process_message_stream(
                client_id=current_client.client_id,
                session_id=session_id,
                user_message=user_message,
                user_info=user_info
            ):
                # Extract session_id from info message
                if chunk.get("type") == "info":
                    session_id_value = chunk.get("session_id")
                    knowledge_used = chunk.get("knowledge_used", False)
                    integration_used = chunk.get("integration_used", False)
                    # Add model info to info chunk
                    chunk["model_provider"] = "openai"
                    chunk["model_name"] = "gpt-4.1-mini-2025-04-14"
                
                # Get final response from the "done" message
                if chunk.get("type") == "done" and "message" in chunk:
                    final_response = chunk["message"].get("content", "")
                    # Add model info to done chunk
                    chunk["model_provider"] = "openai"
                    chunk["model_name"] = "gpt-4.1-mini-2025-04-14"
                
                # Convert chunk to SSE format (Server-Sent Events)
                yield f"data: {json.dumps(chunk)}\n\n"
                
                # Small delay to simulate natural typing speed (optional)
                if chunk.get("type") == "chunk":
                    await asyncio.sleep(0.01)  # 10ms delay
            
            # Track the completed chat interaction
            if session_id_value and final_response:
                usage_tracker = UsageTracker()
                
                # Increment message count for subscription tracking
                try:
                    usage_tracker._increment_message_count(db, current_client.client_id)
                    logger.debug(f"Incremented message count for client {current_client.client_id}")
                except Exception as e:
                    logger.error(f"Error tracking message count: {str(e)}")
                    # Don't fail the request if tracking fails
                
                logger.info(f"Completed OpenAI streaming chat for client {current_client.client_id}")
                
        except Exception as e:
            logger.error(f"Error in OpenAI streaming chat: {str(e)}", exc_info=True)
            # Send error message in stream
            error_message = {
                "type": "error",
                "error": f"OpenAI streaming error: {str(e)}",
                "model_provider": "openai",
                "model_name": "gpt-4.1-mini-2025-04-14"
            }
            yield f"data: {json.dumps(error_message)}\n\n"
    
    # Return a streaming response with text/event-stream content type
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Model-Provider": "openai",
            "X-Model-Name": "gpt-4.1-mini-2025-04-14"
        }
    )

# Health check endpoint for OpenAI service
@router.get("/health")
async def chatbot_health():
    """Health check for OpenAI chatbot service."""
    try:
        # Test if OpenAI service can be initialized
        service = get_openai_service()
        return {
            "status": "healthy",
            "provider": "openai",
            "model": "gpt-4.1-mini-2025-04-14",
            "api_key_configured": bool(settings.OPENAI_API_KEY),
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "provider": "openai",
            "model": "gpt-4.1-mini-2025-04-14",
            "error": str(e),
            "api_key_configured": bool(settings.OPENAI_API_KEY),
            "timestamp": time.time()
        }