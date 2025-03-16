# backend/app/services/chat/integration_context_enhancer.py
from typing import Dict, Any, List, Optional
import logging
from sqlalchemy.orm import Session

from app.repositories.integration_repository import IntegrationRepository
from app.services.integration.integration_service import IntegrationService
from app.core import logger

class IntegrationContextEnhancer:
    """
    Service for enhancing chat context with data from external integrations.
    
    This service:
    - Analyzes user queries to determine if integration data is needed
    - Fetches relevant data from integrated services
    - Formats the data for use in prompt construction
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.integration_repo = IntegrationRepository()
        self.integration_service = IntegrationService()
    
    def enhance_context(
        self, 
        client_id: str, 
        user_message: str, 
        intent: str,
        entities: List[str]
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
        # Check if we should use integration data
        if not self._should_use_integration(intent, entities, user_message):
            return None
        
        # Get relevant integration data
        integration_data = self._fetch_integration_data(client_id, intent, entities, user_message)
        
        if not integration_data:
            return None
        
        # Format integration data for context
        return self._format_integration_data(integration_data, intent)
    
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
            data = self.integration_service.get_data(
                integration,
                resource_type,
                query=query,
                filters=None
            )
            
            return data
            
        except Exception as e:
            logger.error(f"Error fetching integration data: {str(e)}")
            return None
    
    def _format_integration_data(
        self, 
        data: List[Dict[str, Any]], 
        intent: str
    ) -> str:
        """
        Format integration data for inclusion in chat context.
        
        Args:
            data: List of data items
            intent: User intent
            
        Returns:
            Formatted string with integration data
        """
        if not data:
            return ""
        
        result = "EXTERNAL DATA:\n"
        
        # Different formatting based on data type
        if intent == "order_status":
            # Format for order data
            for i, order in enumerate(data[:3], 1):  # Limit to 3 orders
                result += f"{i}. Order #{order.get('order_number', 'Unknown')}\n"
                result += f"   Status: {order.get('status', 'Unknown')}\n"
                result += f"   Date: {order.get('created_at', 'Unknown')}\n"
                result += f"   Total: {order.get('total_price', 'Unknown')}\n"
                
                # Add line items if available
                if 'line_items' in order and order['line_items']:
                    result += "   Items:\n"
                    for item in order['line_items'][:3]:  # Limit to 3 items
                        result += f"    - {item.get('name', 'Unknown item')}, Qty: {item.get('quantity', 1)}\n"
                
                result += "\n"
        
        elif intent == "product_inquiry":
            # Format for product data
            for i, product in enumerate(data[:5], 1):  # Limit to 5 products
                result += f"{i}. {product.get('title', 'Unknown product')}\n"
                result += f"   Price: {product.get('price', 'Unknown')}\n"
                result += f"   Status: {product.get('status', 'Unknown')}\n"
                
                # Add description snippet if available
                if 'description' in product and product['description']:
                    desc = product['description'][:150] + ('...' if len(product['description']) > 150 else '')
                    result += f"   Description: {desc}\n"
                    
                result += "\n"
        
        elif intent == "technical_issue" or intent == "feature_inquiry":
            # Format for ticket data
            for i, ticket in enumerate(data[:5], 1):  # Limit to 5 tickets
                result += f"{i}. Ticket #{ticket.get('id', 'Unknown')}\n"
                result += f"   Subject: {ticket.get('subject', 'Unknown')}\n"
                result += f"   Status: {ticket.get('status', 'Unknown')}\n"
                result += f"   Priority: {ticket.get('priority', 'Unknown')}\n"
                
                # Add description snippet if available
                if 'description' in ticket and ticket['description']:
                    desc = ticket['description'][:150] + ('...' if len(ticket['description']) > 150 else '')
                    result += f"   Description: {desc}\n"
                    
                result += "\n"
        
        else:
            # Generic formatting for other data types
            for i, item in enumerate(data[:5], 1):  # Limit to 5 items
                result += f"{i}. "
                
                if isinstance(item, dict):
                    for key, value in list(item.items())[:5]:  # Limit to 5 keys
                        if key in ['id', 'created_at', 'updated_at']:
                            continue  # Skip technical fields
                        result += f"{key}: {value}, "
                    result = result.rstrip(", ") + "\n"
                else:
                    result += f"{str(item)}\n"
        
        return result