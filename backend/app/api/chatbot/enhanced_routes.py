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
from app.services.industry.industry_factory import IndustryFactory
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

@router.post("/message", response_model=Dict[str, Any])
async def send_message(
    message_data: Dict[str, Any],
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Send a message to the chatbot and get a response using enhanced knowledge integration with OpenAI."""
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
    
    # Get OpenAI service for knowledge lookup
    try:
        llm_service_search = get_openai_service()
        search_service_initial = EnhancedSearchService(llm_service_search)
        
        # Perform knowledge search to find relevant content
        search_results = await search_service_initial.hybrid_search(
            client_id=current_client.client_id,
            query_text=user_message,
            limit=5  # Get more results for better knowledge coverage
        )
    except Exception as e:
        logger.error(f"Error initializing OpenAI service for knowledge search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI service unavailable. Please try again later."
        )
    
    results = search_results.get("results", [])
    logger.info(f"Found {len(results)} knowledge items for query: '{user_message[:50]}...' (client: {current_client.client_id}) using OpenAI")
    
    # Log the top result scores for debugging
    if results:
        score_str = ", ".join([f"{r.get('hybrid_score', r.get('similarity', 0)):.2f}" for r in results[:3]])
        logger.info(f"Top result scores: {score_str}")
    
    # Get OpenAI service for main processing
    try:
        llm_service = get_openai_service()
        logger.info("Using OpenAI GPT-4.1-mini-2025-04-14 for chat processing")
    except Exception as e:
        logger.error(f"Error initializing OpenAI service: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI service unavailable. Please try again later."
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
                "IMPORTANT: You are powered by OpenAI GPT-4.1-mini-2025-04-14. "
                "Base your response primarily on the provided knowledge base information. "
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
        
        # Add model information to response
        response["model_info"] = {
            "provider": "openai",
            "model": "gpt-4.1-mini-2025-04-14",
            "timestamp": time.time()
        }
        
        # Track usage stats using track_chat_message
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
    
    # Get OpenAI service for knowledge lookup
    try:
        llm_service_search = get_openai_service()
        search_service_initial = EnhancedSearchService(llm_service_search)
        
        # Perform knowledge search to find relevant content
        search_results = await search_service_initial.hybrid_search(
            client_id=current_client.client_id,
            query_text=user_message,
            limit=5  # Get more results for better knowledge coverage
        )
    except Exception as e:
        logger.error(f"Error in OpenAI knowledge search: {str(e)}")
        # Return error in streaming format
        async def error_stream():
            error_message = {
                "type": "error",
                "error": f"OpenAI service unavailable: {str(e)}"
            }
            yield f"data: {json.dumps(error_message)}\n\n"
        
        return StreamingResponse(
            error_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    
    results = search_results.get("results", [])
    logger.info(f"Stream: Found {len(results)} knowledge items for query: '{user_message[:50]}...' (client: {current_client.client_id}) using OpenAI")
    
    # Log the top result scores for debugging
    if results:
        score_str = ", ".join([f"{r.get('hybrid_score', r.get('similarity', 0)):.2f}" for r in results[:3]])
        logger.info(f"Stream: Top result scores: {score_str}")
    
    # Get OpenAI service for main processing
    try:
        llm_service = get_openai_service()
        logger.info("Stream: Using OpenAI GPT-4.1-mini-2025-04-14 for streaming chat")
    except Exception as e:
        logger.error(f"Error initializing OpenAI service for streaming: {str(e)}")
        # Return error in streaming format
        async def error_stream():
            error_message = {
                "type": "error",
                "error": f"OpenAI service initialization failed: {str(e)}"
            }
            yield f"data: {json.dumps(error_message)}\n\n"
        
        return StreamingResponse(
            error_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    
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
                "IMPORTANT: You are powered by OpenAI GPT-4.1-mini-2025-04-14. "
                "Base your response primarily on the provided knowledge base information. "
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