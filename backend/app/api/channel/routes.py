# backend/app/api/channel/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.channel_repository import ChannelRepository, ChannelConversationRepository, ChannelMessageRepository
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
    platform: Optional[str] = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all channels for the current client."""
    channel_service = ChannelService(db)
    channels = await channel_service.get_client_channels(current_client.client_id, platform)
    
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

@router.post("", response_model=ChannelResponse)
async def create_channel(
    channel_data: ChannelCreate,
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Create a new channel."""
    # Convert Pydantic model to dict
    channel_dict = channel_data.dict()
    
    # Create channel
    channel_service = ChannelService(db)
    channel = await channel_service.create_channel(current_client.client_id, channel_dict)
    
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

@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: str,
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get channel details."""
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
        "status": "connected" if channel.active else "disconnected"
    }

@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: str,
    update_data: ChannelUpdate,
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Update a channel."""
    channel_service = ChannelService(db)
    channel = await channel_service.update_channel(
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

@router.delete("/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Delete a channel."""
    channel_service = ChannelService(db)
    success = await channel_service.delete_channel(current_client.client_id, channel_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    return Response(status_code=204)

@router.get("/{channel_id}/conversations", response_model=List[ConversationSummary])
async def get_channel_conversations(
    channel_id: str,
    skip: int = 0,
    limit: int = 50,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get conversations for a channel."""
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

@router.post("/{channel_id}/send", response_model=Dict[str, Any])
async def send_message_to_channel(
    channel_id: str,
    message_data: SendMessageRequest,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Send a message to a channel conversation."""
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
    
    # Send message
    result = await connector.send_message(
        conversation_id=conversation.conversation_id,
        message_type=message_data.message_type,
        content=message_data.content,
        media_url=message_data.media_url,
        metadata=message_data.metadata
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