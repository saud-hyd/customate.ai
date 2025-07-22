# backend/app/services/chat/enhanced_chat_service.py
from typing import Dict, Any, List, Optional, Tuple, AsyncGenerator
import time
import uuid
import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.repositories.chat_repository import ChatSessionRepository, ChatMessageRepository
from app.services.chat.context_manager import ContextManager
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_service import LLMService
from app.core.config.multilingual_settings import multilingual_settings
from app.repositories.integration_repository import IntegrationRepository
from app.services.integration.integration_service import IntegrationService
from app.core import logger

class EnhancedChatService:
    """
    Universal chat service with RAG, external integrations, and off-topic protection.
    
    This service provides:
    - RAG-based knowledge retrieval with relevance filtering
    - External integration data retrieval (Shopify, Salesforce, Zendesk)
    - Streaming and regular chat responses
    - Business-focused off-topic protection
    - Session and context management
    - Multilingual support
    """
    
    def __init__(
        self,
        db: Session,
        search_service: EnhancedSearchService,
        llm_service: LLMService,
        context_manager: ContextManager
    ):
        self.db = db
        self.search_service = search_service
        self.llm_service = llm_service
        self.context_manager = context_manager
        self.session_repo = ChatSessionRepository()
        self.message_repo = ChatMessageRepository()
        self.integration_repo = IntegrationRepository()
        self.integration_service = IntegrationService()
        
        # RAG relevance threshold - adjust based on your needs
        self.relevance_threshold = 0.4
        
        # Business-focused fallback responses for off-topic queries
        self.fallback_responses = [
            "I can only help with questions related to our products and services. Is there something specific about our business I can assist you with?",
            "I don't have information about that topic. I'm here to help with questions about our company, products, or services. What would you like to know?",
            "That's outside my area of expertise. I specialize in helping with our business-related inquiries. How can I assist you with our products or services?",
            "I focus on providing information about our company and offerings. Is there something business-related I can help you with instead?"
        ]
    
    async def process_message(
        self,
        client_id: str,
        user_message: str, 
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        SIMPLIFIED: Non-streaming version using same logic.
        """
        # Collect streaming response
        full_response = ""
        response_data = {}
        
        async for chunk in self.process_message_stream(
            client_id=client_id,
            user_message=user_message,
            session_id=session_id,
            user_info=user_info
        ):
            if chunk.get("type") == "info":
                response_data.update(chunk)
            elif chunk.get("type") == "chunk":
                full_response += chunk.get("content", "")
            elif chunk.get("type") == "done":
                final_message = chunk.get("message", {})
                full_response = final_message.get("content", full_response)
                response_data["message"] = final_message
                break
        
        return response_data
    
    async def process_message_stream(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        SIMPLIFIED: Process message with GPT-4 native context handling.
        
        Key simplifications:
        - Removed artificial follow-up detection
        - Removed complex knowledge context enhancement  
        - Let GPT-4 handle context naturally with full conversation history
        """
        start_time = time.time()
        message_id = str(uuid.uuid4())
        
        # Get or create session (unchanged)
        session = self._get_or_create_session(client_id, session_id, user_info)
        session_id = session.session_id
        
        # Save user message (unchanged)
        user_message_db = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "user", 
            "content": user_message,
            "message_metadata": user_info,
            "created_at": datetime.utcnow()
        })
        
        # SIMPLIFIED: Get full conversation history (no artificial limits)
        context = self.context_manager.get_context(self.db, session_id)
        conversation_history = self.context_manager.format_history(context, self.db, session_id)
        
        # SIMPLIFIED: Basic knowledge search (no complex enhancement)
        knowledge_context = []
        knowledge_used = False
        max_relevance_score = 0.0
        
        try:
            search_results = await self.search_service.hybrid_search(
                client_id=client_id,
                query_text=user_message,
                limit=5,  # Simple limit
                hybrid_ratio=0.7
            )
            
            if search_results.get("results"):
                knowledge_used = True
                knowledge_context = [
                    {
                        "title": item["title"],
                        "content": item["content"], 
                        "source": item.get("collection_name", "Knowledge Base")
                    }
                    for item in search_results["results"]
                ]
                max_relevance_score = max([item.get("hybrid_score", 0) for item in search_results["results"]], default=0)
                
        except Exception as e:
            logger.error(f"Knowledge search error: {str(e)}")
            # Continue without knowledge if search fails
        
        # Send initial info
        yield {
            "type": "info",
            "session_id": session_id,
            "knowledge_used": knowledge_used,
            "integration_used": False,
            "message_id": message_id
        }
        
        # SIMPLIFIED: Generate response with full conversation history
        full_response = ""
        
        try:
            async for content_chunk in self.llm_service.generate_response_stream(
                user_message=user_message,
                conversation_history=conversation_history,  # Full history, not truncated
                knowledge_context=knowledge_context if knowledge_used else None,
                industry_context={
                    "instructions": "You are a helpful business assistant. Use the provided knowledge base to answer questions accurately and professionally."
                }
            ):
                full_response += content_chunk
                yield {
                    "type": "chunk",
                    "content": content_chunk,
                    "message_id": message_id
                }
                
        except Exception as e:
            logger.error(f"LLM generation error: {str(e)}")
            error_response = "I apologize, but I'm having trouble generating a response right now. Please try again."
            yield {
                "type": "chunk", 
                "content": error_response,
                "message_id": message_id
            }
            full_response = error_response
        
        # Save assistant message
        assistant_message = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "assistant",
            "content": full_response,
            "message_id": message_id,
            "message_metadata": {
                "knowledge_used": knowledge_used,
                "max_relevance_score": max_relevance_score,
                "knowledge_items_found": len(knowledge_context),
                "response_time_ms": int((time.time() - start_time) * 1000),
                "simplified_context": True  # Flag to track simplified processing
            },
            "created_at": datetime.utcnow()
        })
        
        # SIMPLIFIED: Context update (automatic via message storage)
        self.context_manager.update_context(
            self.db, 
            session_id, 
            user_message, 
            full_response,
            {
                "knowledge_used": knowledge_used,
                "max_relevance_score": max_relevance_score
            }
        )
        
        # Final response
        yield {
            "type": "done",
            "message": {
                "content": full_response,
                "role": "assistant", 
                "id": message_id,
                "created_at": datetime.utcnow().isoformat()
            }
        }
    
    def get_chat_history(
        self,
        client_id: str,
        session_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get chat history for a session.
        
        Args:
            client_id: Client ID
            session_id: Session ID
            limit: Maximum number of messages to return
            
        Returns:
            List of messages
        """
        # Get session
        session = self.session_repo.get_by_session_id(self.db, session_id)
        if not session or session.client_id != client_id:
            return []
        
        # Get messages
        messages = self.message_repo.get_by_session_id(self.db, session_id, limit)
        
        # Format messages
        return [
            {
                "id": message.message_id,
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
                "metadata": message.message_metadata
            }
            for message in messages
        ]
    
    def _get_fallback_response(self) -> str:
        """Get a business-focused fallback response for off-topic queries."""
        import random
        return random.choice(self.fallback_responses)
    
    def _get_or_create_session(
        self,
        client_id: str,
        session_id: Optional[str],
        user_info: Optional[Dict[str, Any]]
    ):
        """Get existing session or create a new one."""
        if session_id:
            # Continue existing session
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
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return self.session_repo.create(self.db, obj_in=session_data)
    
    def _should_use_integration(self, user_message: str) -> bool:
        """Determine if external integration data should be used."""
        # Check for integration-relevant keywords
        integration_keywords = [
            "order", "ticket", "product", "customer", "account", "subscription",
            "issue", "purchase", "billing", "contact", "inventory", "status"
        ]
        
        message_lower = user_message.lower()
        return any(keyword in message_lower for keyword in integration_keywords)
    
    async def _fetch_integration_data(
        self, 
        client_id: str, 
        user_message: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch relevant data from integrated external services.
        
        Args:
            client_id: Client ID
            user_message: Original user message
            
        Returns:
            List of data items or None if no relevant data found
        """
        try:
            # Get active integrations for the client
            integrations = self.integration_repo.get_active_by_client_id(self.db, client_id)
            
            if not integrations:
                return None
            
            # Simple keyword-based integration selection
            message_lower = user_message.lower()
            
            # Determine integration priority based on message content
            if any(word in message_lower for word in ["ticket", "issue", "support", "problem"]):
                target_provider = "zendesk"
                resource_type = "tickets"
            elif any(word in message_lower for word in ["product", "item", "inventory", "stock"]):
                target_provider = "shopify"
                resource_type = "products"
            elif any(word in message_lower for word in ["order", "purchase", "shipping", "delivery"]):
                target_provider = "shopify"
                resource_type = "orders"
            elif any(word in message_lower for word in ["contact", "customer", "account", "lead"]):
                target_provider = "salesforce"
                resource_type = "contacts"
            else:
                # Default to first available integration
                if integrations:
                    first_integration = integrations[0]
                    target_provider = first_integration.provider
                    # Default resource types by provider
                    resource_type = {
                        "shopify": "products",
                        "zendesk": "tickets", 
                        "salesforce": "contacts"
                    }.get(target_provider, "products")
                else:
                    return None
            
            # Find matching integration
            target_integration = None
            for integration in integrations:
                if integration.provider == target_provider:
                    target_integration = integration
                    break
            
            if not target_integration:
                return None
            
            # Extract query from user message (simple keyword extraction)
            query_words = [word for word in user_message.split() if len(word) > 3]
            query = " ".join(query_words[:3]) if query_words else user_message
            
            # Get data from integration
            return self.integration_service.get_data(
                target_integration,
                resource_type,
                query=query,
                filters=None
            )
            
        except Exception as e:
            logger.error(f"Error fetching integration data: {str(e)}")
            return None