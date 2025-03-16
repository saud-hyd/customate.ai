# backend/app/services/integration/integration_service.py
from typing import Dict, Any, List, Optional, Tuple
import requests
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.repositories.integration_repository import IntegrationRepository, IntegrationSyncRepository
from app.core import logger
from app.domain.integration.entities import Integration, IntegrationSync

class IntegrationService:
    """
    Service for managing external integrations.
    
    This service handles:
    - Integration configuration and management
    - API communication with external services
    - Data synchronization
    - Error handling and status tracking
    """
    
    def __init__(self):
        self.integration_repo = IntegrationRepository()
        self.sync_repo = IntegrationSyncRepository()
        self.providers = {
            "zendesk": ZendeskIntegration(),
            "shopify": ShopifyIntegration(),
            "salesforce": SalesforceIntegration(),
            "slack": SlackIntegration(),
            "hubspot": HubSpotIntegration(),
        }
    
    def get_available_integrations(self) -> List[Dict[str, Any]]:
        """
        Get list of available integration providers.
        
        Returns:
            List of dictionaries with provider information
        """
        return [
            {
                "id": "zendesk",
                "name": "Zendesk",
                "description": "Connect to Zendesk to sync customer support tickets and conversations.",
                "icon": "zendesk_icon",
                "auth_type": "api_key",
                "fields": ["api_endpoint", "api_key", "api_secret"]
            },
            {
                "id": "shopify",
                "name": "Shopify",
                "description": "Integrate with Shopify to access product information and order details.",
                "icon": "shopify_icon",
                "auth_type": "oauth",
                "fields": ["api_endpoint", "api_key", "api_secret"]
            },
            {
                "id": "salesforce",
                "name": "Salesforce",
                "description": "Integrate with Salesforce CRM to sync customer data and create leads from chatbot interactions.",
                "icon": "salesforce_icon",
                "auth_type": "oauth",
                "fields": ["api_endpoint", "api_key", "api_secret"]
            },
            {
                "id": "slack",
                "name": "Slack",
                "description": "Connect your Slack workspace to receive notifications and chat transcripts directly in your channels.",
                "icon": "slack_icon",
                "auth_type": "oauth",
                "fields": ["api_key", "channel"]
            },
            {
                "id": "hubspot",
                "name": "HubSpot",
                "description": "Connect with HubSpot to streamline your marketing, sales, and service processes with chatbot interactions.",
                "icon": "hubspot_icon",
                "auth_type": "oauth",
                "fields": ["api_key"]
            }
        ]
    
    def get_client_integrations(self, db: Session, client_id: str) -> List[Dict[str, Any]]:
        """
        Get all integrations for a client with formatted data.
        
        Args:
            db: Database session
            client_id: Client ID
            
        Returns:
            List of formatted integrations
        """
        integrations = self.integration_repo.get_by_client_id(db, client_id)
        
        result = []
        for integration in integrations:
            # Get latest sync information
            latest_sync = self.sync_repo.get_latest_by_integration_id(db, integration.integration_id)
            
            # Format the integration data
            result.append({
                "integration_id": integration.integration_id,
                "provider": integration.provider,
                "name": integration.name,
                "is_active": integration.is_active,
                "api_endpoint": integration.api_endpoint,
                "last_sync": integration.last_sync.isoformat() if integration.last_sync else None,
                "status": integration.status,
                "status_message": integration.status_message,
                "created_at": integration.created_at.isoformat(),
                "updated_at": integration.updated_at.isoformat(),
                "latest_sync": {
                    "sync_id": latest_sync.sync_id if latest_sync else None,
                    "status": latest_sync.status if latest_sync else None,
                    "start_time": latest_sync.start_time.isoformat() if latest_sync and latest_sync.start_time else None,
                    "end_time": latest_sync.end_time.isoformat() if latest_sync and latest_sync.end_time else None,
                    "items_processed": latest_sync.items_processed if latest_sync else 0,
                }
            })
        
        return result
    
    def create_integration(
        self, 
        db: Session, 
        client_id: str, 
        provider: str, 
        name: str,
        api_endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new integration for a client.
        
        Args:
            db: Database session
            client_id: Client ID
            provider: Integration provider (zendesk, shopify, etc.)
            name: Display name for the integration
            api_endpoint: API endpoint URL
            api_key: API key or client ID
            api_secret: API secret or client secret
            config: Additional configuration
            
        Returns:
            Created integration
        """
        # Check if provider exists
        if provider not in self.providers:
            raise ValueError(f"Unsupported integration provider: {provider}")
        
        # Check if integration already exists
        existing = self.integration_repo.get_by_provider(db, client_id, provider)
        if existing:
            raise ValueError(f"Integration with provider {provider} already exists for this client")
        
        # Create integration
        integration_data = {
            "client_id": client_id,
            "provider": provider,
            "name": name,
            "api_endpoint": api_endpoint,
            "api_key": api_key,
            "api_secret": api_secret,
            "config": config or {},
            "is_active": True,
            "status": "pending",
        }
        
        integration = self.integration_repo.create(db, obj_in=integration_data)
        
        # Test connection
        success, message = self._test_connection(db, integration)
        
        if success:
            self.integration_repo.update_status(db, integration.integration_id, "connected", "Integration connected successfully")
        else:
            self.integration_repo.update_status(db, integration.integration_id, "failed", message)
        
        # Refresh integration
        integration = self.integration_repo.get_by_integration_id(db, integration.integration_id)
        
        # Format response
        return {
            "integration_id": integration.integration_id,
            "provider": integration.provider,
            "name": integration.name,
            "is_active": integration.is_active,
            "api_endpoint": integration.api_endpoint,
            "status": integration.status,
            "status_message": integration.status_message,
            "created_at": integration.created_at.isoformat(),
            "updated_at": integration.updated_at.isoformat(),
        }
    
    def update_integration(
        self, 
        db: Session, 
        integration_id: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update an existing integration.
        
        Args:
            db: Database session
            integration_id: Integration ID
            data: Update data
            
        Returns:
            Updated integration
        """
        # Get existing integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Update integration
        updated = self.integration_repo.update(db, db_obj=integration, obj_in=data)
        
        # Test connection if credentials changed
        if "api_endpoint" in data or "api_key" in data or "api_secret" in data:
            success, message = self._test_connection(db, updated)
            
            if success:
                self.integration_repo.update_status(db, integration_id, "connected", "Integration updated successfully")
            else:
                self.integration_repo.update_status(db, integration_id, "failed", message)
            
            # Refresh integration
            updated = self.integration_repo.get_by_integration_id(db, integration_id)
        
        # Format response
        return {
            "integration_id": updated.integration_id,
            "provider": updated.provider,
            "name": updated.name,
            "is_active": updated.is_active,
            "api_endpoint": updated.api_endpoint,
            "status": updated.status,
            "status_message": updated.status_message,
            "created_at": updated.created_at.isoformat(),
            "updated_at": updated.updated_at.isoformat(),
        }
    
    def delete_integration(self, db: Session, integration_id: str) -> bool:
        """
        Delete an integration.
        
        Args:
            db: Database session
            integration_id: Integration ID
            
        Returns:
            Success flag
        """
        # Get existing integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Delete integration
        self.integration_repo.delete(db, id=integration.id)
        
        return True
    
    def test_connection(self, db: Session, integration_id: str) -> Dict[str, Any]:
        """
        Test connection to an integration provider.
        
        Args:
            db: Database session
            integration_id: Integration ID
            
        Returns:
            Test result
        """
        # Get integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Test connection
        success, message = self._test_connection(db, integration)
        
        # Update status
        if success:
            self.integration_repo.update_status(db, integration_id, "connected", "Connection test successful")
        else:
            self.integration_repo.update_status(db, integration_id, "failed", message)
        
        return {
            "success": success,
            "message": message,
            "integration_id": integration_id,
            "provider": integration.provider,
            "status": "connected" if success else "failed",
        }
    
    def _test_connection(self, db: Session, integration: Integration) -> Tuple[bool, str]:
        """
        Test connection to integration provider.
        
        Args:
            db: Database session
            integration: Integration entity
            
        Returns:
            Success flag and message
        """
        provider = self.providers.get(integration.provider)
        if not provider:
            return False, f"Unsupported provider: {integration.provider}"
        
        try:
            # Test connection using provider-specific implementation
            return provider.test_connection(integration)
        except Exception as e:
            logger.error(f"Integration test failed: {str(e)}")
            return False, f"Connection test failed: {str(e)}"
    
    def start_sync(self, db: Session, integration_id: str) -> Dict[str, Any]:
        """
        Start a data synchronization process for an integration.
        
        Args:
            db: Database session
            integration_id: Integration ID
            
        Returns:
            Sync information
        """
        # Get integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        if not integration.is_active:
            raise ValueError(f"Integration is not active: {integration_id}")
        
        # Create sync record
        sync = self.sync_repo.create(db, obj_in={
            "integration_id": integration_id,
            "status": "running",
        })
        
        # Update last sync time
        self.integration_repo.update_last_sync(db, integration_id)
        
        # Run sync in background (in a production system, this would be a background task)
        try:
            # Get provider implementation
            provider = self.providers.get(integration.provider)
            if not provider:
                raise ValueError(f"Unsupported provider: {integration.provider}")
            
            # Run sync
            result = provider.sync_data(integration)
            
            # Update sync record
            self.sync_repo.complete_sync(
                db,
                sync.sync_id,
                status="success" if result["success"] else "failed",
                items_processed=result.get("items_processed", 0),
                items_created=result.get("items_created", 0),
                items_updated=result.get("items_updated", 0),
                items_failed=result.get("items_failed", 0),
                error_message=result.get("error_message"),
                sync_details=result.get("details")
            )
            
            # Format response
            return {
                "sync_id": sync.sync_id,
                "status": "success" if result["success"] else "failed",
                "integration_id": integration_id,
                "provider": integration.provider,
                "items_processed": result.get("items_processed", 0),
                "message": result.get("message", "Sync completed"),
                "start_time": sync.start_time.isoformat(),
                "end_time": datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Sync failed: {str(e)}")
            
            # Update sync record
            self.sync_repo.complete_sync(
                db,
                sync.sync_id,
                status="failed",
                items_processed=0,
                items_created=0,
                items_updated=0,
                items_failed=0,
                error_message=str(e)
            )
            
            return {
                "sync_id": sync.sync_id,
                "status": "failed",
                "integration_id": integration_id,
                "provider": integration.provider,
                "items_processed": 0,
                "message": f"Sync failed: {str(e)}",
                "start_time": sync.start_time.isoformat(),
                "end_time": datetime.utcnow().isoformat(),
            }
    
    def get_integration_data(
        self, 
        db: Session, 
        client_id: str, 
        provider: str, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get data from an integration based on resource type and query.
        
        Args:
            db: Database session
            client_id: Client ID
            provider: Integration provider
            resource_type: Type of resource to fetch (tickets, products, etc.)
            query: Search query
            filters: Additional filters
            
        Returns:
            List of resources
        """
        # Get integration
        integration = self.integration_repo.get_by_provider(db, client_id, provider)
        if not integration:
            raise ValueError(f"Integration not found for provider: {provider}")
        
        if not integration.is_active:
            raise ValueError(f"Integration is not active: {integration.provider}")
        
        try:
            # Get provider implementation
            provider_impl = self.providers.get(integration.provider)
            if not provider_impl:
                raise ValueError(f"Unsupported provider: {integration.provider}")
            
            # Get data
            return provider_impl.get_data(integration, resource_type, query, filters)
            
        except Exception as e:
            logger.error(f"Failed to get integration data: {str(e)}")
            raise
    
    def disconnect_integration(self, db: Session, integration_id: str) -> Dict[str, Any]:
        """
        Disconnect an integration.
        
        Args:
            db: Database session
            integration_id: Integration ID
            
        Returns:
            Result
        """
        # Get integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Deactivate integration
        updated = self.integration_repo.deactivate(db, integration_id)
        
        return {
            "success": True,
            "integration_id": integration_id,
            "provider": updated.provider,
            "status": updated.status,
        }

# Base class for provider-specific integrations
class BaseProviderIntegration:
    def test_connection(self, integration: Integration) -> Tuple[bool, str]:
        """Test connection to the provider."""
        raise NotImplementedError("Provider must implement test_connection method")
    
    def sync_data(self, integration: Integration) -> Dict[str, Any]:
        """Sync data from the provider."""
        raise NotImplementedError("Provider must implement sync_data method")
    
    def get_data(
        self, 
        integration: Integration, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get data from the provider."""
        raise NotImplementedError("Provider must implement get_data method")

# Zendesk integration implementation
class ZendeskIntegration(BaseProviderIntegration):
    def test_connection(self, integration: Integration) -> Tuple[bool, str]:
        """Test connection to Zendesk."""
        if not integration.api_endpoint or not integration.api_key:
            return False, "Missing API endpoint or API key"
        
        try:
            # Make a simple API call to verify credentials
            headers = {
                "Authorization": f"Bearer {integration.api_key}",
                "Content-Type": "application/json"
            }
            
            # Request Zendesk account info
            response = requests.get(
                f"{integration.api_endpoint}/api/v2/account/settings",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return True, "Connection successful"
            else:
                return False, f"Connection failed: {response.status_code} - {response.text}"
            
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    def sync_data(self, integration: Integration) -> Dict[str, Any]:
        """Sync data from Zendesk."""
        if not integration.api_endpoint or not integration.api_key:
            return {
                "success": False,
                "message": "Missing API endpoint or API key",
                "items_processed": 0
            }
        
        try:
            # Make API call to get tickets
            headers = {
                "Authorization": f"Bearer {integration.api_key}",
                "Content-Type": "application/json"
            }
            
            # Request tickets
            response = requests.get(
                f"{integration.api_endpoint}/api/v2/tickets",
                headers=headers,
                params={"per_page": 100},
                timeout=30
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "message": f"Failed to fetch tickets: {response.status_code} - {response.text}",
                    "items_processed": 0
                }
            
            data = response.json()
            tickets = data.get("tickets", [])
            
            return {
                "success": True,
                "message": f"Successfully synced {len(tickets)} tickets",
                "items_processed": len(tickets),
                "items_created": len(tickets),
                "items_updated": 0,
                "items_failed": 0,
                "details": {
                    "total_tickets": len(tickets)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Sync failed: {str(e)}",
                "items_processed": 0,
                "error_message": str(e)
            }
    
    def get_data(
        self, 
        integration: Integration, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get data from Zendesk."""
        if not integration.api_endpoint or not integration.api_key:
            raise ValueError("Missing API endpoint or API key")
        
        # Set up headers
        headers = {
            "Authorization": f"Bearer {integration.api_key}",
            "Content-Type": "application/json"
        }
        
        # Handle different resource types
        if resource_type == "tickets":
            # Build query parameters
            params = {"per_page": 100}
            if query:
                params["query"] = query
            if filters:
                for key, value in filters.items():
                    params[key] = value
            
            # Make API call
            response = requests.get(
                f"{integration.api_endpoint}/api/v2/tickets",
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch tickets: {response.status_code} - {response.text}")
            
            data = response.json()
            return data.get("tickets", [])
            
        elif resource_type == "users":
            # Build query parameters
            params = {"per_page": 100}
            if query:
                params["query"] = query
            
            # Make API call
            response = requests.get(
                f"{integration.api_endpoint}/api/v2/users",
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch users: {response.status_code} - {response.text}")
            
            data = response.json()
            return data.get("users", [])
            
        else:
            raise ValueError(f"Unsupported resource type: {resource_type}")

# Shopify integration implementation
class ShopifyIntegration(BaseProviderIntegration):
    def test_connection(self, integration: Integration) -> Tuple[bool, str]:
        """Test connection to Shopify."""
        if not integration.api_endpoint or not integration.api_key:
            return False, "Missing API endpoint or API key"
        
        try:
            # Make a simple API call to verify credentials
            headers = {
                "X-Shopify-Access-Token": integration.api_key,
                "Content-Type": "application/json"
            }
            
            # Request shop information
            response = requests.get(
                f"{integration.api_endpoint}/admin/api/2023-01/shop.json",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return True, "Connection successful"
            else:
                return False, f"Connection failed: {response.status_code} - {response.text}"
            
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    def sync_data(self, integration: Integration) -> Dict[str, Any]:
        """Sync data from Shopify."""
        if not integration.api_endpoint or not integration.api_key:
            return {
                "success": False,
                "message": "Missing API endpoint or API key",
                "items_processed": 0
            }
        
        try:
            # Make API call to get products
            headers = {
                "X-Shopify-Access-Token": integration.api_key,
                "Content-Type": "application/json"
            }
            
            # Request products
            response = requests.get(
                f"{integration.api_endpoint}/admin/api/2023-01/products.json",
                headers=headers,
                params={"limit": 250},
                timeout=30
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "message": f"Failed to fetch products: {response.status_code} - {response.text}",
                    "items_processed": 0
                }
            
            data = response.json()
            products = data.get("products", [])
            
            return {
                "success": True,
                "message": f"Successfully synced {len(products)} products",
                "items_processed": len(products),
                "items_created": len(products),
                "items_updated": 0,
                "items_failed": 0,
                "details": {
                    "total_products": len(products)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Sync failed: {str(e)}",
                "items_processed": 0,
                "error_message": str(e)
            }
    
    def get_data(
        self, 
        integration: Integration, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get data from Shopify."""
        if not integration.api_endpoint or not integration.api_key:
            raise ValueError("Missing API endpoint or API key")
        
        # Set up headers
        headers = {
            "X-Shopify-Access-Token": integration.api_key,
            "Content-Type": "application/json"
        }
        
        # Handle different resource types
        if resource_type == "products":
            # Build query parameters
            params = {"limit": 250}
            if query:
                params["title"] = query
            if filters:
                for key, value in filters.items():
                    params[key] = value
            
            # Make API call
            response = requests.get(
                f"{integration.api_endpoint}/admin/api/2023-01/products.json",
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch products: {response.status_code} - {response.text}")
            
            data = response.json()
            return data.get("products", [])
            
        elif resource_type == "orders":
            # Build query parameters
            params = {"limit": 250}
            if filters:
                for key, value in filters.items():
                    params[key] = value
            
            # Make API call
            response = requests.get(
                f"{integration.api_endpoint}/admin/api/2023-01/orders.json",
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch orders: {response.status_code} - {response.text}")
            
            data = response.json()
            return data.get("orders", [])
            
        elif resource_type == "customers":
            # Build query parameters
            params = {"limit": 250}
            if query:
                params["query"] = query
            
            # Make API call
            response = requests.get(
                f"{integration.api_endpoint}/admin/api/2023-01/customers.json",
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch customers: {response.status_code} - {response.text}")
            
            data = response.json()
            return data.get("customers", [])
            
        else:
            raise ValueError(f"Unsupported resource type: {resource_type}")

# Stubbed implementations for other providers
class SalesforceIntegration(BaseProviderIntegration):
    def test_connection(self, integration: Integration) -> Tuple[bool, str]:
        # Simplified implementation for demo purposes
        return True, "Connection successful"
    
    def sync_data(self, integration: Integration) -> Dict[str, Any]:
        # Simplified implementation for demo purposes
        return {
            "success": True,
            "message": "Successfully synced data",
            "items_processed": 150,
            "items_created": 50,
            "items_updated": 100,
            "items_failed": 0
        }
    
    def get_data(
        self, 
        integration: Integration, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        # Simplified implementation for demo purposes
        return [{"id": "1", "name": "Sample Data"}]

class SlackIntegration(BaseProviderIntegration):
    def test_connection(self, integration: Integration) -> Tuple[bool, str]:
        # Simplified implementation for demo purposes
        return True, "Connection successful"
    
    def sync_data(self, integration: Integration) -> Dict[str, Any]:
        # Simplified implementation for demo purposes
        return {
            "success": True,
            "message": "Successfully synced data",
            "items_processed": 0,
            "items_created": 0,
            "items_updated": 0,
            "items_failed": 0
        }
    
    def get_data(
        self, 
        integration: Integration, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        # Simplified implementation for demo purposes
        return [{"id": "1", "name": "Sample Data"}]

class HubSpotIntegration(BaseProviderIntegration):
    def test_connection(self, integration: Integration) -> Tuple[bool, str]:
        # Simplified implementation for demo purposes
        return True, "Connection successful"
    
    def sync_data(self, integration: Integration) -> Dict[str, Any]:
        # Simplified implementation for demo purposes
        return {
            "success": True,
            "message": "Successfully synced data",
            "items_processed": 200,
            "items_created": 100,
            "items_updated": 100,
            "items_failed": 0
        }
    
    def get_data(
        self, 
        integration: Integration, 
        resource_type: str, 
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        # Simplified implementation for demo purposes
        return [{"id": "1", "name": "Sample Data"}]