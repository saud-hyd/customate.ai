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
from app.services.llm.deepseek_service import DeepSeekService
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
        llm_service: DeepSeekService,
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
        Process a user message and generate a response with RAG and integration support.
        
        Args:
            client_id: Client ID
            user_message: User message text
            session_id: Optional session ID for continuing conversations
            user_info: Optional user information
            
        Returns:
            Response data including the assistant's message
        """
        start_time = time.time()
        
        # Get or create session
        session = self._get_or_create_session(client_id, session_id, user_info)
        session_id = session.session_id
        
        # Add user message to database
        user_message_db = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "user",
            "content": user_message,
            "created_at": datetime.utcnow()
        })
        
        # Get conversation context
        context = self.context_manager.get_context(self.db, session_id)
        
        # Search for relevant knowledge with hybrid search
        search_results = await self.search_service.hybrid_search(
            client_id, 
            user_message,
            limit=5
        )

        # Get the actual results list from the search_results dictionary
        results_list = search_results.get("results", [])
        
        # Check relevance and determine response strategy
        max_relevance_score = 0.0
        knowledge_used = False
        knowledge_context = []
        
        if results_list:
            # Get maximum relevance score
            max_relevance_score = max([
                result.get("hybrid_score", result.get("similarity", 0)) 
                for result in results_list
            ])
            
            # Only use knowledge if it meets relevance threshold
            if max_relevance_score >= self.relevance_threshold:
                knowledge_used = True
                
                # Prepare knowledge context for LLM
                for result in results_list:
                    score = result.get("hybrid_score", result.get("similarity", 0))
                    if score >= self.relevance_threshold:
                        knowledge_context.append({
                            "title": result["title"],
                            "content": result["content"],
                            "source": result.get("collection_name", "Knowledge Base"),
                            "relevance": "high" if score > 0.8 else "medium"
                        })
        
        # Check for external integration data if knowledge is relevant
        integration_data = None
        integration_used = False
        
        if knowledge_used and self._should_use_integration(user_message):
            integration_data = await self._fetch_integration_data(client_id, user_message)
            integration_used = integration_data is not None
        
        # Generate response based on available context
        if not knowledge_used:
            # No relevant knowledge found - use business-focused fallback
            final_response = self._get_fallback_response()
            
        else:
            # Use RAG with LLM
            conversation_history = []
            if "history" in context and context["history"]:
                conversation_history = context["history"][-8:]  # Last 8 messages for context
            
            # Generate response using LLM with all required parameters
            llm_response = await self.llm_service.generate_response(
                user_message=user_message,
                conversation_history=conversation_history,
                knowledge_context=knowledge_context,
                industry_context={
                    "instructions": "You are a helpful business assistant. Use the provided knowledge base to answer questions accurately and professionally. Stay focused on the business context.",
                    "integration_data": integration_data if integration_used else None
                }
            )
            
            final_response = llm_response.get("content", "I'm sorry, I couldn't generate a response at this time.")
        
        # Add assistant message to database
        assistant_message = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "assistant",
            "content": final_response,
            "message_metadata": {
                "knowledge_used": knowledge_used,
                "integration_used": integration_used,
                "max_relevance_score": max_relevance_score,
                "knowledge_items_found": len(knowledge_context),
                "response_time_ms": int((time.time() - start_time) * 1000)
            },
            "created_at": datetime.utcnow()
        })
        
        # Update conversation context
        self.context_manager.update_context(
            self.db, 
            session_id, 
            user_message, 
            final_response,
            {
                "knowledge_used": knowledge_used, 
                "integration_used": integration_used,
                "max_relevance_score": max_relevance_score
            }
        )
        
        # Format response
        return {
            "message": {
                "content": final_response,
                "role": "assistant",
                "id": assistant_message.message_id,
                "created_at": assistant_message.created_at.isoformat()
            },
            "user_message_id": user_message_db.message_id,
            "session_id": session_id,
            "knowledge_used": knowledge_used,
            "integration_used": integration_used,
            "relevance_score": max_relevance_score,
            "knowledge_items_found": len(knowledge_context)
        }
    
    async def process_message_stream(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process a user message and generate a streaming response with RAG protection.
        
        Args:
            client_id: Client ID
            user_message: User message text
            session_id: Optional session ID for continuing conversations
            user_info: Optional user information
            
        Yields:
            Response chunks as they are generated
        """
        start_time = time.time()
        
        # Get or create session
        session = self._get_or_create_session(client_id, session_id, user_info)
        session_id = session.session_id
        
        # Add user message to database
        user_message_db = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "user",
            "content": user_message,
            "created_at": datetime.utcnow()
        })
        
        # Get conversation context
        context = self.context_manager.get_context(self.db, session_id)
        
        # Search for relevant knowledge
        search_results = await self.search_service.hybrid_search(
            client_id, 
            user_message,
            limit=5
        )

        results_list = search_results.get("results", [])
        
        # Check relevance
        max_relevance_score = 0.0
        knowledge_used = False
        knowledge_context = []
        
        if results_list:
            max_relevance_score = max([
                result.get("hybrid_score", result.get("similarity", 0)) 
                for result in results_list
            ])
            
            if max_relevance_score >= self.relevance_threshold:
                knowledge_used = True
                for result in results_list:
                    score = result.get("hybrid_score", result.get("similarity", 0))
                    if score >= self.relevance_threshold:
                        knowledge_context.append({
                            "title": result["title"],
                            "content": result["content"],
                            "source": result.get("collection_name", "Knowledge Base"),
                            "relevance": "high" if score > 0.8 else "medium"
                        })
        
        # Check for integration data
        integration_used = False
        integration_data = None
        if knowledge_used and self._should_use_integration(user_message):
            integration_data = await self._fetch_integration_data(client_id, user_message)
            integration_used = integration_data is not None
        
        # First yield is the info about the response
        yield {
            "type": "info",
            "session_id": session_id,
            "user_message_id": user_message_db.message_id,
            "knowledge_used": knowledge_used,
            "integration_used": integration_used,
            "relevance_score": max_relevance_score
        }
        
        # Generate message ID for the streaming response
        message_id = str(uuid.uuid4())
        
        if not knowledge_used:
            # No relevant knowledge - use fallback response
            final_response = self._get_fallback_response()
            
            # Simulate streaming for fallback
            words = final_response.split()
            current_chunk = ""
            
            for i, word in enumerate(words):
                current_chunk += word + " "
                
                if i % 3 == 2 or i == len(words) - 1:
                    yield {
                        "type": "chunk",
                        "content": current_chunk,
                        "message_id": message_id
                    }
                    current_chunk = ""
                    
        else:
            # Use RAG with streaming LLM
            conversation_history = []
            if "history" in context and context["history"]:
                conversation_history = context["history"][-8:]
            
            # Generate response using LLM with streaming
            full_response = ""
            async for content_chunk in self.llm_service.generate_response_stream(
                user_message=user_message,
                conversation_history=conversation_history,
                knowledge_context=knowledge_context,
                industry_context={
                    "instructions": "You are a helpful business assistant. Use the provided knowledge base to answer questions accurately and professionally. Stay focused on the business context.",
                    "integration_data": integration_data if integration_used else None
                }
            ):
                full_response += content_chunk
                
                # Yield each chunk
                yield {
                    "type": "chunk",
                    "content": content_chunk,
                    "message_id": message_id
                }
            
            final_response = full_response
        
        # Yield completion
        yield {
            "type": "complete",
            "content": final_response,
            "message_id": message_id
        }
        
        # Add assistant message to database
        assistant_message = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "assistant",
            "content": final_response,
            "message_id": message_id,
            "message_metadata": {
                "knowledge_used": knowledge_used,
                "integration_used": integration_used,
                "max_relevance_score": max_relevance_score,
                "knowledge_items_found": len(knowledge_context),
                "response_time_ms": int((time.time() - start_time) * 1000)
            },
            "created_at": datetime.utcnow()
        })
        
        # Update conversation context
        self.context_manager.update_context(
            self.db, 
            session_id, 
            user_message, 
            final_response,
            {
                "knowledge_used": knowledge_used, 
                "integration_used": integration_used,
                "max_relevance_score": max_relevance_score
            }
        )
        
        # Yield final message with complete message info
        yield {
            "type": "done",
            "message": {
                "content": final_response,
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
    
    async def get_knowledge_context(
        self, 
        user_message: str, 
        client_id: str, 
        collection_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get relevant knowledge context for the user message with multilingual support."""
        try:
            # Use enhanced search with multilingual support
            search_results = await self.search_service.hybrid_search(
                client_id=client_id,
                query_text=user_message,
                limit=5,
                vector_threshold=0.7,
                collection_id=collection_id,
                enable_multilingual=multilingual_settings.MULTILINGUAL_SEARCH_ENABLED
            )
            
            context_items = []
            for result in search_results.get("results", []):
                context_items.append({
                    "title": result.get("title", ""),
                    "content": result.get("content", ""),
                    "source": result.get("collection_name", "Knowledge Base"),
                    "similarity": result.get("similarity", 0.0),
                    "language": result.get("query_language", "unknown"),
                    "is_translated": not result.get("is_original_query", True)
                })
            
            # Log multilingual search results if enabled
            if multilingual_settings.LOG_MULTILINGUAL_OPERATIONS and context_items:
                translated_results = [item for item in context_items if item["is_translated"]]
                if translated_results:
                    logger.info(f"Found {len(translated_results)} cross-language matches for query: {user_message}")
            
            return context_items
            
        except Exception as e:
            logger.error(f"Error getting knowledge context: {str(e)}")
            return []
    
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