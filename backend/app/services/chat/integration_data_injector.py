# backend/app/services/chat/integration_data_injector.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.repositories.integration_repository import IntegrationRepository
from app.services.integration.integration_service import IntegrationService
from app.utils.entity_extractor import extract_entities
from app.utils.intent_classifier import classify_intent
from app.core import logger

class IntegrationDataInjector:
    """
    Service for injecting external integration data into chat responses.
    
    This service:
    - Analyzes user queries to determine if integration data is relevant
    - Fetches relevant data from integrated services
    - Formats the data for use in prompt construction
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.integration_repo = IntegrationRepository()
        self.integration_service = IntegrationService()
    
    async def get_integration_data(
        self, 
        client_id: str, 
        user_message: str, 
        intent: str,
        entities: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get integration data relevant to the chat context.
        
        Args:
            client_id: Client ID
            user_message: User message
            intent: Detected intent
            entities: Extracted entities
            
        Returns:
            Dictionary with formatted integration data or None
        """
        # Skip if no relevant data needed
        if not self._should_fetch_integration_data(intent, entities, user_message):
            return None
        
        # Get active integrations for this client
        integrations = self.integration_repo.get_active_by_client_id(self.db, client_id)
        if not integrations:
            return None
        
        # Determine which integration and resource type to query based on intent
        provider, resource_type = self._map_intent_to_integration(intent, user_message)
        
        # Find matching integration
        integration = next((i for i in integrations if i.provider == provider), None)
        if not integration:
            # Try to find any integration that might be useful
            integration = integrations[0] if integrations else None
            
        if not integration:
            return None
        
        # Extract query from entities or message
        query = self._extract_query(entities, user_message, intent)
        
        # Fetch data from integration
        try:
            data = self.integration_service.get_data(
                integration,
                resource_type,
                query=query,
                filters=None
            )
            
            if not data:
                return None
            
            # Format data for chat context
            return {
                "provider": integration.provider,
                "resource_type": resource_type,
                "data": data[:5],  # Limit to 5 items for context
                "query": query,
                "formatted_text": self._format_integration_data(data[:5], integration.provider, resource_type)
            }
            
        except Exception as e:
            logger.exception(f"Error fetching integration data: {str(e)}")
            return None
    
    def _should_fetch_integration_data(
        self, 
        intent: str, 
        entities: Dict[str, Any],
        user_message: str
    ) -> bool:
        """Determine if integration data should be fetched."""
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
            "customer", "contact", "status", "price"
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
    
    def _map_intent_to_integration(self, intent: str, user_message: str) -> tuple:
        """Map intent to appropriate integration provider and resource type."""
        # Default mappings
        intent_mapping = {
            "order_status": ("shopify", "orders"),
            "product_inquiry": ("shopify", "products"),
            "feature_inquiry": ("zendesk", "tickets"),
            "pricing_question": ("salesforce", "opportunities"),
            "account_management": ("salesforce", "contacts"),
            "technical_issue": ("zendesk", "tickets")
        }
        
        # Check if intent is directly mapped
        if intent in intent_mapping:
            return intent_mapping[intent]
        
        # Otherwise infer from message content
        message_lower = user_message.lower()
        
        if "order" in message_lower or "purchase" in message_lower:
            return ("shopify", "orders")
        elif "product" in message_lower or "item" in message_lower:
            return ("shopify", "products")
        elif "ticket" in message_lower or "issue" in message_lower:
            return ("zendesk", "tickets")
        elif "contact" in message_lower or "customer" in message_lower:
            return ("salesforce", "contacts")
        elif "opportunity" in message_lower or "deal" in message_lower:
            return ("salesforce", "opportunities")
        
        # Default to something reasonable
        return ("zendesk", "tickets")
    
    def _extract_query(
        self, 
        entities: Dict[str, Any], 
        user_message: str, 
        intent: str
    ) -> Optional[str]:
        """Extract search query from entities or message."""
        if not entities:
            entities = {}
        
        # Extract query based on intent and entities
        if intent == "order_status" and "order_numbers" in entities:
            return entities["order_numbers"][0]
        elif intent == "product_inquiry" and "products" in entities:
            return entities["products"][0]
        elif intent == "technical_issue" and "ids" in entities:
            return entities["ids"][0]
        
        # Extract most likely entity for query
        query_entities = []
        
        # Join all entity values into one list
        for entity_values in entities.values():
            if isinstance(entity_values, list):
                query_entities.extend(entity_values)
            else:
                query_entities.append(str(entity_values))
        
        if query_entities:
            # Use the longest entity as query (likely most specific)
            return max(query_entities, key=len)
        
        # Extract key terms from user message
        import re
        # Look for quoted text, product codes, numbers, or proper nouns
        patterns = [
            r'"([^"]+)"',  # Quoted text
            r'#(\d+)',     # Number with hash
            r'\b[A-Z][a-z]+\b',  # Proper nouns
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, user_message)
            if matches:
                return matches[0]
        
        # No good query found, use the full message but limit length
        words = user_message.split()
        if len(words) > 3:
            return " ".join(words[:3])
        
        return user_message
    
    def _format_integration_data(
        self,
        data: List[Dict[str, Any]],
        provider: str,
        resource_type: str
    ) -> str:
        """Format integration data for inclusion in chat context."""
        if not data:
            return ""
        
        result = f"EXTERNAL DATA FROM {provider.upper()} ({resource_type}):\n"
        
        # Format based on provider and resource type
        if provider == "shopify":
            if resource_type == "orders":
                for i, order in enumerate(data, 1):
                    result += f"{i}. Order {order.get('order_number', 'Unknown')}\n"
                    result += f"   Status: {order.get('status', 'Unknown')}\n"
                    result += f"   Date: {order.get('created_at', 'Unknown')}\n"
                    result += f"   Total: ${order.get('total_price', 'Unknown')}\n"
                    result += "\n"
            
            elif resource_type == "products":
                for i, product in enumerate(data, 1):
                    result += f"{i}. {product.get('title', 'Unknown product')}\n"
                    result += f"   Price: ${product.get('price', 'Unknown')}\n"
                    result += f"   Inventory: {product.get('inventory_quantity', 'Unknown')}\n"
                    result += "\n"
        
        elif provider == "zendesk":
            if resource_type == "tickets":
                for i, ticket in enumerate(data, 1):
                    result += f"{i}. Ticket {ticket.get('id', 'Unknown')}: {ticket.get('subject', 'No subject')}\n"
                    result += f"   Status: {ticket.get('status', 'Unknown')}\n"
                    result += f"   Priority: {ticket.get('priority', 'Unknown')}\n"
                    result += f"   Created: {ticket.get('created_at', 'Unknown')}\n"
                    result += "\n"
            
            elif resource_type == "users":
                for i, user in enumerate(data, 1):
                    result += f"{i}. User: {user.get('name', 'Unknown')}\n"
                    result += f"   Email: {user.get('email', 'Unknown')}\n"
                    result += f"   Role: {user.get('role', 'Unknown')}\n"
                    result += "\n"
        
        elif provider == "salesforce":
            if resource_type == "contacts":
                for i, contact in enumerate(data, 1):
                    result += f"{i}. {contact.get('Name', 'Unknown contact')}\n"
                    result += f"   Email: {contact.get('Email', 'Unknown')}\n"
                    result += f"   Phone: {contact.get('Phone', 'Unknown')}\n"
                    result += f"   Title: {contact.get('Title', 'Unknown')}\n"
                    result += "\n"
            
            elif resource_type == "opportunities":
                for i, opportunity in enumerate(data, 1):
                    result += f"{i}. {opportunity.get('Name', 'Unknown opportunity')}\n"
                    result += f"   Stage: {opportunity.get('StageName', 'Unknown')}\n"
                    result += f"   Amount: ${opportunity.get('Amount', 'Unknown')}\n"
                    result += f"   Close Date: {opportunity.get('CloseDate', 'Unknown')}\n"
                    result += "\n"
        
        else:
            # Generic formatting
            for i, item in enumerate(data, 1):
                result += f"{i}. "
                for key, value in list(item.items())[:5]:  # Limit to 5 fields
                    if key.lower() in ["id", "created_at", "updated_at"]:
                        continue  # Skip technical fields
                    result += f"{key}: {value}, "
                result = result.rstrip(", ") + "\n"
        
        return result