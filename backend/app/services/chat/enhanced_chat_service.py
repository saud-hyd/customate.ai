# app/services/chat/enhanced_chat_service.py
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.domain.chat.entities import ChatSession, ChatMessage, ConversationContext
from app.repositories.chat_repository import ChatSessionRepository, ChatMessageRepository
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_service import LLMService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager
from app.core import logger

class EnhancedChatService:
    """
    Enhanced service for handling chat interactions with improved knowledge integration.
    
    This service:
    1. Processes incoming user messages with more context awareness
    2. Uses hybrid search for better knowledge retrieval
    3. Improves knowledge integration in responses
    4. Tracks knowledge usage in conversation context
    5. Provides better handling of follow-up questions
    """
    
    def __init__(
        self,
        db: Session,
        search_service: EnhancedSearchService,
        llm_service: LLMService,
        industry_factory: IndustryFactory,
        context_manager: ContextManager,
    ):
        self.db = db
        self.search_service = search_service
        self.llm_service = llm_service
        self.industry_factory = industry_factory
        self.context_manager = context_manager
        self.session_repo = ChatSessionRepository()
        self.message_repo = ChatMessageRepository()
    
    async def process_message(
        self, client_id: str, session_id: str, user_message: str, user_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process a user message and generate a response with enhanced knowledge integration.
        
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
        
        # Apply industry-specific processing
        industry_context = industry_service.process_message(user_message, context)
        
        # Determine if this is a follow-up question
        is_followup = self._is_followup_question(user_message, context)
        
        # Get knowledge search parameters based on context
        search_params = self._get_search_parameters(user_message, context, is_followup)
        
        # Perform enhanced knowledge retrieval
        knowledge_results = await self.search_service.hybrid_search(
            client_id=client_id,
            query_text=user_message,
            filters=search_params.get("filters"),
            limit=search_params.get("limit", 3),
            hybrid_ratio=search_params.get("hybrid_ratio", 0.7),
        )
        
        # Process and format knowledge for the LLM
        knowledge_context = self._format_knowledge_for_llm(
            knowledge_results, 
            context,
            is_followup
        )
        
        # Generate response using LLM with enhanced context
        llm_response = await self.llm_service.generate_response(
            user_message=user_message,
            conversation_history=self.context_manager.format_history(context),
            knowledge_context=knowledge_context.get("formatted_knowledge"),
            industry_context=industry_context
        )
        
        # Save assistant message
        assistant_msg = self._save_message(session.session_id, "assistant", llm_response["content"])
        
        # Update context with knowledge references
        context_updates = llm_response.get("context_updates", {})
        
        # Add knowledge references to context
        if knowledge_context.get("knowledge_refs"):
            context_updates["knowledge_references"] = knowledge_context.get("knowledge_refs")
        
        # Update context
        self.context_manager.update_context(
            self.db,
            session.session_id,
            user_message,
            llm_response["content"],
            context_updates
        )
        
        # Return response
        return {
            "message": {
                "id": assistant_msg.message_id,
                "content": assistant_msg.content,
                "created_at": assistant_msg.created_at.isoformat(),
            },
            "session_id": session.session_id,
            "knowledge_used": len(knowledge_context.get("knowledge_refs", [])) > 0,
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
    
    def _is_followup_question(self, message: str, context: Dict[str, Any]) -> bool:
        """
        Determine if the current message is a follow-up question based on
        conversation context and message content.
        """
        # Check for explicit references to previous context
        followup_indicators = [
            "what about", "how about", "tell me more", "explain further",
            "why", "how", "what does that mean", "can you explain", 
            "what is", "who is", "when", "where"
        ]
        
        message_lower = message.lower()
        
        # Check for pronouns that might indicate a follow-up
        has_pronouns = any(pronoun in message_lower.split() for pronoun in 
                           ["it", "this", "that", "these", "those", "they", "them"])
        
        # Check for explicit follow-up indicators
        has_indicators = any(indicator in message_lower for indicator in followup_indicators)
        
        # Check message length - short messages are often follow-ups
        is_short_message = len(message.split()) <= 5
        
        # Check if previous knowledge was referenced
        has_prev_knowledge = "knowledge_references" in context and len(context["knowledge_references"]) > 0
        
        # Combine signals
        is_followup = (has_pronouns or has_indicators or is_short_message) and has_prev_knowledge
        
        return is_followup
    
    def _get_search_parameters(
        self, message: str, context: Dict[str, Any], is_followup: bool
    ) -> Dict[str, Any]:
        """
        Determine appropriate search parameters based on message and context.
        Adjusts search behavior for follow-up questions.
        """
        # Default parameters
        params = {
            "limit": 5,
            "hybrid_ratio": 0.7,  # Favor vector search by default
            "filters": {}
        }
        
        # For follow-up questions, we want to search within the same context
        if is_followup and "knowledge_references" in context:
            recent_refs = context["knowledge_references"][-3:]  # Last 3 references
            
            # Extract collection IDs
            collection_ids = list(set(ref.get("collection_id") for ref in recent_refs if "collection_id" in ref))
            
            if collection_ids:
                # If we have multiple collections, don't filter by collection
                # If we have just one, use it as a filter
                if len(collection_ids) == 1:
                    params["filters"]["collection_id"] = collection_ids[0]
                
                # For follow-ups, we want more precision in the results
                params["hybrid_ratio"] = 0.8  # Even stronger vector preference
                params["limit"] = 3  # Fewer, more focused results
        
        # Adjust parameters based on message length
        msg_length = len(message.split())
        if msg_length <= 3:
            # Very short queries work better with keyword search
            params["hybrid_ratio"] = 0.4  # More weight to keyword search
        elif msg_length >= 15:
            # Longer queries work better with vector search
            params["hybrid_ratio"] = 0.8  # More weight to vector search
            params["limit"] = 7  # More results for complex queries
        
        return params
    
    def _format_knowledge_for_llm(
        self, 
        knowledge_results: Dict[str, Any], 
        context: Dict[str, Any],
        is_followup: bool
    ) -> Dict[str, Any]:
        """
        Format knowledge results for the LLM prompt.
        Handles context tracking and follow-up question adjustments.
        """
        results = knowledge_results.get("results", [])
        
        if not results:
            return {"formatted_knowledge": [], "knowledge_refs": []}
        
        # Track references for context
        knowledge_refs = []
        
        # Format knowledge items for LLM
        formatted_knowledge = []
        
        for item in results:
            # Create reference for context tracking
            ref = {
                "item_id": item["item_id"],
                "collection_id": item["collection_id"],
                "collection_name": item.get("collection_name", "Unknown"),
                "title": item["title"],
                "score": item.get("hybrid_score", 0),
            }
            knowledge_refs.append(ref)
            
            # Format for LLM prompt
            formatted_item = {
                "title": item["title"],
                "content": item["content"],
                "source": f"{item.get('collection_name', 'Knowledge Base')}",
                "relevance": "high" if item.get("hybrid_score", 0) > 0.7 else "medium"
            }
            formatted_knowledge.append(formatted_item)
        
        # For follow-up questions, provide context from previous knowledge
        if is_followup and "knowledge_references" in context:
            prev_knowledge = context["knowledge_references"][-2:]  # Last 2 references
            
            # Add a note about this being a follow-up
            if formatted_knowledge:
                formatted_knowledge[0]["note"] = "This is a follow-up question. Previous context may be relevant."
            
            # Add previous context indicator
            if prev_knowledge:
                formatted_knowledge.append({
                    "title": "Previous Context",
                    "content": "The user's question appears to be a follow-up to previously discussed information.",
                    "source": "Conversation History",
                    "relevance": "context"
                })
        
        return {
            "formatted_knowledge": formatted_knowledge,
            "knowledge_refs": knowledge_refs
        }
    
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