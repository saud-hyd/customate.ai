from typing import Dict, Any, List, Optional
import re

from app.services.industry.base_industry import BaseIndustryService
from app.utils.entity_extractor import extract_entities
from app.utils.intent_classifier import classify_intent

class EcommerceService(BaseIndustryService):
    """
    E-commerce industry service implementation.
    
    Provides specialized processing for e-commerce related queries
    such as product searches, order tracking, and return handling.
    """
    
    def process_message(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an e-commerce related message.
        
        Args:
            message: The user's message
            context: Current conversation context
            
        Returns:
            E-commerce specific context and processing results
        """
        # Extract e-commerce entities
        entities = self.extract_entities(message)
        
        # Classify user intent
        intent = classify_intent(message, domain="ecommerce")
        
        # Create industry context
        industry_context = {
            "industry": "ecommerce",
            "intent": intent,
            "entities": entities,
            "industry_instructions": self._get_instructions(intent),
        }
        
        # Add context from previous conversation if available
        if "products_mentioned" in context:
            industry_context["products_mentioned"] = context["products_mentioned"]
        
        # Add new products to context if found
        if entities.get("products"):
            if "products_mentioned" not in industry_context:
                industry_context["products_mentioned"] = []
            
            # Add new products to the list
            for product in entities["products"]:
                if product not in industry_context["products_mentioned"]:
                    industry_context["products_mentioned"].append(product)
        
        return industry_context
    
    def get_prompting_strategy(self) -> Dict[str, Any]:
        """
        Get e-commerce specific prompting strategy.
        
        Returns:
            Dictionary with prompting instructions and templates
        """
        return {
            "system_prompt": (
                "You are a customer support assistant for an e-commerce store. "
                "Your goal is to help customers with their orders, products, "
                "shipping, returns, and related queries. Be friendly and helpful."
            ),
            "intent_templates": {
                "product_inquiry": "For product inquiries, include specific details like price, availability, and features.",
                "order_status": "For order status questions, ask for the order number if not provided.",
                "return_request": "For return requests, explain the return policy and process.",
                "shipping_inquiry": "For shipping inquiries, provide shipping options and timeframes.",
                "general_question": "For general questions, be concise and helpful."
            }
        }
    
    def extract_entities(self, message: str) -> Dict[str, Any]:
        """
        Extract e-commerce specific entities from a message.
        
        Args:
            message: The user's message
            
        Returns:
            Dictionary of extracted entities
        """
        entities = {}
        
        # Extract order numbers (format: #12345 or ORDER-12345)
        order_pattern = r'(?:#|ORDER-|order\s*number\s*[:#]?\s*)(\d{5,})'
        order_matches = re.findall(order_pattern, message, re.IGNORECASE)
        if order_matches:
            entities["order_numbers"] = order_matches
        
        # Extract product mentions
        product_entities = extract_entities(message, entity_type="PRODUCT")
        if product_entities:
            entities["products"] = product_entities
        
        # Extract price mentions
        price_pattern = r'\$\d+(?:\.\d{2})?|\d+\s*dollars'
        price_matches = re.findall(price_pattern, message, re.IGNORECASE)
        if price_matches:
            entities["prices"] = price_matches
        
        return entities
    
    def _get_instructions(self, intent: str) -> str:
        """Get specific instructions based on detected intent."""
        if intent == "product_inquiry":
            return (
                "The user is asking about products. Provide detailed information "
                "about products mentioned. If specific products are mentioned, focus "
                "on those. If the user's query is vague, ask for more specific information."
            )
        elif intent == "order_status":
            return (
                "The user is asking about order status. If an order number is provided, "
                "reference it in your response. Otherwise, ask for the order number."
            )
        elif intent == "return_request":
            return (
                "The user is asking about returns. Explain the return policy: items can "
                "be returned within 30 days of purchase with original packaging for a full refund."
            )
        elif intent == "shipping_inquiry":
            return (
                "The user is asking about shipping. Standard shipping takes 3-5 business days, "
                "expedited shipping takes 1-2 business days."
            )
        else:
            return (
                "Respond helpfully to the user's query. If they're asking about products, "
                "orders, shipping, or returns, provide relevant information."
            )