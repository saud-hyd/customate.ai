# backend/app/services/integration/providers/shopify_provider.py
import httpx
import json
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlencode

from app.services.integration.providers.base_provider import BaseIntegrationProvider
from app.core import logger

class ShopifyProvider(BaseIntegrationProvider):
    """
    Shopify integration provider.
    
    Handles integration with Shopify's API for e-commerce data
    including products, orders, and customers.
    """
    
    def test_connection(
        self, 
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Test connection to Shopify API."""
        try:
            # Normalize endpoint URL
            base_url = self._normalize_endpoint(endpoint_url)
            
            # Construct auth header based on credentials
            headers = self._get_auth_headers(credentials)
            
            # Make test request to Shopify API - get shop info
            response = httpx.get(
                urljoin(base_url, "shop.json"),
                headers=headers,
                timeout=10.0
            )
            
            # Check response
            if response.status_code == 200:
                shop_data = response.json().get("shop", {})
                return {
                    "success": True,
                    "message": "Connection successful",
                    "details": {
                        "shop_name": shop_data.get("name"),
                        "shop_email": shop_data.get("email"),
                        "plan_name": shop_data.get("plan_name")
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"Connection failed: {response.status_code} - {response.text}",
                    "status_code": response.status_code
                }
                
        except Exception as e:
            logger.exception(f"Error testing Shopify connection: {str(e)}")
            return self.format_error_response(e)
    
    def get_data(
        self,
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        resource_type: str,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get data from Shopify API."""
        try:
            # Normalize endpoint URL
            base_url = self._normalize_endpoint(endpoint_url)
            
            # Construct auth header based on credentials
            headers = self._get_auth_headers(credentials)
            
            # Set up parameters
            params = {}
            
            # Limit results (default 50, max 250)
            limit = 50
            if config and "limit" in config:
                limit = min(int(config["limit"]), 250)
            params["limit"] = limit
            
            # Handle query parameter based on resource type
            if query:
                if resource_type == "products":
                    params["title"] = query
                elif resource_type == "orders":
                    params["name"] = query
                elif resource_type == "customers":
                    params["query"] = query
            
            # Add filters if provided
            if filters:
                for key, value in filters.items():
                    if key not in params:  # Don't override existing params
                        params[key] = value
            
            # Determine API endpoint based on resource type
            if resource_type == "products":
                endpoint = "products.json"
            elif resource_type == "orders":
                endpoint = "orders.json"
            elif resource_type == "customers":
                endpoint = "customers.json"
            else:
                raise ValueError(f"Unsupported resource type: {resource_type}")
            
            # Make request to Shopify API
            full_url = urljoin(base_url, endpoint)
            if params:
                # Add parameters to URL
                query_string = urlencode(params)
                full_url = f"{full_url}?{query_string}"
            
            response = httpx.get(
                full_url,
                headers=headers,
                timeout=30.0
            )
            
            # Check response
            if response.status_code == 200:
                data = response.json()
                
                # Extract results based on resource type
                if resource_type == "products":
                    return data.get("products", [])
                elif resource_type == "orders":
                    return data.get("orders", [])
                elif resource_type == "customers":
                    return data.get("customers", [])
                else:
                    return []
            else:
                logger.error(f"Error fetching {resource_type} from Shopify: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.exception(f"Error fetching data from Shopify: {str(e)}")
            return []
    
    def get_resource_types(self) -> List[str]:
        """Get available resource types for Shopify."""
        return ["products", "orders", "customers"]
    
    def _normalize_endpoint(self, endpoint_url: Optional[str]) -> str:
        """Normalize Shopify endpoint URL."""
        if not endpoint_url:
            raise ValueError("Shopify endpoint URL is required")
        
        # Ensure URL has https://
        if not endpoint_url.startswith("http"):
            endpoint_url = f"https://{endpoint_url}"
        
        # Ensure URL ends with /admin/api/(version)/
        if not "/admin/api/" in endpoint_url:
            if not endpoint_url.endswith("/"):
                endpoint_url += "/"
            endpoint_url += "admin/api/2023-07/"  # Current stable API version
        elif not endpoint_url.endswith("/"):
            endpoint_url += "/"
        
        return endpoint_url
    
    def _get_auth_headers(self, credentials: Dict[str, Any]) -> Dict[str, str]:
        """Get authentication headers for Shopify API."""
        if "api_key" in credentials and "password" in credentials:
            # Private app authentication
            return {
                "X-Shopify-Access-Token": credentials["password"],
                "Content-Type": "application/json"
            }
        elif "access_token" in credentials:
            # OAuth authentication
            return {
                "X-Shopify-Access-Token": credentials["access_token"],
                "Content-Type": "application/json"
            }
        else:
            raise ValueError("No valid authentication credentials provided")