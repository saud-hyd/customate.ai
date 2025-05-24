# backend/app/api/widget/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import time
import logging

# Core imports that should always work
from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.core import logger

router = APIRouter()

@router.get("/test")
async def test_widget_endpoint():
    """Simple test endpoint to verify widget routes are working."""
    return {
        "message": "Widget API is working!",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "success"
    }

@router.get("/settings")
async def get_widget_settings(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get widget settings for the current client."""
    try:
        logger.info(f"Getting widget settings for client: {current_client.client_id if current_client else 'None'}")
        
        if not current_client:
            # Return default settings if no client found
            return {
                "primary_color": "#ea580c",
                "chatbot_name": "AI Assistant",
                "widget_position": "bottom-right",
                "enable_suggestions": True,
                "show_typing_indicator": True,
                "greeting_message": "Hello! How can I help you today?"
            }
        
        # Check if client has settings
        settings_data = {
            "primary_color": "#ea580c",
            "chatbot_name": "AI Assistant",
            "widget_position": "bottom-right",
            "enable_suggestions": True,
            "show_typing_indicator": True,
            "greeting_message": "Hello! How can I help you today?"
        }
        
        # Try to get client settings if available
        try:
            if hasattr(current_client, 'settings') and current_client.settings:
                settings = current_client.settings
                settings_data.update({
                    "primary_color": settings.primary_color or "#ea580c",
                    "chatbot_name": settings.chatbot_name or "AI Assistant",
                    "greeting_message": settings.greeting_message or "Hello! How can I help you today!",
                    "enable_suggestions": settings.enable_suggestions if settings.enable_suggestions is not None else True,
                    "show_typing_indicator": settings.enable_typing_indicator if settings.enable_typing_indicator is not None else True,
                    "widget_position": settings.widget_position or "bottom-right"
                })
        except Exception as e:
            logger.warning(f"Could not load client settings: {e}")
        
        return settings_data
        
    except Exception as e:
        logger.error(f"Error getting widget settings: {str(e)}")
        # Return default settings on error to prevent widget from breaking
        return {
            "primary_color": "#ea580c",
            "chatbot_name": "AI Assistant",
            "widget_position": "bottom-right",
            "enable_suggestions": True,
            "show_typing_indicator": True,
            "greeting_message": "Hello! How can I help you today?"
        }

@router.post("/message")
async def widget_send_message(
    message_data: Dict[str, Any],
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Simple message endpoint that returns a basic response."""
    try:
        if "message" not in message_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message field is required"
            )
        
        user_message = message_data["message"]
        session_id = message_data.get("session_id", f"session-{int(time.time())}")
        
        # Simple echo response for now
        response_content = f"Thank you for your message: '{user_message}'. This is a test response from the Customate.ai widget!"
        
        return {
            "message": {
                "id": f"msg-{int(time.time())}",
                "content": response_content,
                "role": "assistant",
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            },
            "session_id": session_id
        }
        
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
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Simple streaming message endpoint."""
    from fastapi.responses import StreamingResponse
    import json
    import asyncio
    
    if "message" not in message_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field is required"
        )
    
    user_message = message_data["message"]
    session_id = message_data.get("session_id", f"session-{int(time.time())}")
    
    async def generate_response():
        try:
            # Send session info first
            yield f"data: {json.dumps({'type': 'info', 'session_id': session_id})}\n\n"
            
            # Simulate streaming response
            response_text = f"Thank you for your message: '{user_message}'. This is a test streaming response from Customate.ai!"
            words = response_text.split()
            
            accumulated_text = ""
            for word in words:
                accumulated_text += word + " "
                yield f"data: {json.dumps({'type': 'chunk', 'content': word + ' '})}\n\n"
                await asyncio.sleep(0.1)  # Simulate delay
            
            # Send completion
            yield f"data: {json.dumps({'type': 'complete', 'content': accumulated_text.strip()})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in streaming response: {str(e)}")
            error_data = {
                "type": "error",
                "error": "I'm sorry, I encountered an error while processing your request."
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/plain",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        }
    )

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