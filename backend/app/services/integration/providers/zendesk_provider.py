# backend/app/services/integration/providers/zendesk_provider.py
import httpx
import base64
import json
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin

from app.services.integration.providers.base_provider import BaseIntegrationProvider
from app.core import logger

class ZendeskProvider(BaseIntegrationProvider):
    """
    Zendesk integration provider.
    
    Handles integration with Zendesk's API for ticket management
    and customer support functionality.
    """
    
    def test_connection(
        self, 
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Test connection to Zendesk API."""
        try:
            # Normalize endpoint URL
            base_url = self._normalize_endpoint(endpoint_url)
            
            # Construct auth header based on credentials
            headers = self._get_auth_headers(credentials)
            
            # Make test request to Zendesk API
            response = httpx.get(
                urljoin(base_url, "/api/v2/tickets/count"),
                headers=headers,
                timeout=10.0
            )
            
            # Check response
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message": "Connection successful",
                    "details": {
                        "count": data.get("count", {}).get("value", 0)
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"Connection failed: {response.status_code} - {response.text}",
                    "status_code": response.status_code
                }
                
        except Exception as e:
            logger.exception(f"Error testing Zendesk connection: {str(e)}")
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
        """Get data from Zendesk API."""
        try:
            # Normalize endpoint URL
            base_url = self._normalize_endpoint(endpoint_url)
            
            # Construct auth header based on credentials
            headers = self._get_auth_headers(credentials)
            
            # Set up parameters
            params = {}
            if query:
                params["query"] = query
            
            # Add filters if provided
            if filters:
                for key, value in filters.items():
                    params[key] = value
            
            # Determine API endpoint based on resource type
            if resource_type == "tickets":
                endpoint = "/api/v2/tickets"
                if query:
                    endpoint = "/api/v2/search"
                    if "query" in params:
                        params["query"] = f"type:ticket {params['query']}"
                    else:
                        params["query"] = "type:ticket"
            elif resource_type == "users":
                endpoint = "/api/v2/users"
                if query:
                    endpoint = "/api/v2/search"
                    if "query" in params:
                        params["query"] = f"type:user {params['query']}"
                    else:
                        params["query"] = "type:user"
            elif resource_type == "organizations":
                endpoint = "/api/v2/organizations"
            else:
                raise ValueError(f"Unsupported resource type: {resource_type}")
            
            # Make request to Zendesk API
            response = httpx.get(
                urljoin(base_url, endpoint),
                headers=headers,
                params=params,
                timeout=30.0
            )
            
            # Check response
            if response.status_code == 200:
                data = response.json()
                
                # Extract results based on resource type and endpoint
                if endpoint == "/api/v2/search":
                    return data.get("results", [])
                elif resource_type == "tickets":
                    return data.get("tickets", [])
                elif resource_type == "users":
                    return data.get("users", [])
                elif resource_type == "organizations":
                    return data.get("organizations", [])
                else:
                    return []
            else:
                logger.error(f"Error fetching {resource_type} from Zendesk: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.exception(f"Error fetching data from Zendesk: {str(e)}")
            return []
    
    def get_resource_types(self) -> List[str]:
        """Get available resource types for Zendesk."""
        return ["tickets", "users", "organizations"]
    
    def _normalize_endpoint(self, endpoint_url: Optional[str]) -> str:
        """Normalize Zendesk endpoint URL."""
        if not endpoint_url:
            raise ValueError("Zendesk endpoint URL is required")
        
        # Ensure URL has https://
        if not endpoint_url.startswith("http"):
            endpoint_url = f"https://{endpoint_url}"
        
        # Ensure URL includes zendesk.com
        if not "zendesk.com" in endpoint_url:
            if not endpoint_url.endswith("/"):
                endpoint_url += "."
            endpoint_url += "zendesk.com"
        
        # Ensure URL ends with /
        if not endpoint_url.endswith("/"):
            endpoint_url += "/"
        
        return endpoint_url
    
    def _get_auth_headers(self, credentials: Dict[str, Any]) -> Dict[str, str]:
        """Get authentication headers for Zendesk API."""
        if "api_key" in credentials:
            # API key authentication
            if "email" not in credentials:
                raise ValueError("Email is required for API key authentication")
            
            email = credentials["email"]
            api_key = credentials["api_key"]
            
            # Format: {email}/token:{api_key}
            auth_str = f"{email}/token:{api_key}"
            encoded_auth = base64.b64encode(auth_str.encode()).decode()
            
            return {
                "Authorization": f"Basic {encoded_auth}",
                "Content-Type": "application/json"
            }
        elif "access_token" in credentials:
            # OAuth authentication
            return {
                "Authorization": f"Bearer {credentials['access_token']}",
                "Content-Type": "application/json"
            }
        else:
            raise ValueError("No valid authentication credentials provided")