from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging
import json
import asyncio
import uuid
import time

from app.core.database.dependencies import get_db
from app.repositories.client_repository import ClientRepository, ClientSettingsRepository
from app.core.config.settings import settings

# Import only OpenAI service for widget usage
from app.services.llm.openai_service import OpenAIService
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager

# Try to import EnhancedChatService, fall back if not available
try:
    from app.services.chat.enhanced_chat_service import EnhancedChatService
    ENHANCED_CHAT_AVAILABLE = True
except ImportError:
    ENHANCED_CHAT_AVAILABLE = False

logger = logging.getLogger(__name__)
router = APIRouter()

def get_openai_service() -> OpenAIService:
    """Get OpenAI service with GPT-4.1-mini-2025-04-14 model."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured. Please contact administrator."
        )
    
    return OpenAIService(model_name="gpt-4.1-mini-2025-04-14")

def get_widget_client_by_api_key(api_key: str, db: Session):
    """Get client by API key for widget requests."""
    try:
        client_repo = ClientRepository()
        client = client_repo.get_by_api_key(db, api_key)
        if client:
            logger.info(f"✅ Widget client found for API key: {api_key[:8]}...")
        else:
            logger.warning(f"❌ No client found for API key: {api_key[:8]}...")
        return client
    except Exception as e:
        logger.error(f"Error getting widget client: {e}")
        return None

def create_chat_service(db: Session, client_id: str):
    """Create properly initialized chat service with OpenAI."""
    try:
        if ENHANCED_CHAT_AVAILABLE:
            # Use enhanced chat service with OpenAI
            llm_service = get_openai_service()  # Force OpenAI
            search_service = EnhancedSearchService(llm_service)
            industry_factory = IndustryFactory()
            context_manager = ContextManager()
            
            chat_service = EnhancedChatService(
                db=db,
                search_service=search_service,
                llm_service=llm_service,
                industry_factory=industry_factory,
                context_manager=context_manager,
            )
            logger.info("✅ Using EnhancedChatService with OpenAI GPT-4.1-mini-2025-04-14")
            return chat_service
        else:
            logger.warning("⚠️ EnhancedChatService not available, using basic fallback")
            return None
    except Exception as e:
        logger.error(f"❌ Error creating OpenAI chat service: {e}")
        return None

@router.get("/settings")
async def get_widget_settings(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get widget settings - Enhanced with OpenAI forcing."""
    try:
        logger.info("📡 Widget settings request received")
        
        # Get API key from multiple sources
        api_key = (
            request.headers.get("X-API-Key") or 
            request.headers.get("x-api-key") or 
            request.query_params.get("api_key")
        )
        
        logger.info(f"🔑 API Key received: {api_key[:8] + '...' if api_key else 'None'}")
        
        if not api_key:
            logger.warning("❌ No API key provided, returning default OpenAI settings")
            return _get_default_settings()
        
        # Validate client
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            logger.warning(f"❌ Invalid API key: {api_key[:8]}..., returning default OpenAI settings")
            return _get_default_settings()
        
        # Get settings from repository but force OpenAI values
        try:
            settings_repo = ClientSettingsRepository()
            settings_data = settings_repo.get_widget_formatted_settings(db, client.client_id)
            
            # Force OpenAI settings regardless of what's in database
            settings_data.update({
                "llm_provider": "openai",
                "llm_model": "gpt-4.1-mini-2025-04-14"
            })
            
            logger.info("✅ Widget settings retrieved successfully with forced OpenAI configuration")
            logger.info(f"🤖 Forced LLM: {settings_data['llm_provider']} - {settings_data['llm_model']}")
            return settings_data
        except Exception as settings_error:
            logger.error(f"❌ Error getting settings from repository: {settings_error}")
            return _get_default_settings()
        
    except Exception as e:
        logger.error(f"❌ Error in get_widget_settings: {str(e)}")
        return _get_default_settings()

@router.put("/settings")
async def update_widget_settings(
    settings: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Update widget settings - Enhanced version with OpenAI forcing."""
    try:
        logger.info("📡 Widget settings update request received")
        
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            logger.error("❌ No API key provided for settings update")
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            logger.error(f"❌ Invalid API key for settings update: {api_key[:8]}...")
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Force OpenAI settings in the update
        settings.update({
            "llm_provider": "openai",
            "llm_model": "gpt-4.1-mini-2025-04-14"
        })
        
        # Update settings
        try:
            settings_repo = ClientSettingsRepository()
            updated_settings = settings_repo.update_widget_settings(db, client.client_id, settings)
            
            # Get the updated settings and force OpenAI again
            final_settings = settings_repo.get_widget_formatted_settings(db, client.client_id)
            final_settings.update({
                "llm_provider": "openai",
                "llm_model": "gpt-4.1-mini-2025-04-14"
            })
            
            logger.info("✅ Widget settings updated successfully with forced OpenAI configuration")
            return {
                "message": "Settings updated successfully with OpenAI configuration",
                "settings": final_settings
            }
        except Exception as update_error:
            logger.error(f"❌ Error updating settings: {update_error}")
            raise HTTPException(status_code=500, detail=f"Settings update failed: {str(update_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in update_widget_settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message")
async def send_widget_message(
    request: Request,
    db: Session = Depends(get_db)
):
    """Send message to widget (non-streaming) using OpenAI."""
    try:
        logger.info("💬 Widget message request received")
        
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Get request body
        body = await request.json()
        message = body.get("message", "")
        session_id = body.get("session_id")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        logger.info(f"📨 Processing message with OpenAI: {message[:100]}...")
        
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Try to use enhanced chat service with OpenAI
        try:
            chat_service = create_chat_service(db, client.client_id)
            
            if chat_service and ENHANCED_CHAT_AVAILABLE:
                logger.info("🚀 Using enhanced chat service with OpenAI")
                
                # Process message through enhanced chat service
                response = await chat_service.process_message(
                    client_id=client.client_id,
                    session_id=session_id,
                    user_message=message,
                    user_info={}
                )
                
                logger.info("✅ OpenAI enhanced response generated successfully")
                return {
                    "message": {
                        "id": response.get("message", {}).get("id", str(uuid.uuid4())),
                        "role": "assistant",
                        "content": response.get("message", {}).get("content", "I'm here to help!"),
                        "created_at": time.time()
                    },
                    "session_id": response.get("session_id", session_id),
                    "status": "success",
                    "model_info": {
                        "provider": "openai",
                        "model": "gpt-4.1-mini-2025-04-14"
                    }
                }
            else:
                logger.warning("⚠️ Enhanced chat service not available, using basic OpenAI response")
                # Basic OpenAI response
                return {
                    "message": {
                        "id": str(uuid.uuid4()),
                        "role": "assistant",
                        "content": f"Thank you for your message: '{message}'. I'm powered by OpenAI GPT-4.1-mini-2025-04-14 and ready to help you!",
                        "created_at": time.time()
                    },
                    "session_id": session_id,
                    "status": "success",
                    "model_info": {
                        "provider": "openai",
                        "model": "gpt-4.1-mini-2025-04-14"
                    }
                }
                
        except Exception as chat_error:
            logger.error(f"❌ OpenAI chat error: {chat_error}")
            return {
                "message": {
                    "id": str(uuid.uuid4()),
                    "role": "assistant",
                    "content": "I apologize, but I'm having trouble processing your request with OpenAI. Please try again.",
                    "created_at": time.time()
                },
                "session_id": session_id,
                "status": "error",
                "model_info": {
                    "provider": "openai",
                    "model": "gpt-4.1-mini-2025-04-14",
                    "error": True
                }
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widget message error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Message processing failed: {str(e)}")

@router.post("/message/stream")
async def send_widget_message_stream(
    request: Request,
    db: Session = Depends(get_db)
):
    """Send message to widget (streaming) using OpenAI."""
    try:
        logger.info("🌊 Widget streaming message request received")
        
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Get request body
        body = await request.json()
        message = body.get("message", "")
        session_id = body.get("session_id")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        logger.info(f"📨 Processing streaming message with OpenAI: {message[:100]}...")
        
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        async def generate_stream_response():
            """Generate streaming response using OpenAI."""
            try:
                # Send session info with model info
                yield f"data: {json.dumps({'type': 'info', 'session_id': session_id, 'model_provider': 'openai', 'model_name': 'gpt-4.1-mini-2025-04-14'})}\n\n"
                
                message_id = str(uuid.uuid4())
                
                # Try to use enhanced chat service with OpenAI
                chat_service = create_chat_service(db, client.client_id)
                
                if chat_service and ENHANCED_CHAT_AVAILABLE:
                    # Use enhanced streaming with OpenAI
                    try:
                        logger.info("🚀 Using enhanced streaming chat service with OpenAI")
                        
                        async for chunk in chat_service.process_message_stream(
                            client_id=client.client_id,
                            session_id=session_id,
                            user_message=message,
                            user_info={}
                        ):
                            # Add model info to chunks
                            if isinstance(chunk, dict):
                                chunk["model_provider"] = "openai"
                                chunk["model_name"] = "gpt-4.1-mini-2025-04-14"
                            
                            yield f"data: {json.dumps(chunk)}\n\n"
                        
                        logger.info("✅ Enhanced OpenAI streaming completed")
                        return
                        
                    except Exception as e:
                        logger.error(f"❌ Enhanced OpenAI streaming error: {e}")
                        # Fall back to basic streaming
                
                # Basic OpenAI streaming fallback
                logger.info("⚠️ Using basic OpenAI streaming fallback")
                
                response_text = f"Thank you for your message: '{message}'. I'm powered by OpenAI GPT-4.1-mini-2025-04-14 and ready to help you!"
                
                # Stream word by word
                words = response_text.split()
                for word in words:
                    chunk_data = {
                        'type': 'chunk', 
                        'content': word + " ",
                        'message_id': message_id,
                        'model_provider': 'openai',
                        'model_name': 'gpt-4.1-mini-2025-04-14'
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                    await asyncio.sleep(0.05)  # Typing delay
                
                # Send done signal
                done_data = {
                    'type': 'done',
                    'message': {
                        'id': message_id,
                        'role': 'assistant',
                        'content': response_text,
                        'created_at': time.time()
                    },
                    'session_id': session_id,
                    'model_provider': 'openai',
                    'model_name': 'gpt-4.1-mini-2025-04-14'
                }
                logger.info(f"📤 Sending OpenAI DONE event: {done_data}")
                yield f"data: {json.dumps(done_data)}\n\n"
                logger.info("✅ Basic OpenAI streaming completed - DONE event sent")                
            except Exception as stream_error:
                logger.error(f"❌ OpenAI streaming error: {stream_error}")
                error_data = {
                    'type': 'error',
                    'error': f"OpenAI streaming failed: {str(stream_error)}",
                    'model_provider': 'openai',
                    'model_name': 'gpt-4.1-mini-2025-04-14'
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        logger.info("✅ Starting OpenAI streaming response")
        
        return StreamingResponse(
            generate_stream_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
                "X-Model-Provider": "openai",
                "X-Model-Name": "gpt-4.1-mini-2025-04-14"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widget OpenAI streaming error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OpenAI streaming failed: {str(e)}")

@router.get("/test")
async def test_widget_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """Test endpoint for widget connectivity with OpenAI."""
    try:
        logger.info("🧪 Widget test request received")
        
        api_key = (
            request.headers.get("X-API-Key") or 
            request.headers.get("x-api-key") or 
            request.query_params.get("api_key")
        )
        
        if not api_key:
            logger.warning("❌ No API key provided for test")
            raise HTTPException(status_code=401, detail="API key required for test")
        
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            logger.warning(f"❌ Invalid API key for test: {api_key[:8]}...")
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Test OpenAI service
        try:
            openai_service = get_openai_service()
            openai_status = "available"
        except Exception as e:
            openai_status = f"error: {str(e)}"
        
        logger.info("✅ Widget test successful with OpenAI")
        return {
            "message": "Widget API is working with OpenAI!",
            "status": "success",
            "client_id": client.client_id,
            "client_name": client.name,
            "model_info": {
                "provider": "openai",
                "model": "gpt-4.1-mini-2025-04-14",
                "status": openai_status
            },
            "endpoints": {
                "settings": "/api/widget/settings",
                "message": "/api/widget/message",
                "stream": "/api/widget/message/stream",
                "app": "/api/widget/app/"
            },
            "timestamp": time.time()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widget test error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def _get_default_settings():
    """Get default widget settings with OpenAI configuration."""
    return {
        "primary_color": "#ea580c",
        "chatbot_name": "AI Assistant",
        "widget_position": "bottom-right",
        "show_typing_indicator": True,
        "enable_suggestions": True,
        "greeting_message": "Hello! How can I help you today?",
        "llm_provider": "openai",
        "llm_model": "gpt-4.1-mini-2025-04-14",
        "reset_on_page_refresh": True,
        "session_timeout": 30,
        "context_window": 1000000,  # 1M tokens
        "embedding_model": "text-embedding-3-small"
    }