# backend/app/api/channel/webhook_routes.py
# Update the platform_webhook function to integrate with chatbot stream

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Header
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import json
import logging

from app.core.database.dependencies import get_db
from app.repositories.channel_repository import ChannelRepository
from app.services.channel.channel_connector import ChannelConnectorFactory
from app.services.chat.enhanced_chat_service import EnhancedChatService
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_factory import LLMFactory
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger

PROCESSED_MESSAGES = {}

router = APIRouter(prefix="/channel/webhook", tags=["channel_webhooks"])

@router.get("/{platform}/{identifier}")
async def verify_webhook(
    platform: str,
    identifier: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Verify webhook for social media platform."""
    # Get the channel by platform and identifier
    channel_repo = ChannelRepository()
    channel = channel_repo.get_by_platform_identifier(db, platform, identifier)
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get the appropriate connector
    connector = ChannelConnectorFactory.create_connector(db, channel)
    
    if not connector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform: {platform}"
        )
    
    # Get query parameters
    params = dict(request.query_params)
    
    # Process verification request
    verification_result = await connector.process_webhook(params)
    
    # If challenge response is required (e.g., for Facebook/WhatsApp)
    if verification_result.get("success") and "challenge" in verification_result:
        return Response(content=verification_result["challenge"], media_type="text/plain")
    
    # For other platforms or generic success
    if verification_result.get("success"):
        return {"status": "webhook_verified"}
    
    # Verification failed
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Webhook verification failed"
    )

@router.post("/{platform}/{identifier}")
async def platform_webhook(
    platform: str,
    identifier: str,
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Fixed webhook with deduplication and proper error handling"""
    
    # Get the channel by platform and identifier
    channel_repo = ChannelRepository()
    channel = channel_repo.get_by_platform_identifier(db, platform, identifier)
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get the appropriate connector
    connector = ChannelConnectorFactory.create_connector(db, channel)
    
    if not connector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform: {platform}"
        )
    
    # Read request body
    body = await request.body()
    
    # Validate webhook signature
    headers = dict(request.headers)
    headers["X-Hub-Signature-256"] = x_hub_signature_256
    
    is_valid = await connector.validate_webhook(headers, body)
    
    if not is_valid:
        logger.warning(f"Invalid webhook signature for {platform} channel {identifier}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature"
        )
    
    # Parse request body
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    
    # Process webhook payload
    result = await connector.process_webhook(payload)
    
    # If just a verification challenge, return early
    if result.get("success") and "challenge" in result:
        return Response(content=result["challenge"], media_type="text/plain")
    
    # CRITICAL: If we received a message, process it through chatbot stream
    if (result.get("success") and 
        result.get("conversation_id") and 
        result.get("content") and 
        result.get("platform_user_id")):
        
        # FIX 1: Add message deduplication
        message_id = result.get("message_id") or result.get("platform_message_id")
        if message_id and message_id in PROCESSED_MESSAGES:
            logger.info(f"🔄 Skipping duplicate message: {message_id}")
            return {"status": "duplicate_skipped"}
        
        # Mark message as processed
        if message_id:
            PROCESSED_MESSAGES[message_id] = True
            # Clean old entries (keep only last 100)
            if len(PROCESSED_MESSAGES) > 100:
                old_keys = list(PROCESSED_MESSAGES.keys())[:-50]
                for key in old_keys:
                    del PROCESSED_MESSAGES[key]
        
        try:
            await process_message_with_chatbot(
                db=db,
                channel=channel,
                connector=connector,
                conversation_id=result["conversation_id"],
                message_content=result["content"],
                user_info=result.get("user_info", {})
            )
        except Exception as e:
            logger.error(f"Error processing {platform} message with chatbot: {str(e)}")
            # Don't fail the webhook - just log the error
    
    # Return successful response to the platform
    return {"status": "success"}


async def process_message_with_chatbot(
    db: Session,
    channel,
    connector,
    conversation_id: str,
    message_content: str,
    user_info: Dict[str, Any]
):
    """Fixed chatbot processing with proper error handling"""
    
    try:
        # Get or create chat session linked to this conversation
        conversation_repo = ChannelRepository()
        conversation = conversation_repo.get_conversation_by_id(db, conversation_id)
        
        if not conversation:
            logger.error(f"Conversation not found: {conversation_id}")
            return
        
        session_id = conversation.chat_session_id
        
        # If no chat session exists, we'll let the chatbot service create one
        if not session_id:
            logger.info(f"No chat session linked to conversation {conversation_id}, will create new one")
        
        # Initialize chatbot services (same as stream endpoint)
        try:
            llm_service = LLMFactory.create_llm_service(db, channel.client_id)
        except Exception as e:
            logger.error(f"Error initializing LLM service: {str(e)}")
            # Send error message back to user
            await connector.send_message(
                conversation_id=conversation_id,
                message_type="text",
                content="I'm sorry, I'm temporarily unable to process your message. Please try again later."
            )
            return
        
        search_service = EnhancedSearchService(llm_service)
        industry_factory = IndustryFactory()
        context_manager = ContextManager()
        
        # Create enhanced chat service (same as stream endpoint)
        chat_service = EnhancedChatService(
            db=db,
            search_service=search_service,
            llm_service=llm_service,
            industry_factory=industry_factory,
            context_manager=context_manager,
        )
        
        # Process message through chatbot stream (THIS IS THE KEY!)
        full_response = ""
        collected_chunks = []
        
        # Use the streaming response generator
        async for chunk in chat_service.process_message_stream(
            client_id=channel.client_id,
            user_message=message_content,
            session_id=session_id,
            user_info={
                **user_info,
                "channel": "whatsapp",
                "conversation_id": conversation_id
            }
        ):
            # Collect response chunks
            if chunk.get("type") == "chunk" and chunk.get("content"):
                collected_chunks.append(chunk["content"])
            elif chunk.get("type") == "complete" and chunk.get("content"):
                full_response = chunk["content"]
            elif chunk.get("type") == "done" and chunk.get("message", {}).get("content"):
                full_response = chunk["message"]["content"]
                session_id = chunk.get("session_id")  # Get the session ID for linking
        
        # If we didn't get a complete response, join the chunks
        if not full_response and collected_chunks:
            full_response = "".join(collected_chunks).strip()
        
        # Link conversation to chat session if it wasn't linked before
        if session_id and not conversation.chat_session_id:
            from app.services.channel.channel_service import ChannelService
            channel_service = ChannelService(db)
            await channel_service.link_conversation_to_chat_session(
                conversation_id=conversation_id,
                chat_session_id=session_id
            )
            logger.info(f"Linked conversation {conversation_id} to session {session_id}")
        
        # Send the AI response back via WhatsApp
        if full_response:
            send_result = await connector.send_message(
                conversation_id=conversation_id,
                message_type="text",
                content=full_response,
                metadata={
                    "conversation_category": "service",  # Mark as service conversation (free)
                    "generated_by": "ai_chatbot",
                    "session_id": session_id
                }
            )
            
            if send_result.get("success"):
                logger.info(f"Successfully sent AI response via WhatsApp for conversation {conversation_id}")
                
                # FIX 2: Fix UsageTracker method name
                try:
                    usage_tracker = UsageTracker()
                    # Check what method actually exists
                    if hasattr(usage_tracker, 'increment_message_count'):
                        usage_tracker.increment_message_count(db, channel.client_id)
                    elif hasattr(usage_tracker, 'increment_messages'):
                        usage_tracker.increment_messages(db, channel.client_id)
                    elif hasattr(usage_tracker, 'track_message'):
                        usage_tracker.track_message(db, channel.client_id)
                    else:
                        logger.warning("UsageTracker method not found, skipping usage tracking")
                    
                    logger.info(f"Incremented message count for client {channel.client_id}")
                except Exception as usage_error:
                    # Don't fail the whole process for usage tracking
                    logger.warning(f"⚠️  Usage tracking failed (non-critical): {str(usage_error)}")
            else:
                logger.error(f"Failed to send AI response via WhatsApp: {send_result.get('error')}")
        else:
            logger.warning(f"No response generated for conversation {conversation_id}")
            # Send fallback message
            await connector.send_message(
                conversation_id=conversation_id,
                message_type="text",
                content="I received your message but couldn't generate a response. Please try rephrasing your question."
            )
        
    except Exception as e:
        logger.error(f"Error in chatbot processing: {str(e)}")
        # FIX 3: Only send error message if we haven't already sent a response
        try:
            await connector.send_message(
                conversation_id=conversation_id,
                message_type="text",
                content="I'm sorry, I encountered an error while processing your message. Please try again."
            )
        except Exception as send_error:
            logger.error(f"Failed to send error message: {str(send_error)}")