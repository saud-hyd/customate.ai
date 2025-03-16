# backend/app/services/integration/providers/salesforce_provider.py
import httpx
import json
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin

from app.services.integration.providers.base_provider import BaseIntegrationProvider
from app.core import logger

class SalesforceProvider(BaseIntegrationProvider):
    """
    Salesforce integration provider.
    
    Handles integration with Salesforce's API for CRM data
    including contacts, accounts, and opportunities.
    """
    
    def test_connection(
        self, 
        endpoint_url: Optional[str],
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Test connection to Salesforce API."""
        try:
            # Get Salesforce instance URL and auth headers
            instance_url = self._get_instance_url(endpoint_url, credentials)
            headers = self._get_auth_headers(credentials)
            
            # Make test request to Salesforce API - get API versions
            response = httpx.get(
                f"{instance_url}/services/data",
                headers=headers,
                timeout=10.0
            )
            
            # Check response
            if response.status_code == 200:
                versions = response.json()
                latest_version = versions[-1] if versions else {}
                
                return {
                    "success": True,
                    "message": "Connection successful",
                    "details": {
                        "latest_version": latest_version.get("version"),
                        "latest_url": latest_version.get("url")
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"Connection failed: {response.status_code} - {response.text}",
                    "status_code": response.status_code
                }
                
        except Exception as e:
            logger.exception(f"Error testing Salesforce connection: {str(e)}")
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
        """Get data from Salesforce API."""
        try:
            # Get Salesforce instance URL and auth headers
            instance_url = self._get_instance_url(endpoint_url, credentials)
            headers = self._get_auth_headers(credentials)
            
            # Get API version
            api_version = "v58.0"  # Default to recent version
            if config and "api_version" in config:
                api_version = config["api_version"]
            
            # Build base services/data URL
            base_data_url = f"{instance_url}/services/data/{api_version}"
            
            # Map resource types to object names
            resource_map = {
                "contacts": "Contact",
                "accounts": "Account",
                "opportunities": "Opportunity",
                "leads": "Lead",
                "cases": "Case"
            }
            
            # Get object name from resource type
            if resource_type in resource_map:
                object_name = resource_map[resource_type]
            else:
                raise ValueError(f"Unsupported resource type: {resource_type}")
            
            # Construct SOQL query
            fields = "*"  # Default to all fields
            if config and "fields" in config:
                fields = ",".join(config["fields"])
            
            soql = f"SELECT {fields} FROM {object_name}"
            
            # Add WHERE clause for search
            where_clauses = []
            
            if query:
                # For simplicity, search in Name field
                # In a real implementation, this would be more sophisticated
                search_field = "Name"
                if resource_type == "contacts":
                    search_field = "Name"  # Could be FirstName, LastName, etc.
                elif resource_type == "accounts":
                    search_field = "Name"
                elif resource_type == "opportunities":
                    search_field = "Name"
                
                where_clauses.append(f"{search_field} LIKE '%{query}%'")
            
            # Add filters
            if filters:
                for field, value in filters.items():
                    # Simple string values for now
                    if isinstance(value, str):
                        where_clauses.append(f"{field} = '{value}'")
                    else:
                        where_clauses.append(f"{field} = {value}")
            
            # Add WHERE clause if needed
            if where_clauses:
                soql += " WHERE " + " AND ".join(where_clauses)
            
            # Add limit
            limit = 100
            if config and "limit" in config:
                limit = int(config["limit"])
            
            soql += f" LIMIT {limit}"
            
            # URL encode the SOQL query
            encoded_query = httpx.QueryParams({"q": soql}).encode()
            
            # Make request to Salesforce API
            response = httpx.get(
                f"{base_data_url}/query/?{encoded_query}",
                headers=headers,
                timeout=30.0
            )
            
            # Check response
            if response.status_code == 200:
                data = response.json()
                return data.get("records", [])
            else:
                logger.error(f"Error fetching {resource_type} from Salesforce: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.exception(f"Error fetching data from Salesforce: {str(e)}")
            return []
    
    def get_resource_types(self) -> List[str]:
        """Get available resource types for Salesforce."""
        return ["contacts", "accounts", "opportunities", "leads", "cases"]
    
    def _get_instance_url(self, endpoint_url: Optional[str], credentials: Dict[str, Any]) -> str:
        """Get Salesforce instance URL."""
        # First check if instance_url is in credentials (OAuth flow result)
        if "instance_url" in credentials:
            return credentials["instance_url"]
        
        # Then check endpoint_url
        if endpoint_url:
            # Ensure it has https://
            if not endpoint_url.startswith("http"):
                endpoint_url = f"https://{endpoint_url}"
            
            # Ensure URL ends with /
            if not endpoint_url.endswith("/"):
                endpoint_url += "/"
                
            return endpoint_url
        
        raise ValueError("No Salesforce instance URL provided")
    
    def _get_auth_headers(self, credentials: Dict[str, Any]) -> Dict[str, str]:
        """Get authentication headers for Salesforce API."""
        if "access_token" in credentials:
            # OAuth authentication
            return {
                "Authorization": f"Bearer {credentials['access_token']}",
                "Content-Type": "application/json"
            }
        else:
            raise ValueError("No valid authentication credentials provided. Salesforce requires OAuth authentication.")