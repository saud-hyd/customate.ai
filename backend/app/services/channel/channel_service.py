# backend/app/services/channel/channel_service.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.domain.channel.entities import Channel, ChannelConversation, ChannelMessage
from app.repositories.channel_repository import ChannelRepository, ChannelConversationRepository, ChannelMessageRepository
from app.core import logger

class ChannelService:
    """
    Service for managing social media channels.
    
    This service:
    1. Manages channel configuration
    2. Creates and updates conversations
    3. Tracks message history
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.channel_repo = ChannelRepository()
        self.conversation_repo = ChannelConversationRepository()
        self.message_repo = ChannelMessageRepository()
    
    async def create_channel(self, client_id: str, channel_data: Dict[str, Any]) -> Channel:
        """
        Create a new social media channel.
        
        Args:
            client_id: Client ID
            channel_data: Channel configuration data
            
        Returns:
            Created channel
        """
        # Ensure client ID is set
        channel_data["client_id"] = client_id
        
        # Generate webhook secret
        import secrets
        channel_data["webhook_secret"] = secrets.token_hex(16)
        
        # Create the channel
        channel = self.channel_repo.create(self.db, obj_in=channel_data)
        
        logger.info(f"Created channel: {channel.platform} for client {client_id}")
        
        return channel
    
    async def update_channel(self, client_id: str, channel_id: str, update_data: Dict[str, Any]) -> Optional[Channel]:
        """
        Update an existing channel.
        
        Args:
            client_id: Client ID
            channel_id: Channel ID
            update_data: Data to update
            
        Returns:
            Updated channel or None if not found
        """
        channel = self.channel_repo.get_by_channel_id(self.db, channel_id)
        
        if not channel or channel.client_id != client_id:
            logger.warning(f"Channel not found or doesn't belong to client: {channel_id}, {client_id}")
            return None
        
        updated_channel = self.channel_repo.update(self.db, db_obj=channel, obj_in=update_data)
        
        logger.info(f"Updated channel: {channel_id}")
        
        return updated_channel
    
    async def delete_channel(self, client_id: str, channel_id: str) -> bool:
        """
        Delete a channel.
        
        Args:
            client_id: Client ID
            channel_id: Channel ID
            
        Returns:
            True if deleted, False otherwise
        """
        channel = self.channel_repo.get_by_channel_id(self.db, channel_id)
        
        if not channel or channel.client_id != client_id:
            logger.warning(f"Channel not found or doesn't belong to client: {channel_id}, {client_id}")
            return False
        
        self.channel_repo.delete(self.db, id=channel.id)
        
        logger.info(f"Deleted channel: {channel_id}")
        
        return True
    
    async def get_client_channels(self, client_id: str, platform: Optional[str] = None) -> List[Channel]:
        """
        Get all channels for a client, optionally filtered by platform.
        
        Args:
            client_id: Client ID
            platform: Optional platform filter
            
        Returns:
            List of channels
        """
        return self.channel_repo.get_by_client_id(self.db, client_id, platform)
    
    async def get_or_create_conversation(
        self, 
        channel_id: str,
        platform_user_id: str,
        platform_conversation_id: Optional[str] = None,
        user_name: Optional[str] = None,
        user_profile_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChannelConversation:
        """
        Get an existing conversation or create a new one.
        
        Args:
            channel_id: Channel ID
            platform_user_id: User ID from the platform
            platform_conversation_id: Optional conversation ID from the platform
            user_name: Optional user name
            user_profile_url: Optional user profile URL
            metadata: Optional metadata
            
        Returns:
            Conversation object
        """
        # Check if conversation exists by platform user ID
        conversation = self.conversation_repo.get_by_platform_user_id(
            self.db, channel_id, platform_user_id
        )
        
        # If platform conversation ID provided, also check that
        if not conversation and platform_conversation_id:
            conversation = self.conversation_repo.get_by_platform_conversation_id(
                self.db, channel_id, platform_conversation_id
            )
        
        # Create new conversation if not found
        if not conversation:
            conversation_data = {
                "channel_id": channel_id,
                "platform_user_id": platform_user_id,
                "platform_conversation_id": platform_conversation_id,
                "user_name": user_name,
                "user_profile_url": user_profile_url,
                "metadata": metadata or {}
            }
            
            conversation = self.conversation_repo.create(self.db, obj_in=conversation_data)
            
            logger.info(f"Created new conversation: {conversation.conversation_id} for channel {channel_id}")
        else:
            # Update conversation if needed
            update_needed = False
            update_data = {}
            
            if user_name and conversation.user_name != user_name:
                update_data["user_name"] = user_name
                update_needed = True
                
            if user_profile_url and conversation.user_profile_url != user_profile_url:
                update_data["user_profile_url"] = user_profile_url
                update_needed = True
                
            if metadata:
                merged_metadata = conversation.metadata or {}
                merged_metadata.update(metadata)
                update_data["metadata"] = merged_metadata
                update_needed = True
                
            if update_needed:
                conversation = self.conversation_repo.update(self.db, db_obj=conversation, obj_in=update_data)
        
        return conversation
    
    async def record_message(
        self,
        conversation_id: str,
        direction: str,
        message_type: str,
        content: Optional[str] = None,
        platform_message_id: Optional[str] = None,
        media_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChannelMessage:
        """
        Record a message in a conversation.
        
        Args:
            conversation_id: Conversation ID
            direction: 'inbound' or 'outbound'
            message_type: Message type (text, image, etc.)
            content: Optional text content
            platform_message_id: Optional message ID from platform
            media_url: Optional media URL
            metadata: Optional metadata
            
        Returns:
            Created message
        """
        # Get conversation
        conversation = self.conversation_repo.get_by_conversation_id(self.db, conversation_id)
        
        if not conversation:
            raise ValueError(f"Conversation not found: {conversation_id}")
        
        # Create message
        message_data = {
            "conversation_id": conversation_id,
            "direction": direction,
            "message_type": message_type,
            "content": content,
            "platform_message_id": platform_message_id,
            "media_url": media_url,
            "metadata": metadata
        }
        
        message = self.message_repo.create(self.db, obj_in=message_data)
        
        # Update conversation last_message_at
        self.conversation_repo.update(
            self.db, 
            db_obj=conversation, 
            obj_in={"last_message_at": datetime.utcnow()}
        )
        
        logger.info(f"Recorded {direction} message: {message.message_id} in conversation {conversation_id}")
        
        return message
    
    async def link_conversation_to_chat_session(
        self,
        conversation_id: str,
        chat_session_id: str
    ) -> ChannelConversation:
        """
        Link a channel conversation to a chat session.
        
        Args:
            conversation_id: Conversation ID
            chat_session_id: Chat session ID
            
        Returns:
            Updated conversation
        """
        conversation = self.conversation_repo.get_by_conversation_id(self.db, conversation_id)
        
        if not conversation:
            raise ValueError(f"Conversation not found: {conversation_id}")
        
        conversation = self.conversation_repo.update(
            self.db,
            db_obj=conversation,
            obj_in={"chat_session_id": chat_session_id}
        )
        
        logger.info(f"Linked conversation {conversation_id} to chat session {chat_session_id}")
        
        return conversation