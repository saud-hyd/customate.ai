# backend/app/services/integration/providers/shopify_provider.py
import httpx
import json
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlencode
from datetime import datetime, timedelta
import asyncio
import re

from app.services.integration.providers.base_provider import BaseIntegrationProvider
from app.core import logger

class ShopifyProvider(BaseIntegrationProvider):
    """
    Enhanced Shopify integration provider for API version 2024-07.
    
    Handles integration with Shopify's Admin API for e-commerce data
    including products, orders, customers with proper validation,
    error handling, and intelligent data formatting for chatbot responses.
    """
    
    API_VERSION = "2024-07"
    TIMEOUT = 30.0
    MAX_RETRIES = 3
    
    def test_connection(
        self, 
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Test connection to Shopify API with comprehensive validation."""
        try:
            # Validate and normalize endpoint URL
            validation_result = self._validate_store_domain(endpoint_url)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "message": validation_result["message"],
                    "status_code": 400
                }
            
            base_url = validation_result["normalized_url"]
            
            # Validate credentials
            cred_validation = self._validate_credentials(credentials)
            if not cred_validation["valid"]:
                return {
                    "success": False,
                    "message": cred_validation["message"],
                    "status_code": 401
                }
            
            # Get authentication headers
            headers = self._get_auth_headers(credentials)
            
            # Test connection with shop info endpoint
            shop_url = urljoin(base_url, "shop.json")
            
            with httpx.Client(timeout=self.TIMEOUT) as client:
                response = client.get(shop_url, headers=headers)
            
            # Handle different response scenarios
            if response.status_code == 200:
                shop_data = response.json().get("shop", {})
                
                # Validate essential shop data
                if not shop_data.get("name"):
                    return {
                        "success": False,
                        "message": "Invalid shop data received. Please check your store domain.",
                        "status_code": 422
                    }
                
                return {
                    "success": True,
                    "message": "Connection successful",
                    "details": {
                        "shop_name": shop_data.get("name"),
                        "shop_email": shop_data.get("email"),
                        "plan_name": shop_data.get("plan_name"),
                        "domain": shop_data.get("domain"),
                        "myshopify_domain": shop_data.get("myshopify_domain"),
                        "currency": shop_data.get("currency"),
                        "timezone": shop_data.get("iana_timezone"),
                        "api_version": self.API_VERSION
                    }
                }
            elif response.status_code == 401:
                return {
                    "success": False,
                    "message": "Authentication failed. Please check your Admin API Access Token.",
                    "status_code": 401
                }
            elif response.status_code == 403:
                return {
                    "success": False,
                    "message": "Access denied. Your API token may not have required permissions.",
                    "status_code": 403
                }
            elif response.status_code == 404:
                return {
                    "success": False,
                    "message": "Store not found. Please check your store domain.",
                    "status_code": 404
                }
            elif response.status_code == 429:
                return {
                    "success": False,
                    "message": "Rate limit exceeded. Please try again later.",
                    "status_code": 429
                }
            else:
                error_details = ""
                try:
                    error_data = response.json()
                    if "errors" in error_data:
                        error_details = f" Details: {error_data['errors']}"
                except:
                    pass
                
                return {
                    "success": False,
                    "message": f"Connection failed with status {response.status_code}.{error_details}",
                    "status_code": response.status_code
                }
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "message": "Connection timeout. Please check your store domain and try again.",
                "status_code": 408
            }
        except httpx.NetworkError as e:
            return {
                "success": False,
                "message": f"Network error: Unable to connect to store. Please check your domain.",
                "status_code": 503
            }
        except Exception as e:
            logger.exception(f"Unexpected error testing Shopify connection: {str(e)}")
            return {
                "success": False,
                "message": f"Unexpected error: {str(e)}",
                "status_code": 500
            }
    
    def get_data(
        self,
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        resource_type: str,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get data from Shopify API with enhanced error handling and formatting."""
        try:
            # Validate inputs
            base_url = self._normalize_endpoint(endpoint_url)
            headers = self._get_auth_headers(credentials)
            
            # Set up parameters
            params = self._build_query_params(resource_type, query, filters, config)
            
            # Determine API endpoint
            endpoint = self._get_api_endpoint(resource_type)
            if not endpoint:
                logger.error(f"Unsupported resource type: {resource_type}")
                return []
            
            # Make request with retry logic
            data = self._make_api_request(base_url, endpoint, headers, params)
            
            # Format data for chatbot consumption
            return self._format_response_data(data, resource_type)
            
        except Exception as e:
            logger.exception(f"Error fetching {resource_type} from Shopify: {str(e)}")
            return []
    
    def get_resource_types(self) -> List[str]:
        """Get available resource types for Shopify."""
        return ["products", "orders", "customers", "inventory_levels", "locations"]
    
    def get_auth_types(self) -> List[str]:
        """Get supported authentication types for Shopify."""
        return ["access_token"]
    
    def _validate_store_domain(self, domain: Optional[str]) -> Dict[str, Any]:
        """Validate and normalize Shopify store domain."""
        if not domain:
            return {
                "valid": False,
                "message": "Store domain is required"
            }
        
        domain = domain.strip()
        
        # Remove protocol if present
        domain = re.sub(r'^https?://', '', domain)
        
        # Remove trailing slash
        domain = domain.rstrip('/')
        
        # Check if it's a valid myshopify domain
        if not domain.endswith('.myshopify.com'):
            if '.' not in domain:
                domain = f"{domain}.myshopify.com"
            else:
                return {
                    "valid": False,
                    "message": "Invalid store domain. Use format: your-store.myshopify.com"
                }
        
        # Validate domain format
        if not re.match(r'^[a-z0-9][a-z0-9\-]*[a-z0-9]\.myshopify\.com$', domain):
            return {
                "valid": False,
                "message": "Invalid store domain format. Use format: your-store.myshopify.com"
            }
        
        return {
            "valid": True,
            "normalized_url": f"https://{domain}/admin/api/{self.API_VERSION}/"
        }
    
    def _validate_credentials(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Shopify credentials."""
        if not credentials:
            return {
                "valid": False,
                "message": "Credentials are required"
            }
        
        # Check for Admin API Access Token
        access_token = credentials.get("access_token") or credentials.get("api_key")
        
        if not access_token:
            return {
                "valid": False,
                "message": "Admin API Access Token is required"
            }
        
        # Validate token format (should start with shpat_ for Admin API)
        if not access_token.startswith('shpat_'):
            return {
                "valid": False,
                "message": "Invalid token format. Admin API tokens should start with 'shpat_'"
            }
        
        # Basic length check
        if len(access_token) < 20:
            return {
                "valid": False,
                "message": "Access token appears to be too short"
            }
        
        return {"valid": True}
    
    def _normalize_endpoint(self, endpoint_url: Optional[str]) -> str:
        """Normalize Shopify endpoint URL."""
        if not endpoint_url:
            raise ValueError("Shopify endpoint URL is required")
        
        # Use validation logic
        validation_result = self._validate_store_domain(endpoint_url)
        if not validation_result["valid"]:
            raise ValueError(validation_result["message"])
        
        return validation_result["normalized_url"]
    
    def _get_auth_headers(self, credentials: Dict[str, Any]) -> Dict[str, str]:
        """Get authentication headers for Shopify API."""
        access_token = credentials.get("access_token") or credentials.get("api_key")
        
        if not access_token:
            raise ValueError("Admin API Access Token is required")
        
        return {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def _build_query_params(
        self, 
        resource_type: str, 
        query: Optional[str], 
        filters: Optional[Dict[str, Any]], 
        config: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build query parameters for API request."""
        params = {}
        
        # Set default limit
        limit = 50
        if config and "limit" in config:
            limit = min(int(config["limit"]), 250)  # Shopify max is 250
        params["limit"] = limit
        
        # Add query-specific parameters
        if query:
            if resource_type == "products":
                # For products, search in title and description
                params["title"] = query
            elif resource_type == "orders":
                # For orders, search by order number or customer
                if query.isdigit():
                    params["name"] = f"#{query}"
                else:
                    params["email"] = query
            elif resource_type == "customers":
                # For customers, search by email or name
                params["query"] = query
        
        # Add additional filters
        if filters:
            for key, value in filters.items():
                if key not in params:
                    params[key] = value
        
        return params
    
    def _get_api_endpoint(self, resource_type: str) -> Optional[str]:
        """Get the appropriate API endpoint for resource type."""
        endpoints = {
            "products": "products.json",
            "orders": "orders.json", 
            "customers": "customers.json",
            "inventory_levels": "inventory_levels.json",
            "locations": "locations.json"
        }
        return endpoints.get(resource_type)
    
    def _make_api_request(
        self, 
        base_url: str, 
        endpoint: str, 
        headers: Dict[str, str], 
        params: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Make API request with retry logic."""
        full_url = urljoin(base_url, endpoint)
        
        for attempt in range(self.MAX_RETRIES):
            try:
                with httpx.Client(timeout=self.TIMEOUT) as client:
                    response = client.get(full_url, headers=headers, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Extract the relevant data based on endpoint
                    if endpoint == "products.json":
                        return data.get("products", [])
                    elif endpoint == "orders.json":
                        return data.get("orders", [])
                    elif endpoint == "customers.json":
                        return data.get("customers", [])
                    elif endpoint == "inventory_levels.json":
                        return data.get("inventory_levels", [])
                    elif endpoint == "locations.json":
                        return data.get("locations", [])
                    else:
                        return []
                
                elif response.status_code == 429:  # Rate limited
                    if attempt < self.MAX_RETRIES - 1:
                        wait_time = 2 ** attempt  # Exponential backoff
                        logger.warning(f"Rate limited, waiting {wait_time}s before retry {attempt + 1}")
                        asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.error("Max retries reached for rate limiting")
                        return []
                
                else:
                    logger.error(f"API request failed with status {response.status_code}: {response.text}")
                    return []
                    
            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    logger.warning(f"Request failed, retrying: {str(e)}")
                    continue
                else:
                    logger.error(f"All retry attempts failed: {str(e)}")
                    return []
        
        return []
    
    def _format_response_data(
        self, 
        data: List[Dict[str, Any]], 
        resource_type: str
    ) -> List[Dict[str, Any]]:
        """Format API response data for chatbot consumption."""
        if not data:
            return []
        
        formatted_data = []
        
        for item in data:
            if resource_type == "products":
                formatted_item = {
                    "id": item.get("id"),
                    "title": item.get("title"),
                    "status": item.get("status"),
                    "price": self._get_product_price(item),
                    "inventory": self._get_product_inventory(item),
                    "description": self._clean_html(item.get("body_html", "")),
                    "vendor": item.get("vendor"),
                    "product_type": item.get("product_type"),
                    "tags": item.get("tags", "").split(",") if item.get("tags") else [],
                    "handle": item.get("handle"),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at")
                }
                
            elif resource_type == "orders":
                formatted_item = {
                    "id": item.get("id"),
                    "order_number": item.get("order_number"),
                    "name": item.get("name"),
                    "email": item.get("email"),
                    "financial_status": item.get("financial_status"),
                    "fulfillment_status": item.get("fulfillment_status"),
                    "total_price": item.get("total_price"),
                    "currency": item.get("currency"),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                    "customer": {
                        "first_name": item.get("customer", {}).get("first_name"),
                        "last_name": item.get("customer", {}).get("last_name"),
                        "email": item.get("customer", {}).get("email")
                    } if item.get("customer") else None,
                    "shipping_address": item.get("shipping_address"),
                    "line_items_count": len(item.get("line_items", []))
                }
                
            elif resource_type == "customers":
                formatted_item = {
                    "id": item.get("id"),
                    "email": item.get("email"),
                    "first_name": item.get("first_name"),
                    "last_name": item.get("last_name"),
                    "orders_count": item.get("orders_count", 0),
                    "total_spent": item.get("total_spent"),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                    "state": item.get("state"),
                    "phone": item.get("phone"),
                    "tags": item.get("tags", "").split(",") if item.get("tags") else []
                }
                
            else:
                # Generic formatting for other resource types
                formatted_item = item
            
            formatted_data.append(formatted_item)
        
        return formatted_data
    
    def _get_product_price(self, product: Dict[str, Any]) -> Optional[str]:
        """Extract product price from variants."""
        variants = product.get("variants", [])
        if variants:
            return variants[0].get("price")
        return None
    
    def _get_product_inventory(self, product: Dict[str, Any]) -> int:
        """Extract total inventory from variants."""
        variants = product.get("variants", [])
        total_inventory = 0
        for variant in variants:
            inventory = variant.get("inventory_quantity", 0)
            if inventory:
                total_inventory += inventory
        return total_inventory
    
    def _clean_html(self, html_text: str) -> str:
        """Remove HTML tags from text."""
        if not html_text:
            return ""
        import re
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html_text).strip()