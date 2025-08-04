# app/repositories/chat_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
import sqlalchemy.orm

from app.domain.chat.entities import ChatSession, ChatMessage, ConversationContext
from app.repositories.base_repository import BaseRepository

class ChatSessionRepository(BaseRepository[ChatSession, dict, dict]):
    """Repository for ChatSession entity."""
    
    def __init__(self):
        super().__init__(ChatSession)
    
    def get_by_session_id(self, db: Session, session_id: str) -> Optional[ChatSession]:
        """Get chat session by session_id."""
        return db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    
    def get_by_client_id(self, db: Session, client_id: str, limit: int = 100, skip: int = 0) -> List[ChatSession]:
        """Get chat sessions for a client with pagination."""
        return db.query(self.model).filter(
            self.model.client_id == client_id
        ).order_by(desc(self.model.created_at)).offset(skip).limit(limit).all()
        
    def count_by_client_id(self, db: Session, client_id: str) -> int:
        """Count total chat sessions for a client."""
        from sqlalchemy import func
        return db.query(func.count(self.model.id)).filter(
            self.model.client_id == client_id
        ).scalar() or 0

    def get_by_client_id_with_summary(self, db: Session, client_id: str, limit: int = 100, skip: int = 0) -> List[ChatSession]:
        """Get chat sessions for a client with minimal data (no messages loaded)."""
        return db.query(self.model).filter(
            self.model.client_id == client_id
        ).order_by(desc(self.model.created_at)).offset(skip).limit(limit).options(
            # Prevent loading the messages relationship
            sqlalchemy.orm.noload(self.model.messages)
        ).all()        
    
    def get_by_user_id(self, db: Session, user_id: str) -> List[ChatSession]:
        """Get all chat sessions for a user."""
        return db.query(ChatSession).filter(ChatSession.user_id == user_id).all()

class ChatMessageRepository(BaseRepository[ChatMessage, dict, dict]):
    """Repository for ChatMessage entity."""
    
    def __init__(self):
        super().__init__(ChatMessage)
    
    def get_by_message_id(self, db: Session, message_id: str) -> Optional[ChatMessage]:
        """Get chat message by message_id."""
        return db.query(ChatMessage).filter(ChatMessage.message_id == message_id).first()
    
    def get_by_session_id(self, db: Session, session_id: str, limit: int = 50) -> List[ChatMessage]:
        """Get chat messages for a session with limit."""
        return db.query(ChatMessage)\
            .filter(ChatMessage.session_id == session_id)\
            .order_by(ChatMessage.created_at)\
            .limit(limit)\
            .all()
            
    def count_by_session_id(self, db: Session, session_id: str) -> int:
        """Count messages in a session without loading them."""
        from sqlalchemy import func
        return db.query(func.count(self.model.id)).filter(
            self.model.session_id == session_id
        ).scalar() or 0            

class ConversationContextRepository(BaseRepository[ConversationContext, dict, dict]):
    """Repository for ConversationContext entity."""
    
    def __init__(self):
        super().__init__(ConversationContext)
    
    def get_by_context_id(self, db: Session, context_id: str) -> Optional[ConversationContext]:
        """Get conversation context by context_id."""
        return db.query(ConversationContext).filter(ConversationContext.context_id == context_id).first()
    
    def get_by_session_id(self, db: Session, session_id: str) -> Optional[ConversationContext]:
        """Get conversation context for a session."""
        return db.query(ConversationContext).filter(ConversationContext.session_id == session_id).first()
    
    def update_context(self, db: Session, session_id: str, context_data: dict) -> ConversationContext:
        """Update or create conversation context for a session."""
        context = self.get_by_session_id(db, session_id)
        
        if context:
            # Update existing context
            context.context_data = context_data
            db.add(context)
            db.commit()
            db.refresh(context)
            return context
        else:
            # Create new context
            new_context = ConversationContext(
                session_id=session_id,
                context_data=context_data
            )
            db.add(new_context)
            db.commit()
            db.refresh(new_context)
            return new_context