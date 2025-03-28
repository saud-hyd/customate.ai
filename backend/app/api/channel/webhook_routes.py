# backend/app/api/channel/webhook_routes.py
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
from app.core import logger

router = APIRouter(prefix="/channel/webhook", tags=["channel_webhooks"])

@router.get("/{platform}/{identifier}")
async def verify_webhook(
    platform: str,
    identifier: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verify webhook for social media platform.
    Used for initial webhook setup.
    """
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
    """
    Receive webhook events from social media platforms.
    """
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
    headers["X-Hub-Signature-256"] = x_hub_signature_256  # Add normalized header name
    
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
    
    # If we received a message, process it with the chatbot
    if result.get("success") and result.get("conversation_id") and result.get("message_id"):
        try:
            # Get message and conversation
            conversation_repo = channel_repo = ChannelRepository()
            conversation = conversation_repo.get_by_conversation_id(db, result["conversation_id"])
            
            if conversation:
                # Initialize services for chat processing
                llm_service = LLMFactory.create_llm_service(db, channel.client_id)
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
                
                # Get the message from repository
                message_repo = ChannelMessageRepository()
                message = message_repo.get_by_message_id(db, result["message_id"])
                
                if message and message.direction == "inbound" and message.content:
                    # Link to existing chat session or create a new one
                    session_id = conversation.chat_session_id
                    
                    # Process the message with the chatbot
                    response = await chat_service.process_message(
                        client_id=channel.client_id,
                        session_id=session_id,
                        user_message=message.content,
                        user_info={
                            "user_id": conversation.platform_user_id,
                            "channel_id": channel.channel_id,
                            "conversation_id": conversation.conversation_id
                        }
                    )
                    
                    # If this is a new session, link it to the conversation
                    if not session_id and response.get("session_id"):
                        conversation = await channel_service.link_conversation_to_chat_session(
                            conversation_id=conversation.conversation_id,
                            chat_session_id=response["session_id"]
                        )
                    
                    # Send the response back through the connector
                    if response.get("message") and response["message"].get("content"):
                        await connector.send_message(
                            conversation_id=conversation.conversation_id,
                            message_type="text",
                            content=response["message"]["content"]
                        )
                
        except Exception as e:
            logger.error(f"Error processing channel message: {str(e)}", exc_info=True)
            # Don't fail the webhook handler, just log the error
    
    # Return successful response to the platform
    return {"status": "success"}