# backend/app/services/integration/providers/provider_factory.py
from typing import Dict, Any
import importlib

from app.services.integration.providers.base_provider import BaseIntegrationProvider
from app.services.integration.providers.zendesk_provider import ZendeskProvider
from app.services.integration.providers.shopify_provider import ShopifyProvider
from app.services.integration.providers.salesforce_provider import SalesforceProvider
from app.core import logger

class ProviderFactory:
    """
    Factory for creating integration provider instances.
    
    This factory provides appropriate provider implementation
    based on the integration provider type.
    """
    
    def __init__(self):
        # Register known providers
        self._providers = {
            "zendesk": ZendeskProvider(),
            "shopify": ShopifyProvider(),
            "salesforce": SalesforceProvider(),
        }
        
        # Default fallback provider
        self._default_provider = None
    
    def get_provider(self, provider_type: str) -> BaseIntegrationProvider:
        """
        Get appropriate provider implementation.
        
        Args:
            provider_type: The provider type (e.g., 'zendesk', 'shopify')
            
        Returns:
            Provider implementation
        """
        provider_type = provider_type.lower()
        
        if provider_type in self._providers:
            return self._providers[provider_type]
        
        # If provider is not registered, try dynamic import
        try:
            # Try to dynamically import the provider class
            module_name = f"app.services.integration.providers.{provider_type}_provider"
            class_name = f"{provider_type.capitalize()}Provider"
            
            module = importlib.import_module(module_name)
            provider_class = getattr(module, class_name)
            
            # Create instance and register it
            provider = provider_class()
            self._providers[provider_type] = provider
            
            return provider
        except (ImportError, AttributeError) as e:
            logger.warning(f"Provider '{provider_type}' not found: {str(e)}")
            
            # If no default provider, create one
            if not self._default_provider:
                from app.services.integration.providers.mock_provider import MockProvider
                self._default_provider = MockProvider()
            
            return self._default_provider
    
    def register_provider(self, provider_type: str, provider: BaseIntegrationProvider) -> None:
        """
        Register a new provider implementation.
        
        Args:
            provider_type: The provider type (e.g., 'zendesk', 'shopify')
            provider: The provider implementation
        """
        self._providers[provider_type.lower()] = provider