# backend/app/services/chat/enhanced_chat_service.py
from typing import Dict, Any, List, Optional, Tuple
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
from app.services.industry.industry_factory import IndustryFactory
from app.repositories.integration_repository import IntegrationRepository
from app.services.integration.integration_service import IntegrationService
from app.core import logger

class EnhancedChatService:
    """
    Enhanced chat service that integrates with external services.
    
    This service extends the base chat functionality with:
    - External integration data retrieval
    - Intelligent context management
    - Industry-specific behaviors
    - Advanced knowledge retrieval
    """
    
    def __init__(
        self,
        db: Session,
        search_service: EnhancedSearchService,
        llm_service: DeepSeekService,
        industry_factory: IndustryFactory,
        context_manager: ContextManager
    ):
        self.db = db
        self.search_service = search_service
        self.llm_service = llm_service
        self.industry_factory = industry_factory
        self.context_manager = context_manager
        self.session_repo = ChatSessionRepository()
        self.message_repo = ChatMessageRepository()
        self.integration_repo = IntegrationRepository()
        self.integration_service = IntegrationService()
    
    async def process_message(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a user message and generate a response.
        
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
        if session_id:
            # Continue existing session
            session = self.session_repo.get_by_session_id(self.db, session_id)
            if not session or session.client_id != client_id:
                # Create new session if not found or not owned by this client
                session = self._create_session(client_id, user_info)
                session_id = session.session_id
        else:
            # Create new session
            session = self._create_session(client_id, user_info)
            session_id = session.session_id
        
        # Get industry-specific customizer
        industry_customizer = self.industry_factory.get_industry_service(client_id)
        
        # Add user message to database
        user_message_db = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "user",
            "content": user_message,
            "created_at": datetime.utcnow()
        })
        
        # Get conversation context
        context = self.context_manager.get_context(self.db, session_id)
        
        # Extract intent and entities from user message
        intent, entities = industry_customizer.extract_intent_entities(user_message)
        
        # Check if we need to fetch external data
        integration_data = None
        integration_used = False
        if self._should_use_integration(intent, entities, user_message):
            integration_data = self._fetch_integration_data(client_id, intent, entities, user_message)
            integration_used = integration_data is not None
        
        # Search for relevant knowledge
        search_results = await self.search_service.hybrid_search(
            client_id, 
            user_message,
            limit=5
        )

        # Get the actual results list from the search_results dictionary
        results_list = search_results.get("results", [])

        # Determine if we should use knowledge in response
        knowledge_used = len(results_list) > 0 and self._should_use_knowledge(user_message, results_list)

        # Prepare knowledge context
        knowledge_context = ""
        if knowledge_used:
            knowledge_context = "RELEVANT KNOWLEDGE:\n"
            for i, result in enumerate(results_list, 1):
                knowledge_context += f"{i}. {result['content']}\n"
                
        # Prepare integration context
        integration_context = ""
        if integration_used and integration_data:
            integration_context = "EXTERNAL DATA:\n"
            for i, item in enumerate(integration_data, 1):
                # Format based on data structure - this is a simple example
                if isinstance(item, dict):
                    integration_context += f"{i}. "
                    for key, value in item.items():
                        integration_context += f"{key}: {value}, "
                    integration_context = integration_context.rstrip(", ") + "\n"
                else:
                    integration_context += f"{i}. {str(item)}\n"
        
        # Build prompt
        prompt = self._build_prompt(
            user_message, 
            context,
            knowledge_context if knowledge_used else "",
            integration_context if integration_used else "",
            industry_customizer
        )
        
        # Generate response
        response_text = await self.llm_service.generate_response(prompt)
        
        # Process response with industry customizer
        final_response = industry_customizer.process_response(response_text, user_message, intent)
        
        # Add assistant message to database
        assistant_message = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "assistant",
            "content": final_response,
            "message_metadata": {
                "knowledge_used": knowledge_used,
                "integration_used": integration_used,
                "intent": intent,
                "entities": entities,
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
            knowledge_used=knowledge_used,
            integration_used=integration_used
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
            "intent": intent,
            "entities": entities
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
    
    def _create_session(
        self,
        client_id: str,
        user_info: Optional[Dict[str, Any]] = None
    ) -> Any:
        """Create a new chat session."""
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
    
    def _should_use_knowledge(self, user_message: str, search_results: List[Dict[str, Any]]) -> bool:
        """Determine if knowledge should be used for this message."""
        # Simple heuristic: if there are search results with high enough scores, use them
        if not search_results:
            return False
        
        # Check if top result has a high score
        if search_results[0]["score"] > 0.7:
            return True
        
        # Check if question seems like it needs factual information
        question_words = ["what", "how", "when", "where", "who", "which", "why"]
        if any(user_message.lower().startswith(word) for word in question_words):
            return True
        
        return False
    
    def _should_use_integration(
        self, 
        intent: str, 
        entities: List[str],
        user_message: str
    ) -> bool:
        """Determine if external integration data should be used."""
        # Check for intents that would benefit from integration data
        integration_intents = [
            "order_status", "product_inquiry", "feature_inquiry",
            "pricing_question", "account_management", "technical_issue"
        ]
        
        if intent in integration_intents:
            return True
        
        # Check for specific entity types that would benefit from integration data
        entity_indicator_words = ["order", "ticket", "product", "issue", "account", "subscription"]
        if any(entity in user_message.lower() for entity in entity_indicator_words):
            return True
        
        # Check for direct questions about external data
        data_questions = [
            "show me", "can you find", "look up", "search for", "get me", "find"
        ]
        if any(phrase in user_message.lower() for phrase in data_questions):
            return True
        
        return False
    
    def _fetch_integration_data(
        self, 
        client_id: str, 
        intent: str,
        entities: List[str],
        user_message: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch relevant data from integrated external services.
        
        Args:
            client_id: Client ID
            intent: Identified intent
            entities: Extracted entities
            user_message: Original user message
            
        Returns:
            List of data items or None if no relevant data found
        """
        try:
            # Get active integrations for the client
            integrations = self.integration_repo.get_active_by_client_id(self.db, client_id)
            
            if not integrations:
                return None
            
            # Map intents to provider and resource type
            intent_mapping = {
                "order_status": {"shopify": "orders"},
                "product_inquiry": {"shopify": "products"},
                "feature_inquiry": {"zendesk": "tickets"},
                "pricing_question": {"salesforce": "opportunities"},
                "account_management": {"zendesk": "users", "salesforce": "contacts"},
                "technical_issue": {"zendesk": "tickets"}
            }
            
            # Determine which integration to use based on intent
            target_providers = intent_mapping.get(intent, {})
            
            # If no specific mapping, try to infer from message
            if not target_providers:
                if "ticket" in user_message.lower() or "issue" in user_message.lower():
                    target_providers = {"zendesk": "tickets"}
                elif "product" in user_message.lower() or "item" in user_message.lower():
                    target_providers = {"shopify": "products"}
                elif "order" in user_message.lower() or "purchase" in user_message.lower():
                    target_providers = {"shopify": "orders"}
                elif "contact" in user_message.lower() or "customer" in user_message.lower():
                    target_providers = {"salesforce": "contacts"}
            
            # If we still don't know what to query, return None
            if not target_providers:
                return None
            
            # Find available integrations matching target providers
            available_integrations = []
            for provider, resource_type in target_providers.items():
                for integration in integrations:
                    if integration.provider == provider:
                        available_integrations.append((integration, resource_type))
            
            if not available_integrations:
                return None
            
            # Query the first available integration
            integration, resource_type = available_integrations[0]
            
            # Extract query based on entities and user message
            query = None
            if entities:
                query = " ".join(entities)
            
            # Get data from integration
            return self.integration_service.get_data(
                integration,
                resource_type,
                query=query,
                filters=None
            )
            
        except Exception as e:
            logger.error(f"Error fetching integration data: {str(e)}")
            return None