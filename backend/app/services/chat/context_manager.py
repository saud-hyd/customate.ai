# backend/app/services/chat/context_manager.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.repositories.chat_repository import ChatMessageRepository
from app.core import logger

class ContextManager:
    """
    Simplified context manager - let OpenAI handle context naturally.
    Just retrieves message history without artificial limits or complex tracking.
    """
    
    def __init__(self, max_history_length: int = 30):
        """
        Initialize with expanded history length for better context understanding.
        30 messages = 15 exchanges provides better context for knowledge base queries.
        """
        self.max_history_length = max_history_length
        self.message_repo = ChatMessageRepository()
    
    def get_context(self, db: Session, session_id: str) -> Dict[str, Any]:
        """
        Get minimal context - just session ID for compatibility.
        Real context comes from format_history which gets actual messages.
        """
        return {"session_id": session_id}
    
    def format_history(self, context: Dict[str, Any], db: Session, session_id: str) -> List[Dict[str, str]]:
        """
        Get conversation history directly from database.
        Let OpenAI handle the context naturally without artificial limits.
        """
        try:
            # Get recent messages from database
            messages = self.message_repo.get_by_session_id(
                db, 
                session_id, 
                limit=self.max_history_length
            )
            
            # Convert to format OpenAI expects
            formatted_messages = []
            for msg in reversed(messages):  # Reverse to get chronological order
                formatted_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            logger.info(f"Retrieved {len(formatted_messages)} messages for session {session_id}")
            return formatted_messages
            
        except Exception as e:
            logger.error(f"Error retrieving message history: {str(e)}")
            return []
    
    def initialize_context(self, db: Session, session_id: str) -> Dict[str, Any]:
        """
        Simplified context initialization - just return session ID.
        No complex tracking needed.
        """
        return {"session_id": session_id}
    
    def update_context(
        self,
        db: Session,
        session_id: str,
        user_message: str,
        assistant_message: str,
        context_updates: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Simplified context update - messages are already saved in database.
        No need for complex context tracking since OpenAI handles context naturally.
        """
        # Messages are already saved by the chat service
        # No complex context tracking needed - OpenAI handles this naturally
        logger.info(f"Context updated for session {session_id}")
        return {"session_id": session_id}