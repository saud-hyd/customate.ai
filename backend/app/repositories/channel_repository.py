# backend/app/repositories/channel_repository.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from app.domain.channel.entities import Channel, ChannelConversation, ChannelMessage
from app.repositories.base_repository import BaseRepository

class ChannelRepository(BaseRepository[Channel, Dict[str, Any], Dict[str, Any]]):
    """Repository for Channel entity."""
    
    def __init__(self):
        super().__init__(Channel)
    
    def get_by_channel_id(self, db: Session, channel_id: str) -> Optional[Channel]:
        """Get channel by channel_id."""
        return db.query(self.model).filter(self.model.channel_id == channel_id).first()
    
    def get_by_client_id(self, db: Session, client_id: str, platform: Optional[str] = None) -> List[Channel]:
        """Get all channels for a client, optionally filtered by platform."""
        query = db.query(self.model).filter(self.model.client_id == client_id)
        
        if platform:
            query = query.filter(self.model.platform == platform)
        
        return query.all()
    
    def get_active_by_client_id(self, db: Session, client_id: str, platform: Optional[str] = None) -> List[Channel]:
        """Get active channels for a client, optionally filtered by platform."""
        query = db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.active == True
        )
        
        if platform:
            query = query.filter(self.model.platform == platform)
        
        return query.all()
    
    def get_conversation_by_id(self, db: Session, conversation_id: str) -> Optional[ChannelConversation]:
        """Get conversation by conversation ID."""
        return db.query(ChannelConversation).filter(
            ChannelConversation.conversation_id == conversation_id
        ).first()
    
    def get_by_platform_identifier(self, db: Session, platform: str, identifier: str) -> Optional[Channel]:
        """Get channel by platform and identifier."""
        return db.query(Channel).filter(
            Channel.platform == platform,
            Channel.platform_identifier == identifier,
            Channel.active == True
        ).first()
        
        

class ChannelConversationRepository(BaseRepository[ChannelConversation, Dict[str, Any], Dict[str, Any]]):
    """Repository for ChannelConversation entity."""
    
    def __init__(self):
        super().__init__(ChannelConversation)
    
    def get_by_conversation_id(self, db: Session, conversation_id: str) -> Optional[ChannelConversation]:
        """Get conversation by conversation ID."""
        return db.query(ChannelConversation).filter(
            ChannelConversation.conversation_id == conversation_id
        ).first()
        
    def get_by_platform_user(
        self, 
        db: Session, 
        channel_id: str, 
        platform_user_id: str
    ) -> Optional[ChannelConversation]:
        """Get conversation by channel and platform user ID."""
        return db.query(ChannelConversation).filter(
            ChannelConversation.channel_id == channel_id,
            ChannelConversation.platform_user_id == platform_user_id
        ).first()        
    
    def get_by_channel_id(self, db: Session, channel_id: str, limit: int = 100, skip: int = 0) -> List[ChannelConversation]:
        """Get conversations for a channel with pagination."""
        return db.query(self.model).filter(
            self.model.channel_id == channel_id
        ).order_by(desc(self.model.last_message_at)).offset(skip).limit(limit).all()
    
    def get_by_platform_user_id(self, db: Session, channel_id: str, platform_user_id: str) -> Optional[ChannelConversation]:
        """Get conversation by channel_id and platform_user_id."""
        return db.query(self.model).filter(
            self.model.channel_id == channel_id,
            self.model.platform_user_id == platform_user_id
        ).first()
    
    def get_by_platform_conversation_id(self, db: Session, channel_id: str, platform_conversation_id: str) -> Optional[ChannelConversation]:
        """Get conversation by channel_id and platform_conversation_id."""
        return db.query(self.model).filter(
            self.model.channel_id == channel_id,
            self.model.platform_conversation_id == platform_conversation_id
        ).first()

class ChannelMessageRepository(BaseRepository[ChannelMessage, Dict[str, Any], Dict[str, Any]]):
    """Repository for ChannelMessage entity."""
    
    def __init__(self):
        super().__init__(ChannelMessage)
    
    def get_by_message_id(self, db: Session, message_id: str) -> Optional[ChannelMessage]:
        """Get message by message_id."""
        return db.query(self.model).filter(self.model.message_id == message_id).first()
    
    def get_by_conversation_id(self, db: Session, conversation_id: str, limit: int = 50, skip: int = 0) -> List[ChannelMessage]:
        """Get messages for a conversation with pagination."""
        return db.query(self.model).filter(
            self.model.conversation_id == conversation_id
        ).order_by(desc(self.model.created_at)).offset(skip).limit(limit).all()
    
    def get_by_platform_message_id(self, db: Session, conversation_id: str, platform_message_id: str) -> Optional[ChannelMessage]:
        """Get message by conversation_id and platform_message_id."""
        return db.query(self.model).filter(
            self.model.conversation_id == conversation_id,
            self.model.platform_message_id == platform_message_id
        ).first()
    
    def mark_as_delivered(self, db: Session, message_id: str) -> Optional[ChannelMessage]:
        """Mark message as delivered."""
        message = self.get_by_message_id(db, message_id)
        if message and message.direction == "outbound":
            message.delivered_at = datetime.utcnow()
            db.add(message)
            db.commit()
            db.refresh(message)
        return message
    
    def mark_as_read(self, db: Session, message_id: str) -> Optional[ChannelMessage]:
        """Mark message as read."""
        message = self.get_by_message_id(db, message_id)
        if message and message.direction == "outbound":
            message.read_at = datetime.utcnow()
            db.add(message)
            db.commit()
            db.refresh(message)
        return message