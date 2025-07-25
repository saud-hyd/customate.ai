# backend/app/services/chat/integration_context_enhancer.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.repositories.integration_repository import IntegrationRepository
from app.services.integration.integration_service import IntegrationService
from app.services.chat.integration_data_injector import IntegrationDataInjector
from app.utils.entity_extractor import extract_entities
from app.utils.intent_classifier import classify_intent
from app.core import logger

class IntegrationContextEnhancer:
    """
    Enhanced service for enriching chat context with external integration data.
    
    This service:
    - Analyzes user queries to determine if integration data is needed
    - Fetches relevant data from integrated services
    - Formats the data for use in prompt construction
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.integration_repo = IntegrationRepository()
        self.integration_service = IntegrationService()
        self.data_injector = IntegrationDataInjector(db)
    
    async def enhance_context(
        self, 
        client_id: str, 
        user_message: str, 
        intent: str,
        entities: Dict[str, Any] = None
    ) -> Optional[str]:
        """
        Enhance chat context with integration data if applicable.
        
        Args:
            client_id: Client ID
            user_message: User message
            intent: Detected intent
            entities: Extracted entities
            
        Returns:
            String with formatted integration data or None if not applicable
        """
        # Skip if no relevant data needed
        if not self._should_use_integration(intent, entities, user_message):
            return None
        
        # Use the data injector to get formatted integration data
        integration_data = await self.data_injector.get_integration_data(
            client_id,
            user_message,
            intent,
            entities
        )
        
        if not integration_data:
            return None
            
        # Return the formatted text for inclusion in the prompt
        return integration_data.get("formatted_text")
    
    def _should_use_integration(
        self, 
        intent: str, 
        entities: Dict[str, Any],
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
        
        # Check for specific entity types or keywords
        integration_keywords = [
            "order", "ticket", "product", "issue", "account", "subscription",
            "customer", "contact", "status", "price", "find", "show me"
        ]
        
        message_lower = user_message.lower()
        if any(keyword in message_lower for keyword in integration_keywords):
            return True
        
        # Check for direct questions about external data
        data_questions = [
            "find", "search", "look up", "show me", "get", "retrieve"
        ]
        if any(phrase in message_lower for phrase in data_questions):
            return True
        
        return False