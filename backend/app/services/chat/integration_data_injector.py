# backend/app/services/chat/integration_data_injector.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import re
from datetime import datetime

from app.repositories.integration_repository import IntegrationRepository
from app.services.integration.integration_service import IntegrationService
from app.utils.entity_extractor import extract_entities
from app.utils.intent_classifier import classify_intent
from app.core import logger

class IntegrationDataInjector:
    """
    Enhanced service for injecting external integration data into chat responses.
    
    This service:
    - Analyzes user queries to determine if integration data is relevant
    - Fetches relevant data from integrated services
    - Formats the data optimally for chatbot consumption
    - Provides intelligent context enhancement
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
        Get integration data relevant to the chat context with enhanced intelligence.
        
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
            logger.debug(f"No active integrations found for client {client_id}")
            return None
        
        # Determine which integration and resource type to query based on intent
        provider, resource_type = self._map_intent_to_integration(intent, user_message, entities)
        
        # Find matching integration
        integration = next((i for i in integrations if i.provider == provider), None)
        if not integration:
            # Try to find any integration that might be useful
            integration = integrations[0] if integrations else None
            
        if not integration:
            logger.debug(f"No suitable integration found for provider {provider}")
            return None
        
        # Extract intelligent query from entities or message
        query = self._extract_intelligent_query(entities, user_message, intent)
        
        # Build smart filters based on intent and entities
        filters = self._build_smart_filters(intent, entities, user_message)
        
        # Fetch data from integration
        try:
            data = self.integration_service.get_data(
                integration,
                resource_type,
                query=query,
                filters=filters
            )
            
            if not data:
                logger.debug(f"No data returned from integration {integration.provider}")
                return None
            
            # Limit data and prioritize by relevance
            prioritized_data = self._prioritize_data_by_relevance(data, query, intent)
            limited_data = prioritized_data[:5]  # Limit to 5 most relevant items
            
            # Format data for chat context with enhanced formatting
            formatted_text = self._format_integration_data_enhanced(
                limited_data, 
                integration.provider, 
                resource_type,
                intent,
                query
            )
            
            return {
                "provider": integration.provider,
                "resource_type": resource_type,
                "data": limited_data,
                "query": query,
                "intent": intent,
                "data_count": len(data),
                "showing_count": len(limited_data),
                "formatted_text": formatted_text
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
        """Determine if integration data should be fetched with enhanced logic."""
        if not entities:
            entities = {}
        
        # Intent-based triggers
        integration_intents = [
            "order_status", "product_inquiry", "inventory_check",
            "customer_support", "price_inquiry", "shipping_inquiry",
            "return_request", "product_availability", "store_location",
            "account_inquiry", "payment_inquiry"
        ]
        
        if intent in integration_intents:
            return True
        
        # Entity-based triggers
        entity_triggers = ["order_numbers", "products", "customer_emails", "ids"]
        if any(trigger in entities for trigger in entity_triggers):
            return True
        
        # Keyword-based triggers (enhanced)
        integration_keywords = [
            # Order related
            "order", "orders", "purchase", "bought", "tracking", "delivery",
            "shipment", "shipped", "status", "receipt",
            
            # Product related
            "product", "products", "item", "items", "stock", "inventory",
            "available", "price", "cost", "catalog", "sku",
            
            # Customer service
            "account", "profile", "customer", "support", "help",
            "return", "refund", "exchange", "warranty",
            
            # Store related
            "store", "location", "hours", "contact", "phone"
        ]
        
        message_lower = user_message.lower()
        if any(keyword in message_lower for keyword in integration_keywords):
            return True
        
        # Pattern-based triggers
        patterns = [
            r'#\d+',  # Order numbers with hash
            r'\b\d{6,}\b',  # Long numbers (could be order/product IDs)
            r'\$\d+',  # Price mentions
            r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'  # Emails
        ]
        
        for pattern in patterns:
            if re.search(pattern, user_message):
                return True
        
        return False
    
    def _map_intent_to_integration(
        self, 
        intent: str, 
        user_message: str,
        entities: Dict[str, Any] = None
    ) -> tuple[str, str]:
        """Map intent to appropriate integration provider and resource type."""
        # Default to Shopify for e-commerce related queries
        default_provider = "shopify"
        
        # Intent to resource mapping for Shopify
        intent_resource_map = {
            "order_status": ("shopify", "orders"),
            "product_inquiry": ("shopify", "products"),
            "inventory_check": ("shopify", "products"),
            "customer_support": ("shopify", "customers"),
            "price_inquiry": ("shopify", "products"),
            "shipping_inquiry": ("shopify", "orders"),
            "return_request": ("shopify", "orders"),
            "product_availability": ("shopify", "products"),
            "account_inquiry": ("shopify", "customers"),
            "payment_inquiry": ("shopify", "orders")
        }
        
        if intent in intent_resource_map:
            return intent_resource_map[intent]
        
        # Keyword-based mapping
        message_lower = user_message.lower()
        
        if any(word in message_lower for word in ["order", "purchase", "tracking", "shipment", "delivery"]):
            return ("shopify", "orders")
        elif any(word in message_lower for word in ["product", "item", "stock", "inventory", "price"]):
            return ("shopify", "products")
        elif any(word in message_lower for word in ["customer", "account", "profile"]):
            return ("shopify", "customers")
        
        # Default fallback
        return (default_provider, "products")
    
    def _extract_intelligent_query(
        self, 
        entities: Dict[str, Any], 
        user_message: str, 
        intent: str
    ) -> str:
        """Extract intelligent query from user input with enhanced logic."""
        if not entities:
            entities = {}
        
        # Intent-specific entity extraction
        if intent == "order_status" and "order_numbers" in entities:
            order_num = entities["order_numbers"][0]
            # Clean order number (remove # if present)
            return order_num.lstrip('#')
        elif intent == "product_inquiry" and "products" in entities:
            return entities["products"][0]
        elif intent == "customer_support" and "customer_emails" in entities:
            return entities["customer_emails"][0]
        elif "ids" in entities:
            return entities["ids"][0]
        
        # Extract from all entities
        query_entities = []
        for entity_values in entities.values():
            if isinstance(entity_values, list):
                query_entities.extend(entity_values)
            else:
                query_entities.append(str(entity_values))
        
        if query_entities:
            # Use the most specific entity (longest)
            return max(query_entities, key=len)
        
        # Enhanced pattern extraction
        patterns = [
            r'"([^"]+)"',  # Quoted text
            r'#(\d+)',     # Order numbers with hash
            r'\b([A-Z]{2,}\d+)\b',  # Product codes
            r'\b(\d{6,})\b',  # Long numbers
            r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b',  # Emails
            r'\$(\d+(?:\.\d{2})?)',  # Prices
            r'\b([A-Z][a-z]+ [A-Z][a-z]+)\b'  # Proper nouns (product names)
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, user_message)
            if matches:
                return matches[0] if isinstance(matches[0], str) else matches[0][0]
        
        # Extract key terms based on intent
        if intent in ["product_inquiry", "inventory_check", "price_inquiry"]:
            # Look for product-related terms
            words = user_message.split()
            product_indicators = ["shirt", "dress", "shoe", "phone", "laptop", "book", "chair"]
            for word in words:
                if word.lower() in product_indicators:
                    return word
        
        # Fallback: use meaningful words from message
        words = user_message.split()
        meaningful_words = [w for w in words if len(w) > 3 and w.lower() not in 
                          ["what", "where", "when", "how", "why", "the", "and", "but", "for"]]
        
        if meaningful_words:
            return " ".join(meaningful_words[:2])  # Take first 2 meaningful words
        
        return user_message[:50]  # Fallback to first 50 characters
    
    def _build_smart_filters(
        self, 
        intent: str, 
        entities: Dict[str, Any],
        user_message: str
    ) -> Dict[str, Any]:
        """Build intelligent filters based on context."""
        filters = {}
        
        # Intent-based filters
        if intent == "order_status":
            # For order status, prefer recent orders
            filters["status"] = "any"
            filters["limit"] = 10
        elif intent in ["product_inquiry", "inventory_check"]:
            # For products, prefer active/published items
            filters["status"] = "active"
            filters["limit"] = 5
        elif intent == "customer_support":
            filters["limit"] = 3
        
        # Time-based filters
        message_lower = user_message.lower()
        if any(term in message_lower for term in ["recent", "today", "yesterday", "this week"]):
            # Add time filters if available
            filters["created_at_min"] = (datetime.now()).isoformat()
        
        return filters
    
    def _prioritize_data_by_relevance(
        self, 
        data: List[Dict[str, Any]], 
        query: str, 
        intent: str
    ) -> List[Dict[str, Any]]:
        """Prioritize data items by relevance to the query."""
        if not query or not data:
            return data
        
        query_lower = query.lower()
        
        def calculate_relevance_score(item):
            score = 0
            
            # Check title/name fields
            title_fields = ["title", "name", "order_number", "email"]
            for field in title_fields:
                if field in item and item[field]:
                    field_value = str(item[field]).lower()
                    if query_lower in field_value:
                        score += 10
                    elif any(word in field_value for word in query_lower.split()):
                        score += 5
            
            # Check description fields
            desc_fields = ["description", "body_html"]
            for field in desc_fields:
                if field in item and item[field]:
                    field_value = str(item[field]).lower()
                    if query_lower in field_value:
                        score += 3
            
            # Intent-specific scoring
            if intent == "order_status":
                if item.get("financial_status") == "paid":
                    score += 2
                if item.get("fulfillment_status") in ["fulfilled", "shipped"]:
                    score += 2
            elif intent in ["product_inquiry", "inventory_check"]:
                if item.get("status") == "active":
                    score += 2
                if item.get("inventory", 0) > 0:
                    score += 1
            
            return score
        
        # Sort by relevance score (descending)
        try:
            return sorted(data, key=calculate_relevance_score, reverse=True)
        except Exception as e:
            logger.warning(f"Error prioritizing data: {e}")
            return data
    
    def _format_integration_data_enhanced(
        self,
        data: List[Dict[str, Any]],
        provider: str,
        resource_type: str,
        intent: str,
        query: str
    ) -> str:
        """Format integration data with enhanced, intelligent formatting for chatbot responses."""
        if not data:
            return f"No {resource_type} found for your query."
        
        # Header with context
        result = f"RELEVANT {resource_type.upper()} DATA FROM {provider.upper()}:\n"
        if query:
            result += f"(Search: '{query}')\n\n"
        
        # Format based on provider and resource type with enhanced details
        if provider == "shopify":
            if resource_type == "orders":
                for i, order in enumerate(data, 1):
                    result += f"{i}. Order #{order.get('order_number', order.get('name', 'Unknown'))}\n"
                    result += f"   • Status: {order.get('financial_status', 'Unknown')} / {order.get('fulfillment_status', 'Unknown')}\n"
                    result += f"   • Total: ${order.get('total_price', 'Unknown')} {order.get('currency', '')}\n"
                    
                    if order.get('customer'):
                        customer = order['customer']
                        customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                        if customer_name:
                            result += f"   • Customer: {customer_name}\n"
                        if customer.get('email'):
                            result += f"   • Email: {customer.get('email')}\n"
                    
                    created_date = order.get('created_at', '')
                    if created_date:
                        result += f"   • Ordered: {self._format_date(created_date)}\n"
                    
                    if order.get('line_items_count'):
                        result += f"   • Items: {order.get('line_items_count')}\n"
                    
                    result += "\n"
            
            elif resource_type == "products":
                for i, product in enumerate(data, 1):
                    result += f"{i}. {product.get('title', 'Unknown Product')}\n"
                    
                    if product.get('price'):
                        result += f"   • Price: ${product.get('price')}\n"
                    
                    inventory = product.get('inventory', 0)
                    if inventory is not None:
                        if inventory > 0:
                            result += f"   • In Stock: {inventory} available\n"
                        else:
                            result += f"   • Status: Out of stock\n"
                    
                    if product.get('vendor'):
                        result += f"   • Brand: {product.get('vendor')}\n"
                    
                    if product.get('product_type'):
                        result += f"   • Type: {product.get('product_type')}\n"
                    
                    if product.get('status'):
                        result += f"   • Status: {product.get('status').title()}\n"
                    
                    description = product.get('description', '')
                    if description and len(description) > 0:
                        # Truncate description for chat context
                        desc_preview = description[:100] + "..." if len(description) > 100 else description
                        result += f"   • Description: {desc_preview}\n"
                    
                    result += "\n"
            
            elif resource_type == "customers":
                for i, customer in enumerate(data, 1):
                    customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                    result += f"{i}. {customer_name or 'Customer'}\n"
                    
                    if customer.get('email'):
                        result += f"   • Email: {customer.get('email')}\n"
                    
                    orders_count = customer.get('orders_count', 0)
                    result += f"   • Orders: {orders_count}\n"
                    
                    total_spent = customer.get('total_spent')
                    if total_spent:
                        result += f"   • Total Spent: ${total_spent}\n"
                    
                    if customer.get('phone'):
                        result += f"   • Phone: {customer.get('phone')}\n"
                    
                    created_date = customer.get('created_at', '')
                    if created_date:
                        result += f"   • Customer Since: {self._format_date(created_date)}\n"
                    
                    result += "\n"
        
        else:
            # Generic formatting for other providers
            for i, item in enumerate(data, 1):
                result += f"{i}. "
                # Show most relevant fields (limit to avoid too much data)
                shown_fields = 0
                for key, value in item.items():
                    if shown_fields >= 5:  # Limit fields shown
                        break
                    if key.lower() in ["id", "created_at", "updated_at"]:
                        continue  # Skip technical fields
                    if value is not None and str(value).strip():
                        result += f"{key.replace('_', ' ').title()}: {value}, "
                        shown_fields += 1
                result = result.rstrip(", ") + "\n\n"
        
        # Add helpful context based on intent
        if intent == "order_status" and resource_type == "orders":
            result += "💡 Need help with an order? I can provide more details about any of these orders.\n"
        elif intent in ["product_inquiry", "inventory_check"] and resource_type == "products":
            result += "💡 Interested in any of these products? I can provide more details or help you place an order.\n"
        elif intent == "customer_support" and resource_type == "customers":
            result += "💡 I can help you with account-related questions or order history.\n"
        
        return result
    
    def _format_date(self, date_string: str) -> str:
        """Format date string for human readability."""
        try:
            if 'T' in date_string:
                dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
            else:
                dt = datetime.fromisoformat(date_string)
            return dt.strftime("%B %d, %Y")
        except Exception:
            return date_string  # Return original if parsing fails