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
from app.services.llm.deepseek_service import DeepSeekService
from app.services.industry.industry_factory import IndustryFactory
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
    
    # First, search the knowledge base for relevant info
    llm_service_search = DeepSeekService()  # Use basic service for knowledge lookup
    search_service_initial = EnhancedSearchService(llm_service_search)
    
    # Perform knowledge search to find relevant content
    search_results = await search_service_initial.hybrid_search(
        client_id=current_client.client_id,
        query_text=user_message,
        limit=5  # Get more results for better knowledge coverage
    )
    
    results = search_results.get("results", [])
    logger.info(f"Found {len(results)} knowledge items for query: '{user_message[:50]}...' (client: {current_client.client_id})")
    
    # Log the top result scores for debugging
    if results:
        score_str = ", ".join([f"{r.get('hybrid_score', r.get('similarity', 0)):.2f}" for r in results[:3]])
        logger.info(f"Top result scores: {score_str}")
    
    # Get LLM service based on client settings or overrides in the request
    llm_service = LLMFactory.create_llm_service(
        db, 
        current_client.client_id,
        message_data.get("llm_settings")  # Pass any override settings from request
    )
    
    # Initialize other services
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
    
    # Monkey patch the hybrid_search method to return our pre-fetched results
    original_hybrid_search = search_service.hybrid_search
    
    async def custom_hybrid_search(*args, **kwargs):
        # Use our already fetched results
        return {
            "results": results,
            "metadata": search_results.get("metadata", {})
        }
    
    # Apply the patch to use our knowledge base results
    search_service.hybrid_search = custom_hybrid_search
    
    # Enhance the LLM's system prompt to focus on KB information
    original_build_prompt = llm_service._build_system_prompt if hasattr(llm_service, '_build_system_prompt') else None
    
    if original_build_prompt:
        def kb_focused_prompt(*args, **kwargs):
            # Get the original prompt
            original = original_build_prompt(*args, **kwargs)
            
            # Add instructions to focus on knowledge base information
            kb_instructions = (
                "IMPORTANT: Base your response primarily on the provided knowledge base information. "
                "If the knowledge base doesn't contain sufficient information to answer the question, "
                "acknowledge this limitation and ask the user to provide more details. "
                "Ensure your responses are grounded in the provided knowledge context."
            )
            
            # Append to the original prompt
            enhanced_prompt = original + "\n\n" + kb_instructions
            return enhanced_prompt
            
        # Apply the patch
        llm_service._build_system_prompt = kb_focused_prompt
    
    try:
        # Process message with enhanced knowledge integration
        response = await chat_service.process_message(
            client_id=current_client.client_id,
            session_id=session_id,
            user_message=user_message,
            user_info=user_info
        )
        
        # Track usage stats using track_chat_message instead of track_chat_interaction
        usage_tracker = UsageTracker()
        
        # Track the assistant's message (is_user_message=False)
        usage_tracker.track_chat_message(
            db=db,
            client_id=current_client.client_id,
            session_id=response["session_id"],
            message_content=response["message"]["content"],
            is_user_message=False,
            response_time_ms=int((time.time() - start_time) * 1000),
            knowledge_used=response.get("knowledge_used", False)
        )
        
        return response
    finally:
        # Restore original methods
        search_service.hybrid_search = original_hybrid_search
        if original_build_prompt:
            llm_service._build_system_prompt = original_build_prompt

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
    
    # First, search the knowledge base for relevant info
    llm_service_search = DeepSeekService()  # Use basic service for knowledge lookup
    search_service_initial = EnhancedSearchService(llm_service_search)
    
    # Perform knowledge search to find relevant content
    search_results = await search_service_initial.hybrid_search(
        client_id=current_client.client_id,
        query_text=user_message,
        limit=5  # Get more results for better knowledge coverage
    )
    
    results = search_results.get("results", [])
    logger.info(f"Stream: Found {len(results)} knowledge items for query: '{user_message[:50]}...' (client: {current_client.client_id})")
    
    # Log the top result scores for debugging
    if results:
        score_str = ", ".join([f"{r.get('hybrid_score', r.get('similarity', 0)):.2f}" for r in results[:3]])
        logger.info(f"Stream: Top result scores: {score_str}")
    
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
        llm_service = DeepSeekService()
    
    # Initialize the rest of the services
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
    
    # Monkey patch the hybrid_search method to return our pre-fetched results
    original_hybrid_search = search_service.hybrid_search
    
    async def custom_hybrid_search(*args, **kwargs):
        # Use our already fetched results
        return {
            "results": results,
            "metadata": search_results.get("metadata", {})
        }
    
    # Apply the patch to use our knowledge base results
    search_service.hybrid_search = custom_hybrid_search
    
    # Enhance the LLM's system prompt to focus on KB information
    original_build_prompt = llm_service._build_system_prompt if hasattr(llm_service, '_build_system_prompt') else None
    
    if original_build_prompt:
        def kb_focused_prompt(*args, **kwargs):
            # Get the original prompt
            original = original_build_prompt(*args, **kwargs)
            
            # Add instructions to focus on knowledge base information
            kb_instructions = (
                "IMPORTANT: Base your response primarily on the provided knowledge base information. "
                "If the knowledge base doesn't contain sufficient information to answer the question, "
                "acknowledge this limitation and ask the user to provide more details. "
                "Ensure your responses are grounded in the provided knowledge context."
            )
            
            # Append to the original prompt
            enhanced_prompt = original + "\n\n" + kb_instructions
            return enhanced_prompt
            
        # Apply the patch
        llm_service._build_system_prompt = kb_focused_prompt
    
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
                
                # Get final response from the "done" message
                if chunk.get("type") == "done" and "message" in chunk:
                    final_response = chunk["message"].get("content", "")
                
                # Convert chunk to SSE format (Server-Sent Events)
                yield f"data: {json.dumps(chunk)}\n\n"
                
                # Small delay to simulate natural typing speed (optional)
                if chunk.get("type") == "chunk":
                    await asyncio.sleep(0.01)  # 10ms delay
            
            # Track the completed chat interaction
            if session_id_value and final_response:
                usage_tracker = UsageTracker()
                
                # Track the assistant's message (is_user_message=False)
                usage_tracker.track_chat_message(
                    db=db,
                    client_id=current_client.client_id,
                    session_id=session_id_value,
                    message_content=final_response,
                    is_user_message=False,
                    response_time_ms=int((time.time() - start_time) * 1000),
                    knowledge_used=knowledge_used
                )
        except Exception as e:
            logger.error(f"Error in streaming chat: {str(e)}", exc_info=True)
            # Send error message in stream
            error_message = {
                "type": "error",
                "error": str(e)
            }
            yield f"data: {json.dumps(error_message)}\n\n"
        finally:
            # Restore original methods
            search_service.hybrid_search = original_hybrid_search
            if original_build_prompt:
                llm_service._build_system_prompt = original_build_prompt
    
    # Return a streaming response with text/event-stream content type
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )