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
from app.services.chat.context_manager import ContextManager
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger
from app.services.llm.llm_factory import LLMFactory


router = APIRouter(prefix="/chatbot", tags=["chatbot"])

@router.post("/message", response_model=Dict[str, Any])
async def send_message(
    message_data: Dict[str, Any],
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Send a message to the chatbot and get a response using enhanced knowledge integration."""
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
    
    # Get LLM service based on client settings or overrides in the request
    llm_service = LLMFactory.create_llm_service(
        db, 
        current_client.client_id,
        message_data.get("llm_settings")  # Pass any override settings from request
    )
    
    # Initialize other services
    search_service = EnhancedSearchService(llm_service)
    context_manager = ContextManager()
    
    # Create enhanced chat service
    chat_service = EnhancedChatService(
        db=db,
        search_service=search_service,
        llm_service=llm_service,
        context_manager=context_manager,
    )
    
    # Process message with enhanced knowledge integration
    response = await chat_service.process_message(
        client_id=current_client.client_id,
        session_id=session_id,
        user_message=user_message,
        user_info=user_info
    )
    
    # Track usage stats
    usage_tracker = UsageTracker()
    usage_tracker.track_chat_interaction(
        db=db,
        client_id=current_client.client_id,
        session_id=response["session_id"],
        response_time_ms=int((time.time() - start_time) * 1000),
        used_knowledge=response.get("knowledge_used", False)
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
    llm_service = LLMFactory.create_llm_service(db, current_client.client_id)
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
    """Send a message to the chatbot and get a streaming response."""
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
    
    # Initialize fallback flag and error message
    use_fallback = False
    fallback_message = ""
    
    # Try to get the requested LLM service
    try:
        # Get LLM service based on client settings or overrides in the request
        llm_service = LLMFactory.create_llm_service(
            db, 
            current_client.client_id,
            message_data.get("llm_settings")  # Pass any override settings from request
        )
        
        # Log which LLM service is being used
        logger.info(f"Using LLM service: {llm_service.__class__.__name__}")
        
    except ValueError as e:
        # Handle initialization errors (like missing API keys)
        logger.error(f"Error initializing LLM service: {str(e)}")
        use_fallback = True
        fallback_message = str(e)
        
        # Use DeepSeek as fallback
        llm_service = LLMFactory.create_llm_service(db, current_client.client_id)  
    
    # Initialize the rest of the services
    search_service = EnhancedSearchService(llm_service)
    context_manager = ContextManager()
    
    # Create enhanced chat service
    chat_service = EnhancedChatService(
        db=db,
        search_service=search_service,
        llm_service=llm_service,
        context_manager=context_manager,
    )
    
    async def stream_response():
        """Generate the streaming response."""
        # If we're using a fallback, send a warning message first
        if use_fallback:
            warning = {
                "type": "warning",
                "message": f"Using DeepSeek as fallback: {fallback_message}"
            }
            yield f"data: {json.dumps(warning)}\n\n"
        
        # Now continue with the regular streaming process
        session_id_value = None
        knowledge_used = False
        integration_used = False
        
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
                
                # Convert chunk to SSE format (Server-Sent Events)
                yield f"data: {json.dumps(chunk)}\n\n"
                
                # Small delay to simulate natural typing speed (optional)
                if chunk.get("type") == "chunk":
                    await asyncio.sleep(0.01)  # 10ms delay
            
            # Track the completed chat interaction
            if session_id_value:
                usage_tracker = UsageTracker()
                usage_tracker.track_chat_interaction(
                    db=db,
                    client_id=current_client.client_id,
                    session_id=session_id_value,
                    response_time_ms=int((time.time() - start_time) * 1000),
                    used_knowledge=knowledge_used
                )
        except Exception as e:
            logger.error(f"Error in streaming chat: {str(e)}", exc_info=True)
            # Send error message in stream
            error_message = {
                "type": "error",
                "error": str(e)
            }
            yield f"data: {json.dumps(error_message)}\n\n"
    
    # Return a streaming response with text/event-stream content type
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )