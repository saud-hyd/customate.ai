# backend/app/services/integration/providers/base_provider.py
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional

class BaseIntegrationProvider(ABC):
    """
    Base abstract class for integration providers.
    
    Each provider implementation will handle authentication, data retrieval,
    and operations specific to that external service.
    """
    
    @abstractmethod
    def test_connection(
        self, 
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Test connection to the service.
        
        Args:
            endpoint_url: Service endpoint URL
            credentials: Authentication credentials
            config: Additional configuration
            
        Returns:
            Dictionary with connection test results
        """
        pass
    
    @abstractmethod
    def get_data(
        self,
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        resource_type: str,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get data from the service.
        
        Args:
            endpoint_url: Service endpoint URL
            credentials: Authentication credentials
            resource_type: Type of resource to fetch
            query: Search query
            filters: Additional filters
            config: Additional configuration
            
        Returns:
            List of data items
        """
        pass
    
    @abstractmethod
    def get_resource_types(self) -> List[str]:
        """
        Get available resource types for this provider.
        
        Returns:
            List of resource type identifiers
        """
        pass
    
    def get_auth_types(self) -> List[str]:
        """
        Get supported authentication types.
        
        Returns:
            List of authentication type identifiers
        """
        return ["api_key", "oauth2", "basic"]
    
    def format_error_response(self, error: Exception) -> Dict[str, Any]:
        """
        Format error response.
        
        Args:
            error: Exception
            
        Returns:
            Formatted error response
        """
        return {
            "success": False,
            "error": str(error),
            "error_type": error.__class__.__name__
        }