from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.domain.chat.entities import ConversationContext
from app.repositories.chat_repository import ConversationContextRepository
from app.core import logger

class ContextManager:
    """
    Manages conversation context throughout a chat session.
    
    Handles:
    - Storing and retrieving conversation history
    - Tracking entities and intents over time
    - Managing context window size
    - Providing formatted history for LLM
    """
    
    def __init__(self, max_history_length: int = 4):
        self.max_history_length = max_history_length
        self.context_repo = ConversationContextRepository()
    
    def initialize_context(self, db: Session, session_id: str) -> Dict[str, Any]:
        """
        Initialize a new conversation context.
        
        Args:
            db: Database session
            session_id: Chat session ID
            
        Returns:
            Newly created context
        """
        default_context = {
            "session_id": session_id,
            "history": [],
            "entities": {},
            "intent_history": [],
            "summary": "",
        }
        
        context_obj = self.context_repo.create(
            db,
            obj_in={
                "session_id": session_id,
                "context_data": default_context,
            }
        )
        
        return context_obj.context_data
    
    def get_context(self, db: Session, session_id: str) -> Dict[str, Any]:
        """
        Get the current conversation context.
        
        Args:
            db: Database session
            session_id: Chat session ID
            
        Returns:
            Current context or a new context if none exists
        """
        context_obj = self.context_repo.get_by_session_id(db, session_id)
        
        if not context_obj:
            return self.initialize_context(db, session_id)
        
        return context_obj.context_data
    
    def update_context(
        self,
        db: Session,
        session_id: str,
        user_message: str,
        assistant_message: str,
        context_updates: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Update conversation context with new messages and updates.
        
        Args:
            db: Database session
            session_id: Chat session ID
            user_message: User's message
            assistant_message: Assistant's response
            context_updates: Additional context updates
            
        Returns:
            Updated context
        """
        context_obj = self.context_repo.get_by_session_id(db, session_id)
        
        if not context_obj:
            context = self.initialize_context(db, session_id)
        else:
            context = context_obj.context_data
        
        # Add messages to history
        if "history" not in context:
            context["history"] = []
        
        context["history"].append({"role": "user", "content": user_message})
        context["history"].append({"role": "assistant", "content": assistant_message})
        
        # Trim history if needed
        if len(context["history"]) > self.max_history_length * 2:  # *2 because each exchange has 2 messages
            context["history"] = context["history"][-self.max_history_length * 2:]
        
        # Apply additional context updates
        if context_updates:
            for key, value in context_updates.items():
                context[key] = value
        
        # Update in database
        self.context_repo.update_context(db, session_id, context)
        
        return context
    
    def format_history(self, context: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Format conversation history for the LLM.
        
        Args:
            context: Conversation context
            
        Returns:
            Formatted history as a list of role/content dictionaries
        """
        if "history" not in context:
            return []
        
        return context["history"]