import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.orm import relationship

from app.core.database.session import Base

class ChatSession(Base):
    """Chat session entity representing a conversation between a user and the chatbot."""
    
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(255), nullable=True)  # External user identifier
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    referrer = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    context = relationship("ConversationContext", back_populates="session", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ChatSession {self.session_id}>"

# Update the ChatMessage class to rename the metadata column
class ChatMessage(Base):
    """Chat message entity representing a single message in a conversation."""
    
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("chat_sessions.session_id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    message_metadata = Column(JSON, nullable=True)  # Changed from 'metadata' to 'message_metadata'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    
    def __repr__(self):
        return f"<ChatMessage {self.message_id} ({self.role})>"
    
class ConversationContext(Base):
    """Conversation context entity storing the current state and context of a conversation."""
    
    __tablename__ = "conversation_contexts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    context_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("chat_sessions.session_id", ondelete="CASCADE"), nullable=False)
    context_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="context")
    
    def __repr__(self):
        return f"<ConversationContext {self.context_id}>"