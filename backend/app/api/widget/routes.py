# backend/app/api/widget/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import time
import logging
import json
import asyncio
from fastapi.middleware.cors import CORSMiddleware

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client, get_client_by_api_key
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientSettingsRepository
from app.services.chat.response_generator import StreamingResponseGenerator
from app.services.llm.llm_factory import LLMFactory
from app.services.knowledge.similarity_service import SimilarityService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager
from app.core import logger

router = APIRouter()

# Add CORS middleware specifically for widget routes
@router.middleware("http")
async def add_cors_headers(request: Request, call_next):
    """Add CORS headers for widget endpoints."""
    response = await call_next(request)
    
    # Add CORS headers for all widget requests
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-API-Key, Authorization"
    response.headers["Access-Control-Expose-Headers"] = "Content-Type"
    
    return response

def get_widget_client(api_key: str, db: Session) -> Optional[Client]:
    """Get client by API key for widget requests."""
    try:
        from app.repositories.client_repository import ClientRepository
        client_repo = ClientRepository()
        return client_repo.get_by_api_key(db, api_key)
    except Exception as e:
        logger.error(f"Error getting widget client: {e}")
        return None

@router.get("/test")
async def test_widget_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """Test endpoint for widget connectivity - supports GET method."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        logger.info(f"Widget test request from client: {client.client_id}")
        
        return {
            "message": "Widget API is working!",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "success",
            "client_id": client.client_id,
            "version": "2.0.0"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Widget test error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/settings")
async def get_widget_settings(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get widget settings - supports GET method."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            logger.warning("Widget settings request without API key")
            return _get_default_settings()
        
        # Validate client
        client = get_widget_client(api_key, db)
        if not client:
            logger.warning(f"Widget settings request with invalid API key: {api_key[:8]}...")
            return _get_default_settings()
        
        logger.info(f"Getting widget settings for client: {client.client_id}")
        
        # Get client settings from database
        settings_repo = ClientSettingsRepository()
        client_settings = settings_repo.get_by_client_id(db, client.client_id)
        
        # Build comprehensive settings response
        widget_settings = {
            "primary_color": "#ea580c",
            "chatbot_name": "AI Assistant", 
            "widget_position": "bottom-right",
            "enable_suggestions": True,
            "show_typing_indicator": True,
            "greeting_message": "Hello! How can I help you today?",
            "reset_on_page_refresh": True,
            "session_timeout": 30,
            "api_key": client.api_key,
            "client_id": client.client_id,
            "llm_provider": "deepseek",
            "llm_model": "deepseek-chat"
        }
        
        # Override with actual client settings if available
        if client_settings:
            widget_settings.update({
                "primary_color": client_settings.primary_color or widget_settings["primary_color"],
                "chatbot_name": client_settings.chatbot_name or widget_settings["chatbot_name"],
                "greeting_message": client_settings.greeting_message or widget_settings["greeting_message"],
                "enable_suggestions": client_settings.enable_suggestions if client_settings.enable_suggestions is not None else widget_settings["enable_suggestions"],
                "show_typing_indicator": client_settings.enable_typing_indicator if client_settings.enable_typing_indicator is not None else widget_settings["show_typing_indicator"],
                "widget_position": client_settings.widget_position or widget_settings["widget_position"],
            })
            
            # Handle custom settings (LLM configuration)
            if client_settings.custom_settings:
                custom = client_settings.custom_settings
                if isinstance(custom, dict):
                    widget_settings["llm_provider"] = custom.get("llm_provider", widget_settings["llm_provider"])
                    widget_settings["llm_model"] = custom.get("llm_model", widget_settings["llm_model"])
        
        logger.info(f"Returning widget settings for client {client.client_id}")
        return widget_settings
        
    except Exception as e:
        logger.error(f"Error getting widget settings: {str(e)}")
        return _get_default_settings()

@router.put("/settings")
async def update_widget_settings(
    settings: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Update widget settings - supports PUT method."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        settings_repo = ClientSettingsRepository()
        client_settings = settings_repo.get_by_client_id(db, client.client_id)
        
        # Prepare settings update
        settings_update = {
            "primary_color": settings.get("primary_color"),
            "chatbot_name": settings.get("chatbot_name"), 
            "greeting_message": settings.get("greeting_message"),
            "enable_suggestions": settings.get("enable_suggestions"),
            "enable_typing_indicator": settings.get("show_typing_indicator"),
            "widget_position": settings.get("widget_position"),
            "custom_settings": {
                "llm_provider": settings.get("llm_provider"),
                "llm_model": settings.get("llm_model"),
                "reset_on_page_refresh": settings.get("reset_on_page_refresh"),
                "session_timeout": settings.get("session_timeout")
            }
        }
        
        # Remove None values
        settings_update = {k: v for k, v in settings_update.items() if v is not None}
        if settings_update.get("custom_settings"):
            settings_update["custom_settings"] = {k: v for k, v in settings_update["custom_settings"].items() if v is not None}
        
        if client_settings:
            # Update existing settings
            updated_settings = settings_repo.update(db, db_obj=client_settings, obj_in=settings_update)
        else:
            # Create new settings
            settings_update["client_id"] = client.client_id
            updated_settings = settings_repo.create(db, obj_in=settings_update)
        
        logger.info(f"Widget settings updated for client {client.client_id}")
        
        return {
            "message": "Widget settings updated successfully",
            "settings": await get_widget_settings(request, db)
        }
        
    except Exception as e:
        logger.error(f"Error updating widget settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message")
async def widget_send_message(
    message_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Send a message through the widget (non-streaming)."""
    try:
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        if "message" not in message_data:
            raise HTTPException(status_code=400, detail="Message field is required")
        
        # Initialize services with error handling
        try:
            llm_service = LLMFactory.create_llm_service(db, client.client_id)
            similarity_service = SimilarityService(db)
            industry_factory = IndustryFactory()
            context_manager = ContextManager()
            
            # Create response generator
            response_generator = StreamingResponseGenerator(
                db=db,
                llm_service=llm_service,
                similarity_service=similarity_service,
                industry_factory=industry_factory,
                context_manager=context_manager
            )
            
            # Generate response
            response = await response_generator.generate_response(
                client_id=client.client_id,
                user_message=message_data["message"],
                session_id=message_data.get("session_id"),
                user_info={
                    "ip_address": request.client.host if request.client else None,
                    "user_agent": request.headers.get("User-Agent")
                }
            )
            
            return response
            
        except Exception as service_error:
            logger.error(f"Service initialization error: {str(service_error)}")
            # Return a simple response if services fail
            return {
                "message": {
                    "content": f"Thank you for your message: '{message_data['message']}'. This is a test response from the Customate.ai widget!",
                    "role": "assistant",
                    "id": f"msg-{int(time.time())}",
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                },
                "session_id": message_data.get("session_id", f"session-{int(time.time())}")
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing widget message: {str(e)}")
        return {
            "message": {
                "content": "I'm sorry, I encountered an error while processing your request. Please try again later.",
                "role": "assistant",
                "id": f"error-{int(time.time())}",
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            },
            "session_id": message_data.get("session_id", f"session-{int(time.time())}"),
            "error": str(e)
        }

@router.post("/message/stream")
async def widget_send_message_stream(
    message_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Send a message through the widget with streaming response."""
    
    # Get API key from headers
    api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # Validate client
    client = get_widget_client(api_key, db)
    if not client:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    if "message" not in message_data:
        raise HTTPException(status_code=400, detail="Message field is required")
    
    async def generate_response():
        try:
            # Initialize services with error handling
            try:
                llm_service = LLMFactory.create_llm_service(db, client.client_id)
                similarity_service = SimilarityService(db)
                industry_factory = IndustryFactory()
                context_manager = ContextManager()
                
                # Create response generator
                response_generator = StreamingResponseGenerator(
                    db=db,
                    llm_service=llm_service,
                    similarity_service=similarity_service,
                    industry_factory=industry_factory,
                    context_manager=context_manager
                )
                
                # Generate streaming response
                async for chunk in response_generator.generate_streaming_response(
                    client_id=client.client_id,
                    user_message=message_data["message"],
                    session_id=message_data.get("session_id"),
                    user_info={
                        "ip_address": request.client.host if request.client else None,
                        "user_agent": request.headers.get("User-Agent")
                    }
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
                    await asyncio.sleep(0.01)
                    
            except Exception as service_error:
                logger.error(f"Service error in streaming: {str(service_error)}")
                
                # Send info chunk
                yield f"data: {json.dumps({'type': 'info', 'session_id': f'session-{int(time.time())}'})}\n\n"
                await asyncio.sleep(0.1)
                
                # Send simple streaming response
                response_text = f"Thank you for your message: '{message_data['message']}'. This is a test streaming response from Customate.ai!"
                words = response_text.split()
                
                for word in words:
                    yield f"data: {json.dumps({'type': 'chunk', 'content': word + ' '})}\n\n"
                    await asyncio.sleep(0.1)
                
                yield f"data: {json.dumps({'type': 'complete', 'content': response_text})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in streaming response: {str(e)}")
            error_data = {
                "type": "error",
                "error": "I'm sorry, I encountered an error while processing your request."
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        }
    )

def _get_default_settings():
    """Get default widget settings."""
    return {
        "primary_color": "#ea580c",
        "chatbot_name": "AI Assistant",
        "widget_position": "bottom-right", 
        "enable_suggestions": True,
        "show_typing_indicator": True,
        "greeting_message": "Hello! How can I help you today!",
        "reset_on_page_refresh": True,
        "session_timeout": 30,
        "llm_provider": "deepseek",
        "llm_model": "deepseek-chat"
    }

# CORS Options handlers
@router.options("/test")
async def options_widget_test():
    """Handle CORS preflight for widget test."""
    return {"message": "OK"}

@router.options("/settings")
async def options_widget_settings():
    """Handle CORS preflight for widget settings."""
    return {"message": "OK"}

@router.options("/message")
async def options_widget_message():
    """Handle CORS preflight for widget messages."""
    return {"message": "OK"}

@router.options("/message/stream")
async def options_widget_message_stream():
    """Handle CORS preflight for widget streaming messages."""
    return {"message": "OK"}