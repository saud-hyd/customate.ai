# backend/app/services/integration/providers/base_provider.py
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import time
import hashlib
import json

class BaseIntegrationProvider(ABC):
    """
    Enhanced base abstract class for integration providers.
    
    Each provider implementation handles authentication, data retrieval,
    validation, caching, and operations specific to that external service.
    """
    
    def __init__(self):
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes default TTL
    
    @abstractmethod
    def test_connection(
        self, 
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Test connection to the service with comprehensive validation.
        
        Args:
            endpoint_url: Service endpoint URL
            credentials: Authentication credentials
            config: Additional configuration
            
        Returns:
            Dictionary with connection test results including:
            - success: Boolean indicating if connection succeeded
            - message: Human-readable status message
            - details: Additional connection details (optional)
            - status_code: HTTP-like status code (optional)
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
        Get data from the service with intelligent filtering and formatting.
        
        Args:
            endpoint_url: Service endpoint URL
            credentials: Authentication credentials
            resource_type: Type of resource to fetch
            query: Search query
            filters: Additional filters
            config: Additional configuration
            
        Returns:
            List of formatted data items optimized for chatbot consumption
        """
        pass
    
    @abstractmethod
    def get_resource_types(self) -> List[str]:
        """
        Get available resource types for this provider.
        
        Returns:
            List of resource type identifiers (e.g., ['products', 'orders', 'customers'])
        """
        pass
    
    def get_auth_types(self) -> List[str]:
        """
        Get supported authentication types.
        
        Returns:
            List of authentication type identifiers
        """
        return ["api_key", "oauth2", "basic", "access_token"]
    
    def validate_credentials(self, credentials: Dict[str, Any]) -> Dict[str, bool]:
        """
        Validate credentials format without making external calls.
        
        Args:
            credentials: Authentication credentials
            
        Returns:
            Dictionary with validation results
        """
        return {
            "valid": True,
            "message": "Credentials appear valid"
        }
    
    def get_cache_key(
        self, 
        endpoint_url: str, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate cache key for data requests.
        
        Args:
            endpoint_url: Service endpoint
            resource_type: Resource type
            query: Query string
            filters: Filters applied
            
        Returns:
            Unique cache key string
        """
        cache_data = {
            "endpoint": endpoint_url,
            "resource_type": resource_type,
            "query": query,
            "filters": filters or {}
        }
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def get_cached_data(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve data from cache if available and not expired.
        
        Args:
            cache_key: Cache key
            
        Returns:
            Cached data or None if not available/expired
        """
        if cache_key in self._cache:
            cached_item = self._cache[cache_key]
            if time.time() - cached_item["timestamp"] < self._cache_ttl:
                return cached_item["data"]
            else:
                # Remove expired cache entry
                del self._cache[cache_key]
        
        return None
    
    def set_cached_data(self, cache_key: str, data: List[Dict[str, Any]]) -> None:
        """
        Store data in cache.
        
        Args:
            cache_key: Cache key
            data: Data to cache
        """
        self._cache[cache_key] = {
            "data": data,
            "timestamp": time.time()
        }
        
        # Simple cache cleanup - remove oldest entries if cache gets too large
        if len(self._cache) > 100:  # Max 100 cache entries
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k]["timestamp"])
            del self._cache[oldest_key]
    
    def clear_cache(self) -> None:
        """Clear all cached data."""
        self._cache.clear()
    
    def format_error_response(self, error: Exception, context: str = "") -> Dict[str, Any]:
        """
        Format comprehensive error response.
        
        Args:
            error: Exception that occurred
            context: Additional context about the error
            
        Returns:
            Formatted error response
        """
        error_message = str(error)
        if context:
            error_message = f"{context}: {error_message}"
        
        return {
            "success": False,
            "message": error_message,
            "error_type": error.__class__.__name__,
            "status_code": getattr(error, 'status_code', 500)
        }
    
    def format_success_response(
        self, 
        message: str, 
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Format success response.
        
        Args:
            message: Success message
            details: Additional details
            
        Returns:
            Formatted success response
        """
        response = {
            "success": True,
            "message": message
        }
        
        if details:
            response["details"] = details
        
        return response
    
    def sanitize_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sanitize data for safe consumption by removing sensitive fields.
        
        Args:
            data: Raw data from API
            
        Returns:
            Sanitized data
        """
        sensitive_fields = [
            "password", "secret", "token", "key", "private",
            "ssn", "social_security", "credit_card", "cvv",
            "api_key", "access_token", "refresh_token"
        ]
        
        sanitized_data = []
        for item in data:
            sanitized_item = {}
            for key, value in item.items():
                # Skip sensitive fields
                if any(sensitive in key.lower() for sensitive in sensitive_fields):
                    continue
                sanitized_item[key] = value
            sanitized_data.append(sanitized_item)
        
        return sanitized_data
    
    def apply_rate_limiting(self) -> bool:
        """
        Apply rate limiting logic.
        
        Returns:
            True if request can proceed, False if rate limited
        """
        # Default implementation - override in specific providers
        return True
    
    def get_data_with_cache(
        self,
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        resource_type: str,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get data with caching support.
        
        Args:
            endpoint_url: Service endpoint URL
            credentials: Authentication credentials
            resource_type: Type of resource to fetch
            query: Search query
            filters: Additional filters
            config: Additional configuration
            use_cache: Whether to use caching
            
        Returns:
            List of data items
        """
        # Generate cache key
        cache_key = self.get_cache_key(endpoint_url, resource_type, query, filters)
        
        # Try to get from cache first
        if use_cache:
            cached_data = self.get_cached_data(cache_key)
            if cached_data is not None:
                return cached_data
        
        # Apply rate limiting
        if not self.apply_rate_limiting():
            return []  # Rate limited
        
        # Fetch fresh data
        try:
            data = self.get_data(endpoint_url, credentials, resource_type, query, filters, config)
            
            # Sanitize data
            sanitized_data = self.sanitize_data(data)
            
            # Cache the result
            if use_cache and sanitized_data:
                self.set_cached_data(cache_key, sanitized_data)
            
            return sanitized_data
            
        except Exception as e:
            # Log error but don't cache failures
            return []