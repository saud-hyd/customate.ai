# backend/app/api/channel/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.channel_repository import ChannelRepository, ChannelConversationRepository, ChannelMessageRepository
from app.domain.channel.entities import ChannelMessage, ChannelConversation
from app.services.channel.channel_service import ChannelService
from app.core import logger

router = APIRouter(prefix="/channel", tags=["channel"])

# Schema classes
class ChannelCreate(BaseModel):
    name: str = Field(..., description="Display name for the channel")
    platform: str = Field(..., description="Platform type (whatsapp, facebook, instagram, twitter)")
    platform_identifier: str = Field(..., description="Platform-specific identifier (phone number, page ID, etc.)")
    credentials: Dict[str, Any] = Field(..., description="Platform-specific credentials")
    config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")

class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Display name for the channel")
    active: Optional[bool] = Field(None, description="Whether the channel is active")
    credentials: Optional[Dict[str, Any]] = Field(None, description="Platform-specific credentials")
    config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")

class ChannelResponse(BaseModel):
    channel_id: str
    name: str
    platform: str
    platform_identifier: str
    active: bool
    created_at: str
    webhook_url: str
    status: str

class ConversationSummary(BaseModel):
    conversation_id: str
    platform_user_id: str
    user_name: Optional[str]
    user_profile_url: Optional[str]
    last_message_at: str
    message_count: int
    last_message_preview: Optional[str]

class MessageResponse(BaseModel):
    message_id: str
    direction: str
    message_type: str
    content: Optional[str]
    media_url: Optional[str]
    created_at: str

class SendMessageRequest(BaseModel):
    conversation_id: str
    message_type: str = Field(default="text", description="Message type (text, image, audio, video, document, location)")
    content: Optional[str] = Field(None, description="Text content")
    media_url: Optional[str] = Field(None, description="URL for media content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

# Routes
@router.get("", response_model=List[ChannelResponse])
async def get_channels(
    request: Request,
    platform: Optional[str] = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all channels for the current client."""
    try:
        channel_service = ChannelService(db)
        # FIXED: Removed await - this method is not async
        channels = channel_service.get_client_channels(current_client.client_id, platform)
        
        base_url = f"{request.url.scheme}://{request.url.netloc}"
        
        return [
            {
                "channel_id": channel.channel_id,
                "name": channel.name,
                "platform": channel.platform,
                "platform_identifier": channel.platform_identifier,
                "active": channel.active,
                "created_at": channel.created_at.isoformat(),
                "webhook_url": f"{base_url}/api/channel/webhook/{channel.platform}/{channel.platform_identifier}",
                "status": "connected" if channel.active else "disconnected"
            }
            for channel in channels
        ]
    except Exception as e:
        logger.error(f"Error getting channels: {str(e)}")
        return []

@router.post("", response_model=ChannelResponse)
async def create_channel(
    channel_data: ChannelCreate,
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Create a new channel with credential validation."""
    try:
        # Convert Pydantic model to dict
        channel_dict = channel_data.dict()
        
        # STEP 1: Create channel in database (temporarily)
        channel_service = ChannelService(db)
        channel = channel_service.create_channel(current_client.client_id, channel_dict)
        
        # STEP 2: Test the credentials by initializing connector
        try:
            from app.services.channel.channel_connector import ChannelConnectorFactory
            
            # Create connector for the new channel
            connector = ChannelConnectorFactory.create_connector(db, channel)
            
            if not connector:
                # Delete the channel we just created
                channel_service.delete_channel(current_client.client_id, channel.channel_id)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported platform: {channel_dict['platform']}"
                )
            
            # CRITICAL: Actually test the credentials
            logger.info(f"Testing credentials for {channel_dict['platform']} channel {channel.channel_id}")
            is_valid = await connector.initialize()
            
            if not is_valid:
                # Delete the channel if credentials are invalid
                channel_service.delete_channel(current_client.client_id, channel.channel_id)
                
                # Return specific error based on platform
                if channel_dict['platform'] == 'whatsapp':
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid WhatsApp credentials. Please check your Access Token, Phone Number ID, and App Secret."
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid {channel_dict['platform']} credentials. Please verify your authentication details."
                    )
            
            logger.info(f"✅ Credentials validated successfully for channel {channel.channel_id}")
            
        except HTTPException:
            # Re-raise HTTP exceptions (these are our validation errors)
            raise
        except Exception as e:
            # Handle any other errors during validation
            logger.error(f"Error validating channel credentials: {str(e)}")
            
            # Clean up - delete the channel
            try:
                channel_service.delete_channel(current_client.client_id, channel.channel_id)
            except:
                pass
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to validate credentials. Please check your connection and try again."
            )
        
        # STEP 3: If we get here, credentials are valid
        # Generate webhook URL
        base_url = f"{request.url.scheme}://{request.url.netloc}"
        webhook_url = f"{base_url}/api/channel/webhook/{channel.platform}/{channel.platform_identifier}"
        
        return {
            "channel_id": channel.channel_id,
            "name": channel.name,
            "platform": channel.platform,
            "platform_identifier": channel.platform_identifier,
            "active": channel.active,
            "created_at": channel.created_at.isoformat(),
            "webhook_url": webhook_url,
            "status": "connected"  # Only return "connected" if validation passed
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions with their original status codes
        raise
    except Exception as e:
        logger.error(f"Error creating channel for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create channel: {str(e)}"
        )

@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: str,
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get channel details."""
    try:
        channel_repo = ChannelRepository()
        channel = channel_repo.get_by_channel_id(db, channel_id)
        
        if not channel or channel.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        # Generate webhook URL
        base_url = f"{request.url.scheme}://{request.url.netloc}"
        webhook_url = f"{base_url}/api/channel/webhook/{channel.platform}/{channel.platform_identifier}"
        
        return {
            "channel_id": channel.channel_id,
            "name": channel.name,
            "platform": channel.platform,
            "platform_identifier": channel.platform_identifier,
            "active": channel.active,
            "created_at": channel.created_at.isoformat(),
            "webhook_url": webhook_url,
            "status": "connected" if channel.active else "disconnected",
            "credentials": channel.credentials  

        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting channel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve channel: {str(e)}"
        )

@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: str,
    update_data: ChannelUpdate,
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Update a channel."""
    try:
        channel_service = ChannelService(db)
        # FIXED: Removed await - this method is not async
        channel = channel_service.update_channel(
            current_client.client_id, 
            channel_id, 
            update_data.dict(exclude_unset=True)
        )
        
        if not channel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        # Generate webhook URL
        base_url = f"{request.url.scheme}://{request.url.netloc}"
        webhook_url = f"{base_url}/api/channel/webhook/{channel.platform}/{channel.platform_identifier}"
        
        return {
            "channel_id": channel.channel_id,
            "name": channel.name,
            "platform": channel.platform,
            "platform_identifier": channel.platform_identifier,
            "active": channel.active,
            "created_at": channel.created_at.isoformat(),
            "webhook_url": webhook_url,
            "status": "connected" if channel.active else "disconnected"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating channel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update channel: {str(e)}"
        )

@router.delete("/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Delete a channel."""
    try:
        channel_service = ChannelService(db)
        # FIXED: Removed await - this method is not async
        success = channel_service.delete_channel(current_client.client_id, channel_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting channel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete channel: {str(e)}"
        )

@router.get("/{channel_id}/conversations", response_model=List[ConversationSummary])
async def get_channel_conversations(
    channel_id: str,
    skip: int = 0,
    limit: int = 50,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get conversations for a channel."""
    try:
        # Verify channel belongs to client
        channel_repo = ChannelRepository()
        channel = channel_repo.get_by_channel_id(db, channel_id)
        
        if not channel or channel.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        # Get conversations
        conversation_repo = ChannelConversationRepository()
        message_repo = ChannelMessageRepository()
        
        conversations = conversation_repo.get_by_channel_id(db, channel_id, limit=limit, skip=skip)
        
        result = []
        for conv in conversations:
            # Get latest message for preview
            messages = message_repo.get_by_conversation_id(db, conv.conversation_id, limit=1)
            last_message = messages[0] if messages else None
            
            # Count total messages
            # In a production scenario, you'd want to store this count in the conversation
            # to avoid counting on every request
            message_count = db.query(ChannelMessage).filter(
                ChannelMessage.conversation_id == conv.conversation_id
            ).count()
            
            result.append({
                "conversation_id": conv.conversation_id,
                "platform_user_id": conv.platform_user_id,
                "user_name": conv.user_name,
                "user_profile_url": conv.user_profile_url,
                "last_message_at": conv.last_message_at.isoformat(),
                "message_count": message_count,
                "last_message_preview": last_message.content[:50] + "..." if last_message and last_message.content and len(last_message.content) > 50 else last_message.content if last_message else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        return []

@router.get("/{channel_id}/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    channel_id: str,
    conversation_id: str,
    skip: int = 0,
    limit: int = 50,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get messages for a conversation."""
    try:
        # Verify channel belongs to client
        channel_repo = ChannelRepository()
        channel = channel_repo.get_by_channel_id(db, channel_id)
        
        if not channel or channel.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        # Verify conversation belongs to channel
        conversation_repo = ChannelConversationRepository()
        conversation = conversation_repo.get_by_conversation_id(db, conversation_id)
        
        if not conversation or conversation.channel_id != channel_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Get messages
        message_repo = ChannelMessageRepository()
        messages = message_repo.get_by_conversation_id(db, conversation_id, limit=limit, skip=skip)
        
        return [
            {
                "message_id": msg.message_id,
                "direction": msg.direction,
                "message_type": msg.message_type,
                "content": msg.content,
                "media_url": msg.media_url,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}")
        return []

@router.get("/{channel_id}/stats")
async def get_channel_stats(
    channel_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get real statistics for a channel."""
    try:
        # Verify channel belongs to client
        channel_repo = ChannelRepository()
        channel = channel_repo.get_by_channel_id(db, channel_id)
        
        if not channel or channel.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        # Get real statistics from database
        from sqlalchemy import text, func
        from datetime import datetime, timedelta
        
        # Total conversations
        total_conversations = db.query(func.count(ChannelConversation.id)).filter(
            ChannelConversation.channel_id == channel_id
        ).scalar() or 0
        
        # Total messages
        total_messages = db.execute(text("""
            SELECT COUNT(*) 
            FROM channel_messages cm
            JOIN channel_conversations cc ON cm.conversation_id = cc.conversation_id
            WHERE cc.channel_id = :channel_id
        """), {"channel_id": channel_id}).scalar() or 0
        
        # Active conversations today
        today = datetime.utcnow().date()
        active_today = db.query(func.count(ChannelConversation.id)).filter(
            ChannelConversation.channel_id == channel_id,
            func.date(ChannelConversation.last_message_at) == today
        ).scalar() or 0
        
        # Response rate calculation (outbound messages / inbound messages)
        inbound_count = db.execute(text("""
            SELECT COUNT(*) 
            FROM channel_messages cm
            JOIN channel_conversations cc ON cm.conversation_id = cc.conversation_id
            WHERE cc.channel_id = :channel_id AND cm.direction = 'inbound'
        """), {"channel_id": channel_id}).scalar() or 0
        
        outbound_count = db.execute(text("""
            SELECT COUNT(*) 
            FROM channel_messages cm
            JOIN channel_conversations cc ON cm.conversation_id = cc.conversation_id
            WHERE cc.channel_id = :channel_id AND cm.direction = 'outbound'
        """), {"channel_id": channel_id}).scalar() or 0
        
        # Calculate response rate
        if inbound_count > 0:
            response_rate = min(100, round((outbound_count / inbound_count) * 100))
        else:
            response_rate = 0
        
        # Average response time (in minutes)
        avg_response_time = db.execute(text("""
            SELECT AVG(
                EXTRACT(EPOCH FROM (
                    SELECT MIN(outbound.created_at)
                    FROM channel_messages outbound
                    JOIN channel_conversations cc2 ON outbound.conversation_id = cc2.conversation_id
                    WHERE cc2.channel_id = :channel_id 
                    AND outbound.direction = 'outbound'
                    AND outbound.created_at > inbound.created_at
                )) - EXTRACT(EPOCH FROM inbound.created_at)
            ) / 60 as avg_minutes
            FROM channel_messages inbound
            JOIN channel_conversations cc ON inbound.conversation_id = cc.conversation_id
            WHERE cc.channel_id = :channel_id 
            AND inbound.direction = 'inbound'
        """), {"channel_id": channel_id}).scalar()
        
        avg_response_minutes = round(avg_response_time) if avg_response_time else 0
        
        return {
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "active_today": active_today,
            "response_rate": response_rate,
            "avg_response_time_minutes": avg_response_minutes,
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting channel stats: {str(e)}")
        return {
            "total_conversations": 0,
            "total_messages": 0,
            "active_today": 0,
            "response_rate": 0,
            "avg_response_time_minutes": 0,
            "last_updated": datetime.utcnow().isoformat()
        }    

@router.post("/{channel_id}/send", response_model=Dict[str, Any])
async def send_message_to_channel(
    channel_id: str,
    message_data: SendMessageRequest,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Send a message to a channel conversation."""
    try:
        # Verify channel belongs to client
        channel_repo = ChannelRepository()
        channel = channel_repo.get_by_channel_id(db, channel_id)
        
        if not channel or channel.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        # Verify conversation belongs to channel
        conversation_repo = ChannelConversationRepository()
        conversation = conversation_repo.get_by_conversation_id(db, message_data.conversation_id)
        
        if not conversation or conversation.channel_id != channel_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Get connector for this channel
        from app.services.channel.channel_connector import ChannelConnectorFactory
        connector = ChannelConnectorFactory.create_connector(db, channel)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported platform: {channel.platform}"
            )
        
        # For Gmail channels, we need to extract recipient email from conversation
        send_metadata = message_data.metadata or {}
        if channel.platform == "gmail":
            # Extract recipient email from platform_user_id (which is the email)
            send_metadata["to_email"] = conversation.platform_user_id
            send_metadata["subject"] = send_metadata.get("subject", "Message from your AI assistant")
        
        # Send message
        result = await connector.send_message(
            conversation_id=conversation.conversation_id,
            message_type=message_data.message_type,
            content=message_data.content,
            media_url=message_data.media_url,
            metadata=send_metadata
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to send message")
            )
        
        return {
            "success": True,
            "message_id": result.get("message_id"),
            "platform_message_id": result.get("platform_message_id")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )