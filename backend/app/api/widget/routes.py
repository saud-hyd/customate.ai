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

logger = logging.getLogger(__name__)
router = APIRouter()

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

@router.get("/settings")
async def get_widget_settings(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get widget settings - Enhanced with better error handling."""
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
            logger.warning("❌ No API key provided, returning default settings")
            return _get_default_settings()
        
        # Validate client
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            logger.warning(f"❌ Invalid API key: {api_key[:8]}..., returning default settings")
            return _get_default_settings()
        
        # Get settings from repository
        try:
            settings_repo = ClientSettingsRepository()
            settings = settings_repo.get_widget_formatted_settings(db, client.client_id)
            logger.info("✅ Widget settings retrieved successfully")
            return settings
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
    """Update widget settings - Enhanced version."""
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
        
        # Update settings
        try:
            settings_repo = ClientSettingsRepository()
            updated_settings = settings_repo.update_widget_settings(db, client.client_id, settings)
            
            logger.info("✅ Widget settings updated successfully")
            return {
                "message": "Settings updated successfully",
                "settings": settings_repo.get_widget_formatted_settings(db, client.client_id)
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
    """Send message to widget (non-streaming) - REAL LLM INTEGRATION."""
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
        llm_settings = body.get("llm_settings", {})
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        logger.info(f"📨 Processing message: {message[:100]}...")
        
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # REAL LLM INTEGRATION - Import your actual chat service
        try:
            from app.services.chat.chat_service import ChatService
            
            chat_service = ChatService()
            
            # Get client settings for LLM configuration
            settings_repo = ClientSettingsRepository()
            client_settings = settings_repo.get_widget_formatted_settings(db, client.client_id)
            
            # Prepare LLM settings
            llm_provider = llm_settings.get("llm_provider") or client_settings.get("llm_provider", "deepseek")
            llm_model = llm_settings.get("llm_model") or client_settings.get("llm_model", "deepseek-chat")
            
            # Process message through your actual chat service
            response = await chat_service.process_message(
                message=message,
                session_id=session_id,
                client_id=client.client_id,
                llm_provider=llm_provider,
                llm_model=llm_model,
                streaming=False
            )
            
            logger.info("✅ Real LLM response generated successfully")
            return {
                "message": {
                    "id": response.get("message_id", str(uuid.uuid4())),
                    "role": "assistant",
                    "content": response.get("content", "I apologize, but I couldn't process your message at the moment."),
                    "created_at": time.time()
                },
                "session_id": response.get("session_id", session_id),
                "status": "success"
            }
            
        except ImportError:
            logger.warning("⚠️ ChatService not available - using enhanced chatbot routes fallback")
            
            # Fallback: Use your enhanced chatbot routes
            try:
                from app.api.chatbot.enhanced_routes import process_chat_message
                
                # Call your existing chat processing
                chat_response = await process_chat_message(
                    message=message,
                    session_id=session_id,
                    client_id=client.client_id,
                    db=db
                )
                
                return {
                    "message": {
                        "id": chat_response.get("message_id", str(uuid.uuid4())),
                        "role": "assistant", 
                        "content": chat_response.get("response", "Thank you for your message. How can I help you today?"),
                        "created_at": time.time()
                    },
                    "session_id": chat_response.get("session_id", session_id),
                    "status": "success"
                }
                
            except ImportError:
                logger.warning("⚠️ Enhanced chatbot routes not available - using basic LLM fallback")
                
                # Final fallback: Basic response that indicates the system is working
                return {
                    "message": {
                        "id": str(uuid.uuid4()),
                        "role": "assistant",
                        "content": f"I understand you're asking about: '{message}'. I'm ready to help! Please note that full LLM integration needs to be connected to your chat service.",
                        "created_at": time.time()
                    },
                    "session_id": session_id,
                    "status": "success",
                    "note": "Connect your LLM service for full functionality"
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
    """Send message to widget (streaming) - REAL LLM INTEGRATION."""
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
        llm_settings = body.get("llm_settings", {})
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        logger.info(f"📨 Processing streaming message: {message[:100]}...")
        
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        async def generate_real_llm_stream():
            """Generate streaming response using actual LLM service."""
            
            try:
                # Try to use your actual chat service
                from app.services.chat.chat_service import ChatService
                
                chat_service = ChatService()
                
                # Get client settings for LLM configuration
                settings_repo = ClientSettingsRepository()
                client_settings = settings_repo.get_widget_formatted_settings(db, client.client_id)
                
                # Prepare LLM settings
                llm_provider = llm_settings.get("llm_provider") or client_settings.get("llm_provider", "deepseek")
                llm_model = llm_settings.get("llm_model") or client_settings.get("llm_model", "deepseek-chat")
                
                # Send session info
                yield f"data: {json.dumps({'type': 'info', 'session_id': session_id})}\n\n"
                
                message_id = str(uuid.uuid4())
                
                # Process streaming message through your actual chat service
                async for chunk in chat_service.process_message_stream(
                    message=message,
                    session_id=session_id,
                    client_id=client.client_id,
                    llm_provider=llm_provider,
                    llm_model=llm_model
                ):
                    chunk_data = {
                        'type': 'chunk',
                        'content': chunk,
                        'message_id': message_id
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Send completion signal
                yield f"data: {json.dumps({'type': 'complete', 'message_id': message_id})}\n\n"
                
                # Send done signal
                done_data = {
                    'type': 'done',
                    'message': {
                        'id': message_id,
                        'role': 'assistant',
                        'created_at': time.time()
                    },
                    'session_id': session_id
                }
                yield f"data: {json.dumps(done_data)}\n\n"
                
            except ImportError:
                logger.warning("⚠️ ChatService not available - using enhanced chatbot routes streaming")
                
                try:
                    # Try your enhanced chatbot routes for streaming
                    from app.api.chatbot.enhanced_routes import stream_chat_response
                    
                    # Send session info
                    yield f"data: {json.dumps({'type': 'info', 'session_id': session_id})}\n\n"
                    
                    message_id = str(uuid.uuid4())
                    
                    # Stream from your existing chatbot service
                    async for chunk in stream_chat_response(
                        message=message,
                        session_id=session_id,
                        client_id=client.client_id,
                        db=db
                    ):
                        chunk_data = {
                            'type': 'chunk',
                            'content': chunk,
                            'message_id': message_id
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                    
                    # Send done signal
                    done_data = {
                        'type': 'done',
                        'message': {
                            'id': message_id,
                            'role': 'assistant',
                            'created_at': time.time()
                        },
                        'session_id': session_id
                    }
                    yield f"data: {json.dumps(done_data)}\n\n"
                    
                except ImportError:
                    logger.warning("⚠️ Enhanced chatbot routes not available - using basic streaming")
                    
                    # Send session info
                    yield f"data: {json.dumps({'type': 'info', 'session_id': session_id})}\n\n"
                    
                    message_id = str(uuid.uuid4())
                    
                    # Basic streaming response indicating integration needed
                    response_text = f"Thank you for your message: '{message}'. To enable full AI functionality, please connect your LLM service to the ChatService. This widget is working correctly and ready for integration."
                    
                    # Stream word by word
                    words = response_text.split()
                    for word in words:
                        chunk_data = {
                            'type': 'chunk', 
                            'content': word + " ",
                            'message_id': message_id
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
                        'session_id': session_id
                    }
                    yield f"data: {json.dumps(done_data)}\n\n"
                    
            except Exception as stream_error:
                logger.error(f"❌ Streaming error: {stream_error}")
                error_data = {
                    'type': 'error',
                    'error': f"Streaming failed: {str(stream_error)}"
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        logger.info("✅ Starting real LLM streaming response")
        
        return StreamingResponse(
            generate_real_llm_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widget streaming error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

@router.get("/test")
async def test_widget_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """Test endpoint for widget connectivity - Enhanced."""
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
        
        # Test LLM service availability
        llm_service_status = "not_available"
        try:
            from app.services.chat.chat_service import ChatService
            llm_service_status = "available"
        except ImportError:
            try:
                from app.api.chatbot.enhanced_routes import process_chat_message
                llm_service_status = "enhanced_routes_available"
            except ImportError:
                llm_service_status = "basic_fallback"
        
        logger.info("✅ Widget test successful")
        return {
            "message": "Widget API is working!",
            "status": "success",
            "client_id": client.client_id,
            "client_name": client.name,
            "llm_service_status": llm_service_status,
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
    """Get default widget settings when client is not found or error occurs."""
    return {
        "primary_color": "#ea580c",
        "chatbot_name": "AI Assistant",
        "widget_position": "bottom-right",
        "show_typing_indicator": True,
        "enable_suggestions": True,
        "greeting_message": "Hello! How can I help you today?",
        "llm_provider": "deepseek",
        "llm_model": "deepseek-chat",
        "reset_on_page_refresh": True,
        "session_timeout": 30
    }