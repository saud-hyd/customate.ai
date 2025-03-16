# app/services/industry/saas_service.py
from typing import Dict, Any, List, Optional
import re

from app.services.industry.base_industry import BaseIndustryService
from app.utils.entity_extractor import extract_entities
from app.utils.intent_classifier import classify_intent

class SaaSService(BaseIndustryService):
    """
    SaaS industry service implementation.
    
    Provides specialized processing for SaaS-related queries
    such as product features, pricing, integrations, and support.
    """
    
    def process_message(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a SaaS-related message.
        
        Args:
            message: The user's message
            context: Current conversation context
            
        Returns:
            SaaS-specific context and processing results
        """
        # Extract SaaS entities
        entities = self.extract_entities(message)
        
        # Classify user intent
        intent = classify_intent(message, domain="saas")
        
        # Create industry context
        industry_context = {
            "industry": "saas",
            "intent": intent,
            "entities": entities,
            "industry_instructions": self._get_instructions(intent),
        }
        
        # Add context from previous conversation if available
        if "features_mentioned" in context:
            industry_context["features_mentioned"] = context["features_mentioned"]
        
        # Add new features to context if found
        if entities.get("features"):
            if "features_mentioned" not in industry_context:
                industry_context["features_mentioned"] = []
            
            # Add new features to the list
            for feature in entities["features"]:
                if feature not in industry_context["features_mentioned"]:
                    industry_context["features_mentioned"].append(feature)
        
        return industry_context
    
    def get_prompting_strategy(self) -> Dict[str, Any]:
        """
        Get SaaS-specific prompting strategy.
        
        Returns:
            Dictionary with prompting instructions and templates
        """
        return {
            "system_prompt": (
                "You are a customer support assistant for a SaaS platform. "
                "Your goal is to help customers with product features, pricing, "
                "integrations, technical issues, and account management. "
                "Be helpful, clear, and concise."
            ),
            "intent_templates": {
                "feature_inquiry": "For feature inquiries, explain capabilities and benefits clearly.",
                "pricing_question": "For pricing questions, explain pricing tiers and what's included.",
                "integration_help": "For integration questions, provide details on available integrations and setup.",
                "technical_issue": "For technical issues, ask for details and guide users through troubleshooting steps.",
                "account_management": "For account questions, explain how to manage settings, users, and billing."
            }
        }
    
    def extract_entities(self, message: str) -> Dict[str, Any]:
        """
        Extract SaaS-specific entities from a message.
        
        Args:
            message: The user's message
            
        Returns:
            Dictionary of extracted entities
        """
        entities = {}
        
        # Extract feature mentions
        feature_patterns = [
            r"(dashboard|reports|analytics|notifications|automation|integration|api|webhook|sso|security)",
            r"(user management|role-based access|permissions|audit logs|compliance)",
            r"(billing|subscription|payment|invoice|pricing tier|plan)",
        ]
        
        features = []
        for pattern in feature_patterns:
            matches = re.findall(pattern, message.lower())
            if matches:
                features.extend(matches)
        
        if features:
            entities["features"] = list(set(features))
        
        # Extract integration mentions
        integration_pattern = r"(integrate|connect|sync) with ([a-z0-9\s]+)"
        integration_matches = re.findall(integration_pattern, message.lower())
        if integration_matches:
            entities["integrations"] = [match[1].strip() for match in integration_matches]
        
        # Extract pricing-related mentions
        pricing_pattern = r"(pricing|cost|price|subscription|plan|tier|monthly|annual|free trial)"
        pricing_matches = re.findall(pricing_pattern, message.lower())
        if pricing_matches:
            entities["pricing"] = list(set(pricing_matches))
        
        return entities
    
    def extract_intent_entities(self, message: str) -> tuple:
        """
        Extract both intent and entities from a message.
        
        Args:
            message: The user's message
            
        Returns:
            Tuple of (intent, entities)
        """
        intent = classify_intent(message, domain="saas")
        entities = self.extract_entities(message)
        return intent, entities    
    
    def _get_instructions(self, intent: str) -> str:
        """Get specific instructions based on detected intent."""
        if intent == "feature_inquiry":
            return (
                "The user is asking about product features. Provide clear explanations "
                "of our features and their benefits. If specific features are mentioned, "
                "focus on those. Otherwise, give an overview of key capabilities."
            )
        elif intent == "pricing_question":
            return (
                "The user is asking about pricing. Explain that we offer three tiers: "
                "Basic ($29/month), Professional ($79/month), and Enterprise (custom pricing). "
                "Each tier includes different features and support levels."
            )
        elif intent == "integration_help":
            return (
                "The user is asking about integrations. Explain that we integrate with "
                "popular tools like Slack, Google Workspace, Microsoft 365, Salesforce, "
                "and many more through our API and webhook system."
            )
        elif intent == "technical_issue":
            return (
                "The user has a technical issue. Ask for specific details about the problem, "
                "such as error messages, steps to reproduce, and their current environment. "
                "Provide troubleshooting steps when possible."
            )
        elif intent == "account_management":
            return (
                "The user is asking about account management. Guide them on how to "
                "manage their settings, add/remove users, update billing information, "
                "or change subscription details through their account dashboard."
            )
        else:
            return (
                "Respond helpfully to the user's query about our SaaS platform. "
                "Be concise but informative, and focus on providing the most relevant "
                "information to address their specific question."
            )