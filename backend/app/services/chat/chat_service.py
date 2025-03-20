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
        Process a user message with enhanced knowledge integration.
        """
        # Initialize subscription usage if needed
        try:
            self.usage_tracker.initialize_subscription_usage(self.db, client_id)
        except Exception as e:
            logger.error(f"Error initializing subscription usage: {str(e)}")
        
        # Get or create session
        session = self._get_or_create_session(client_id, session_id, user_info)
        
        # Save user message
        user_msg = self._save_message(session.session_id, "user", user_message)
        
        # Get conversation context
        context = self.context_manager.get_context(self.db, session.session_id)
        
        # Check if this is a follow-up question
        is_followup = self._is_followup_question(user_message, context)
        
        # Get industry-specific processing
        industry_service = self.industry_factory.get_industry_service(client_id)
        industry_context = industry_service.process_message(user_message, context)
        
        # Adjust search parameters for follow-up questions
        hybrid_ratio = 0.8 if is_followup else 0.7  # More vector weight for follow-ups
        limit = 3 if is_followup else 5  # Fewer, more focused results for follow-ups
        collection_id = None
        
        # For follow-ups, try to focus on same collections as previous messages
        if is_followup and "context_updates" in context and "knowledge_references" in context["context_updates"]:
            recent_refs = context["context_updates"]["knowledge_references"]
            if recent_refs and len(recent_refs) == 1:
                # If only one collection was used, filter to just that collection
                collection_id = recent_refs[0].get("collection_id")
        
        # Get relevant knowledge base items with hybrid search
        knowledge_results = await self.similarity_service.hybrid_search(
            client_id=client_id,
            query_text=user_message,
            limit=limit,
            collection_id=collection_id,
            hybrid_ratio=hybrid_ratio
        )
        
        # Process and enhance knowledge for LLM
        knowledge_items = self._enhance_knowledge_context(
            knowledge_results.get("results", []),
            user_message,
            context,
            is_followup
        )
        
        # Generate response using LLM
        llm_response = await self.llm_service.generate_response(
            user_message=user_message,
            conversation_history=self.context_manager.format_history(context),
            knowledge_context=knowledge_items,
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
            context.get("context_updates", {})
        )
        
        # Return response with knowledge usage info
        return {
            "message": {
                "id": assistant_msg.message_id,
                "content": assistant_msg.content,
                "created_at": assistant_msg.created_at.isoformat(),
            },
            "session_id": session.session_id,
            "knowledge_used": len(knowledge_items) > 0,
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
    
    def _is_followup_question(self, message: str, context: Dict[str, Any]) -> bool:
        """
        Determine if a message is likely a follow-up question.
        
        Args:
            message: User message
            context: Conversation context
            
        Returns:
            Boolean indicating if this is likely a follow-up
        """
        # Check for explicit references or pronouns
        followup_indicators = [
            "what about", "how about", "tell me more", "explain further",
            "why", "how", "what does that mean", "can you explain", 
            "it", "this", "that", "these", "those"
        ]
        
        message_lower = message.lower()
        has_indicator = any(indicator in message_lower for indicator in followup_indicators)
        
        # Short questions are often follow-ups
        is_short = len(message.split()) <= 5
        
        # Context must have history to be a follow-up
        has_history = "history" in context and len(context["history"]) >= 2
        
        return (has_indicator or is_short) and has_history

    def _enhance_knowledge_context(
        self, 
        knowledge_items: List[Dict[str, Any]], 
        user_message: str,
        context: Dict[str, Any],
        is_followup: bool
    ) -> List[Dict[str, Any]]:
        """
        Enhance knowledge items with context awareness and relevance signals.
        
        Args:
            knowledge_items: Raw knowledge items
            user_message: User's message
            context: Conversation context
            is_followup: Whether this is a follow-up question
            
        Returns:
            Enhanced knowledge items
        """
        if not knowledge_items:
            return []
        
        # Track context references for later
        knowledge_refs = []
        
        # Format for LLM consumption
        enhanced_items = []
        
        for item in knowledge_items:
            # Create reference for context tracking
            ref = {
                "item_id": item["item_id"],
                "collection_id": item["collection_id"],
                "collection_name": item.get("collection_name", "Unknown"),
                "title": item["title"],
                "score": item.get("similarity", item.get("hybrid_score", 0)),
            }
            knowledge_refs.append(ref)
            
            # Get confidence level based on score
            confidence = "high" if ref["score"] > 0.8 else "medium" if ref["score"] > 0.6 else "low"
            
            # Format for LLM
            formatted_item = {
                "title": item["title"],
                "content": item["content"],
                "source": f"{item.get('collection_name', 'Knowledge Base')}",
                "relevance": confidence
            }
            enhanced_items.append(formatted_item)
        
        # Add follow-up context if applicable
        if is_followup and "history" in context:
            # Get most recent assistant message
            recent_messages = [msg for msg in context["history"] if msg["role"] == "assistant"]
            
            if recent_messages:
                latest_message = recent_messages[-1]["content"]
                # Add context from previous response
                enhanced_items.append({
                    "title": "Previous Context",
                    "content": f"This appears to be a follow-up question. From your previous response: '{latest_message[:150]}...'",
                    "source": "Conversation History",
                    "relevance": "context"
                })
        
        # Add reference to context updates
        if "context_updates" not in context:
            context["context_updates"] = {}
        
        context["context_updates"]["knowledge_references"] = knowledge_refs
        
        return enhanced_items
                