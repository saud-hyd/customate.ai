# backend/app/api/widget/routes.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import time
import uuid
import json
import asyncio
import logging
from datetime import datetime

from app.core.database.dependencies import get_db
from app.services.chat.enhanced_chat_service import EnhancedChatService
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_factory import LLMFactory
from app.services.chat.context_manager import ContextManager
from app.repositories.client_repository import ClientRepository
from app.core import logger

router = APIRouter()

def get_widget_client_by_api_key(api_key: str, db: Session):
    """Get client by API key for widget authentication."""
    try:
        client_repo = ClientRepository()
        return client_repo.get_by_api_key(db, api_key)
    except Exception as e:
        logger.error(f"Error getting client by API key: {str(e)}")
        return None
    
def get_demo_or_client_by_api_key(api_key: str, db: Session):
    """Get client by API key - supports both regular and demo keys."""
    try:
        # Check if it's a demo key
        if api_key.startswith("demo_"):
            # For demo keys, return the actual demo client from database
            client_repo = ClientRepository()
            demo_client = client_repo.get_by_client_id(db, "demo")
            
            if demo_client:
                logger.info(f"Demo client found for API key: {api_key[:12]}...")
                # Add demo flag for identification
                demo_client.is_demo = True
                return demo_client
            else:
                logger.error("Demo client not found in database")
                return None
        
        # Regular API key - use existing logic
        return get_widget_client_by_api_key(api_key, db)
        
    except Exception as e:
        logger.error(f"Error getting client by API key: {str(e)}")
        return None


@router.post("/message/stream")
async def send_widget_message_stream(
    request: Request,
    db: Session = Depends(get_db)
):
    """Send message to widget (streaming) using EnhancedChatService."""
    try:
        logger.info("🌊 Widget streaming message request received")
        
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        client = get_demo_or_client_by_api_key(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
          
        # Get request body
        body = await request.json()
        message = body.get("message", "")
        session_id = body.get("session_id")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        logger.info(f"📨 Processing streaming message for client {client.client_id}: {message[:100]}...")
        
        # REMOVE THIS HARDCODED DEMO BLOCK:
        # if api_key.startswith("demo_"):
        #     return { ... hardcoded response ... }
        
        # Collect user info
        user_info = {
            "user_id": body.get("user_id"),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "referrer": request.headers.get("referer"),
        }
        
        async def generate_stream_response():
            """Generate streaming response using EnhancedChatService."""
            try:
                # Initialize services (works for both demo and regular clients)
                llm_service = LLMFactory.create_llm_service(db, client.client_id)
                search_service = EnhancedSearchService(llm_service)
                context_manager = ContextManager()
                
                # Create enhanced chat service
                chat_service = EnhancedChatService(
                    db=db,
                    search_service=search_service,
                    llm_service=llm_service,
                    context_manager=context_manager,
                )
                
                # Process message with streaming using full RAG pipeline
                async for chunk in chat_service.process_message_stream(
                    client_id=client.client_id,
                    user_message=message,
                    session_id=session_id,
                    user_info=user_info
                ):
                    # Forward chunk to client
                    yield f"data: {json.dumps(chunk)}\n\n"
                    
                    # Small delay to prevent overwhelming
                    if chunk.get("type") == "chunk":
                        await asyncio.sleep(0.01)
                
                logger.info("✅ Widget streaming completed successfully")
                
            except Exception as stream_error:
                logger.error(f"❌ Streaming error: {stream_error}")
                error_data = {
                    'type': 'error',
                    'error': f"Streaming failed: {str(stream_error)}"
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        logger.info("✅ Starting enhanced streaming response")
        
        return StreamingResponse(
            generate_stream_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
                "X-Service": "EnhancedChatService",
                "X-RAG-Enabled": "true"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widget streaming error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

@router.get("/history/{session_id}")
async def get_widget_chat_history(
    session_id: str,
    request: Request,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get chat history for a widget session."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Initialize services
        llm_service = LLMFactory.create_llm_service(db, client.client_id)
        search_service = EnhancedSearchService(llm_service)
        context_manager = ContextManager()
        
        # Create enhanced chat service
        chat_service = EnhancedChatService(
            db=db,
            search_service=search_service,
            llm_service=llm_service,
            context_manager=context_manager,
        )
        
        # Get chat history
        history = chat_service.get_chat_history(
            client_id=client.client_id,
            session_id=session_id,
            limit=limit
        )
        
        return history
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widget history error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

@router.get("/settings")
async def get_widget_settings(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get widget settings (supports demo mode)."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client (including demo clients)
        client = get_demo_or_client_by_api_key(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Return settings (same for demo and regular)
        return {
            "primary_color": "#ea580c",
            "chatbot_name": "AI Assistant",
            "greeting_message": "Hello! I can help you with questions about this website. What would you like to know?",
            "widget_position": "bottom-right",
            "show_typing_indicator": True,
            "enable_suggestions": True,
            "llm_provider": "deepseek",
            "llm_model": "deepseek-chat",
            "reset_on_page_refresh": True,
            "session_timeout": 30,
            "demo_mode": api_key.startswith("demo_"),
            "styles": {
                "primary_color": "#ea580c",
                "widget_position": "bottom-right",
                "chat_height": "600px",
                "chat_width": "380px",
                "border_radius": "12px",
                "placeholder": "Type your message..."
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widget settings error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get widget settings: {str(e)}")
    
@router.get("/health")
async def widget_health_check():
    """Widget health check endpoint."""
    return {
        "status": "healthy",
        "service": "EnhancedChatService",
        "features": {
            "streaming": True,
            "rag": True,
            "knowledge_base": True,
            "integrations": True,
            "off_topic_protection": True
        },
        "timestamp": int(time.time())
    }

@router.get("/test")
async def test_widget_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """Test endpoint for widget connectivity."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            return {
                "status": "error",
                "message": "API key required for testing",
                "test_result": "failed"
            }
        
        # Validate client
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            return {
                "status": "error", 
                "message": "Invalid API key",
                "test_result": "failed"
            }
        
        return {
            "status": "success",
            "message": "Widget connection test successful",
            "client_id": client.client_id,
            "service": "EnhancedChatService",
            "test_result": "passed",
            "timestamp": int(time.time())
        }
        
    except Exception as e:
        logger.error(f"❌ Widget test error: {str(e)}")
        return {
            "status": "error",
            "message": f"Test failed: {str(e)}",
            "test_result": "failed"
        }