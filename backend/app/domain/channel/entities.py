# backend/app/domain/channel/entities.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.orm import relationship

from app.core.database.session import Base

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class Channel(Base):
    """Channel entity representing a social media connection for a client."""
    
    __tablename__ = "channels"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)  # whatsapp, facebook, instagram, twitter
    name = Column(String(100), nullable=False)
    active = Column(Boolean, default=True)
    credentials = Column(JSON, nullable=True)  # Platform-specific auth details
    webhook_secret = Column(String(255), nullable=True)  # For webhook verification
    platform_identifier = Column(String(255), nullable=True)  # Phone number for WhatsApp, page ID for Facebook, etc.
    config = Column(JSON, nullable=True)  # Additional configuration
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - removed back_populates to fix circular reference
    # client = relationship("Client", back_populates="channels")  # Removed to fix circular reference
    conversations = relationship("ChannelConversation", back_populates="channel", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Channel {self.platform}: {self.name}>"

class ChannelConversation(Base):
    """Channel conversation entity representing a social media conversation."""
    
    __tablename__ = "channel_conversations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    channel_id = Column(String(36), ForeignKey("channels.channel_id", ondelete="CASCADE"), nullable=False)
    chat_session_id = Column(String(36), ForeignKey("chat_sessions.session_id", ondelete="SET NULL"), nullable=True)
    platform_user_id = Column(String(255), nullable=False)  # User ID from the platform
    platform_conversation_id = Column(String(255), nullable=True)  # Conversation ID from platform (if applicable)
    user_name = Column(String(255), nullable=True)  # User name/handle from platform
    user_profile_url = Column(String(512), nullable=True)  # User profile pic or URL
    last_message_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    conversation_metadata = Column(JSON, nullable=True)  # Platform-specific metadata
    
    # Relationships
    channel = relationship("Channel", back_populates="conversations")
    messages = relationship("ChannelMessage", back_populates="conversation", cascade="all, delete-orphan")
    session = relationship("ChatSession", backref="channel_conversations")
    
    def __repr__(self):
        return f"<ChannelConversation {self.conversation_id} ({self.platform_user_id})>"

class ChannelMessage(Base):
    """Channel message entity representing a message in a social media conversation."""
    
    __tablename__ = "channel_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("channel_conversations.conversation_id", ondelete="CASCADE"), nullable=False)
    platform_message_id = Column(String(255), nullable=True)  # Message ID from platform
    direction = Column(String(10), nullable=False)  # 'inbound' or 'outbound'
    message_type = Column(String(20), nullable=False, default="text")  # text, image, audio, video, document, location
    content = Column(Text, nullable=True)  # Text content
    media_url = Column(String(512), nullable=True)  # URL for media
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)  # When message was delivered (for outbound)
    read_at = Column(DateTime, nullable=True)  # When message was read (for outbound)
    message_metadata = Column(JSON, nullable=True)  # Platform-specific metadata
    
    # Relationships
    conversation = relationship("ChannelConversation", back_populates="messages")
    
    def __repr__(self):
        return f"<ChannelMessage {self.message_id} ({self.direction})>"