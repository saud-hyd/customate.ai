# backend/app/services/channel/channel_service.py
# Complete ChannelService implementation with all required methods

from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
import uuid

from app.core import logger

class ChannelService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_client_channels(self, client_id: str, platform: Optional[str] = None):
        """Get all channels for a client."""
        try:
            # Import here to avoid circular imports
            from app.domain.channel.entities import Channel
            
            query = self.db.query(Channel).filter(Channel.client_id == client_id)
            
            if platform:
                query = query.filter(Channel.platform == platform)
            
            channels = query.order_by(Channel.created_at.desc()).all()
            logger.info(f"Retrieved {len(channels)} channels for client {client_id}")
            return channels
        except Exception as e:
            logger.error(f"Error getting channels for client {client_id}: {str(e)}")
            return []
    
    def create_channel(self, client_id: str, channel_data: Dict[str, Any]):
        """Create a new channel for a client."""
        try:
            from app.domain.channel.entities import Channel
            
            # Add client_id to channel data
            channel_data["client_id"] = client_id
            
            # Generate webhook secret if not provided
            credentials = channel_data.get("credentials", {})
            if "webhook_secret" not in credentials:
                webhook_secret = f"webhook_{uuid.uuid4().hex[:16]}"
                credentials["webhook_secret"] = webhook_secret
                channel_data["credentials"] = credentials
            
            # Ensure active status
            if "active" not in channel_data:
                channel_data["active"] = True
            
            # Create the channel object
            channel = Channel(**channel_data)
            
            # Add to database
            self.db.add(channel)
            self.db.commit()
            self.db.refresh(channel)
            
            logger.info(f"Created channel {channel.channel_id} for client {client_id}")
            return channel
            
        except Exception as e:
            logger.error(f"Error creating channel: {str(e)}")
            self.db.rollback()
            raise
    
    def update_channel(self, client_id: str, channel_id: str, update_data: Dict[str, Any]):
        """Update a channel."""
        try:
            from app.domain.channel.entities import Channel
            
            # Get existing channel
            channel = self.db.query(Channel).filter(
                Channel.channel_id == channel_id,
                Channel.client_id == client_id
            ).first()
            
            if not channel:
                logger.warning(f"Channel {channel_id} not found for client {client_id}")
                return None
            
            # Update channel
            for key, value in update_data.items():
                if hasattr(channel, key):
                    setattr(channel, key, value)
            
            channel.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(channel)
            
            logger.info(f"Updated channel {channel_id}")
            return channel
            
        except Exception as e:
            logger.error(f"Error updating channel {channel_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def delete_channel(self, client_id: str, channel_id: str):
        """Delete a channel."""
        try:
            from app.domain.channel.entities import Channel
            
            # Get existing channel
            channel = self.db.query(Channel).filter(
                Channel.channel_id == channel_id,
                Channel.client_id == client_id
            ).first()
            
            if not channel:
                logger.warning(f"Channel {channel_id} not found for client {client_id}")
                return False
            
            # Delete channel
            self.db.delete(channel)
            self.db.commit()
            
            logger.info(f"Deleted channel {channel_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting channel {channel_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def get_channel_by_id(self, client_id: str, channel_id: str):
        """Get a specific channel by ID."""
        try:
            from app.domain.channel.entities import Channel
            
            channel = self.db.query(Channel).filter(
                Channel.channel_id == channel_id,
                Channel.client_id == client_id
            ).first()
            
            return channel
            
        except Exception as e:
            logger.error(f"Error getting channel {channel_id}: {str(e)}")
            return None
    
    # Additional methods for WhatsApp integration
    async def get_or_create_conversation(
        self,
        channel_id: str,
        platform_user_id: str,
        user_info: Dict[str, Any] = None
    ):
        """Get existing conversation or create a new one."""
        try:
            from app.domain.channel.entities import ChannelConversation
            
            # Try to find existing conversation
            conversation = self.db.query(ChannelConversation).filter(
                ChannelConversation.channel_id == channel_id,
                ChannelConversation.platform_user_id == platform_user_id
            ).first()
            
            if conversation:
                logger.info(f"Found existing conversation {conversation.conversation_id} for user {platform_user_id}")
                return conversation
            
            # Create new conversation
            user_info = user_info or {}
            conversation_data = {
                "channel_id": channel_id,
                "platform_user_id": platform_user_id,
                "user_name": user_info.get("name"),
                "user_profile_url": user_info.get("profile_url"),
                "conversation_metadata": user_info
            }
            
            conversation = ChannelConversation(**conversation_data)
            self.db.add(conversation)
            self.db.commit()
            self.db.refresh(conversation)
            
            logger.info(f"Created new conversation {conversation.conversation_id} for user {platform_user_id}")
            return conversation
            
        except Exception as e:
            logger.error(f"Error getting/creating conversation: {str(e)}")
            self.db.rollback()
            raise
    
    async def store_message(
        self,
        conversation_id: str,
        direction: str,  # "inbound" or "outbound"
        message_type: str,
        content: Optional[str] = None,
        platform_message_id: Optional[str] = None,
        media_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Store a message in the database."""
        try:
            from app.domain.channel.entities import ChannelMessage, ChannelConversation
            
            message_data = {
                "conversation_id": conversation_id,
                "direction": direction,
                "message_type": message_type,
                "content": content,
                "platform_message_id": platform_message_id,
                "media_url": media_url,
                "message_metadata": metadata or {}
            }
            
            message = ChannelMessage(**message_data)
            self.db.add(message)
            
            # Update conversation last_message_at
            conversation = self.db.query(ChannelConversation).filter(
                ChannelConversation.conversation_id == conversation_id
            ).first()
            
            if conversation:
                conversation.last_message_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(message)
            
            logger.info(f"Stored {direction} message {message.message_id} in conversation {conversation_id}")
            return message
            
        except Exception as e:
            logger.error(f"Error storing message: {str(e)}")
            self.db.rollback()
            raise
    
    async def link_conversation_to_chat_session(
        self,
        conversation_id: str,
        chat_session_id: str
    ):
        """Link a channel conversation to a chat session."""
        try:
            from app.domain.channel.entities import ChannelConversation
            
            conversation = self.db.query(ChannelConversation).filter(
                ChannelConversation.conversation_id == conversation_id
            ).first()
            
            if not conversation:
                raise ValueError(f"Conversation not found: {conversation_id}")
            
            # Only update if not already linked
            if not conversation.chat_session_id:
                conversation.chat_session_id = chat_session_id
                self.db.commit()
                self.db.refresh(conversation)
                logger.info(f"Linked conversation {conversation_id} to chat session {chat_session_id}")
            else:
                logger.info(f"Conversation {conversation_id} already linked to session {conversation.chat_session_id}")
            
            return conversation
            
        except Exception as e:
            logger.error(f"Error linking conversation to chat session: {str(e)}")
            self.db.rollback()
            raise