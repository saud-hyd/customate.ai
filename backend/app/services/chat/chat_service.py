from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.domain.chat.entities import ChatSession, ChatMessage, ConversationContext
from app.repositories.chat_repository import ChatSessionRepository, ChatMessageRepository
from app.services.knowledge.similarity_service import SimilarityService
from app.services.llm.llm_service import LLMService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager
from app.core import logger

class ChatService:
    """
    Main service for handling chat interactions. This service:
    1. Processes incoming user messages
    2. Retrieves relevant knowledge base information
    3. Manages conversation context
    4. Generates appropriate responses using the LLM
    5. Applies industry-specific behavior
    """
    
    def __init__(
        self,
        db: Session,
        similarity_service: SimilarityService,
        llm_service: LLMService,
        industry_factory: IndustryFactory,
        context_manager: ContextManager,
    ):
        self.db = db
        self.similarity_service = similarity_service
        self.llm_service = llm_service
        self.industry_factory = industry_factory
        self.context_manager = context_manager
        self.session_repo = ChatSessionRepository()
        self.message_repo = ChatMessageRepository()
    
    async def process_message(
        self, client_id: str, session_id: str, user_message: str, user_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process a user message and generate a response.
        
        Args:
            client_id: ID of the client
            session_id: ID of the chat session
            user_message: The user's message text
            user_info: Additional user information for context
            
        Returns:
            Response with assistant message and session info
        """
        # Get or create session
        session = self._get_or_create_session(client_id, session_id, user_info)
        
        # Save user message
        user_msg = self._save_message(session.session_id, "user", user_message)
        
        # Get conversation context
        context = self.context_manager.get_context(self.db, session.session_id)
        
        # Get industry-specific service
        industry_service = self.industry_factory.get_industry_service(client_id)
        
        # Get relevant knowledge base items
        relevant_knowledge = await self.similarity_service.find_similar(
            client_id, user_message, limit=5
        )
        
        # Apply industry-specific processing
        industry_context = industry_service.process_message(user_message, context)
        
        # Generate response using LLM
        llm_response = await self.llm_service.generate_response(
            user_message=user_message,
            conversation_history=self.context_manager.format_history(context),
            knowledge_context=relevant_knowledge,
            industry_context=industry_context
        )
        
        # Save assistant message
        assistant_msg = self._save_message(session.session_id, "assistant", llm_response["content"])
        
        # Update context
        self.context_manager.update_context(
            self.db,
            session.session_id,
            user_message,
            llm_response["content"],
            llm_response.get("context_updates", {})
        )
        
        # Return response
        return {
            "message": {
                "id": assistant_msg.message_id,
                "content": assistant_msg.content,
                "created_at": assistant_msg.created_at.isoformat(),
            },
            "session_id": session.session_id,
        }
    
    def _get_or_create_session(
        self, client_id: str, session_id: Optional[str], user_info: Dict[str, Any] = None
    ) -> ChatSession:
        """Get existing session or create a new one."""
        if session_id:
            session = self.session_repo.get_by_session_id(self.db, session_id)
            if session and session.client_id == client_id:
                return session
        
        # Create new session
        session_data = {
            "client_id": client_id,
            "user_id": user_info.get("user_id") if user_info else None,
            "ip_address": user_info.get("ip_address") if user_info else None,
            "user_agent": user_info.get("user_agent") if user_info else None,
            "referrer": user_info.get("referrer") if user_info else None,
        }
        
        session = self.session_repo.create(self.db, obj_in=session_data)
        
        # Initialize context
        self.context_manager.initialize_context(self.db, session.session_id)
        
        return session
    
    def _save_message(self, session_id: str, role: str, content: str) -> ChatMessage:
        """Save a message to the database."""
        message_data = {
            "session_id": session_id,
            "role": role,
            "content": content,
        }
        
        return self.message_repo.create(self.db, obj_in=message_data)
    
    def get_chat_history(self, client_id: str, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get chat history for a specific session."""
        session = self.session_repo.get_by_session_id(self.db, session_id)
        if not session or session.client_id != client_id:
            return []
        
        messages = self.message_repo.get_by_session_id(self.db, session_id, limit=limit)
        
        return [
            {
                "id": msg.message_id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ]