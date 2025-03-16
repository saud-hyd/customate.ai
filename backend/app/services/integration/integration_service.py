# backend/app/services/integration/integration_service.py
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid
from sqlalchemy.orm import Session

from app.domain.integration.entities import Integration, IntegrationSync
from app.repositories.integration_repository import IntegrationRepository, IntegrationSyncRepository
from app.services.integration.providers.provider_factory import ProviderFactory
from app.services.integration.auth_manager import IntegrationAuthManager
from app.core import logger

class IntegrationService:
    """
    Service for managing integrations with external services.
    
    This service:
    1. Manages integration configurations
    2. Provides unified access to different provider types
    3. Handles authentication and refresh
    4. Coordinates data synchronization
    """
    
    def __init__(self):
        self.integration_repo = IntegrationRepository()
        self.sync_repo = IntegrationSyncRepository()
        self.provider_factory = ProviderFactory()
        self.auth_manager = IntegrationAuthManager()
    
    def get_available_integrations(self) -> List[Dict[str, Any]]:
        """Get a list of available integration providers."""
        return [
            {
                "id": "zendesk",
                "name": "Zendesk",
                "description": "Customer support and ticketing system",
                "icon": "zendesk_icon",
                "auth_type": "oauth2",
                "resource_types": ["tickets", "users", "organizations"]
            },
            {
                "id": "shopify",
                "name": "Shopify",
                "description": "E-commerce platform",
                "icon": "shopify_icon",
                "auth_type": "api_key",
                "resource_types": ["products", "orders", "customers"]
            },
            {
                "id": "salesforce",
                "name": "Salesforce",
                "description": "CRM platform",
                "icon": "salesforce_icon",
                "auth_type": "oauth2",
                "resource_types": ["contacts", "accounts", "opportunities"]
            }
        ]
    
    def get_client_integrations(self, db: Session, client_id: str) -> List[Dict[str, Any]]:
        """Get all integrations for a client."""
        integrations = self.integration_repo.get_by_client_id(db, client_id)
        
        result = []
        for integration in integrations:
            # Get latest sync record if available
            latest_sync = self.sync_repo.get_latest_by_integration_id(db, integration.integration_id)
            
            # Format integration data
            integration_data = {
                "integration_id": integration.integration_id,
                "provider": integration.provider,
                "name": integration.name,
                "status": integration.status,
                "is_active": integration.is_active,
                "created_at": integration.created_at.isoformat(),
                "last_sync": integration.last_sync.isoformat() if integration.last_sync else None,
                "config": integration.config
            }
            
            # Add sync information if available
            if latest_sync:
                integration_data["latest_sync"] = {
                    "sync_id": latest_sync.sync_id,
                    "status": latest_sync.status,
                    "start_time": latest_sync.start_time.isoformat(),
                    "end_time": latest_sync.end_time.isoformat() if latest_sync.end_time else None,
                    "items_processed": latest_sync.items_processed,
                    "items_created": latest_sync.items_created,
                    "items_updated": latest_sync.items_updated,
                    "items_failed": latest_sync.items_failed
                }
            
            result.append(integration_data)
        
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
        """Create a new integration for a client."""
        # Check if provider is supported
        available_providers = [p["id"] for p in self.get_available_integrations()]
        if provider not in available_providers:
            raise ValueError(f"Unsupported provider: {provider}")
        
        # Check for existing integrations with same provider
        existing = self.integration_repo.get_by_provider(db, client_id, provider)
        if existing:
            raise ValueError(f"An integration with provider '{provider}' already exists")
        
        # Prepare secure credentials (this would be encrypted in production)
        credentials = {}
        if api_key:
            credentials["api_key"] = api_key
        if api_secret:
            credentials["api_secret"] = api_secret
        
        # Create integration object
        integration_data = {
            "integration_id": str(uuid.uuid4()),
            "client_id": client_id,
            "provider": provider,
            "name": name,
            "status": "configured",
            "credentials": credentials,
            "endpoint_url": api_endpoint,
            "config": config or {},
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        integration = self.integration_repo.create(db, obj_in=integration_data)
        
        # Format response
        return {
            "integration_id": integration.integration_id,
            "provider": integration.provider,
            "name": integration.name,
            "status": integration.status,
            "endpoint_url": integration.endpoint_url,
            "config": integration.config,
            "is_active": integration.is_active,
            "created_at": integration.created_at.isoformat()
        }
    
    def update_integration(
        self,
        db: Session,
        integration_id: str,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing integration."""
        # Get existing integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Update integration
        updated_integration = self.integration_repo.update(db, db_obj=integration, obj_in=update_data)
        
        # Format response
        return {
            "integration_id": updated_integration.integration_id,
            "provider": updated_integration.provider,
            "name": updated_integration.name,
            "status": updated_integration.status,
            "endpoint_url": updated_integration.endpoint_url,
            "config": updated_integration.config,
            "is_active": updated_integration.is_active,
            "updated_at": updated_integration.updated_at.isoformat()
        }
    
    def delete_integration(self, db: Session, integration_id: str) -> bool:
        """Delete an integration."""
        # Get existing integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Delete integration
        self.integration_repo.delete(db, id=integration.id)
        
        return True
    
    def test_connection(self, db: Session, integration_id: str) -> Dict[str, Any]:
        """Test connection to an integration provider."""
        # Get integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Get provider implementation
        provider = self.provider_factory.get_provider(integration.provider)
        
        # Test connection
        try:
            result = provider.test_connection(
                integration.endpoint_url,
                integration.credentials,
                integration.config
            )
            
            # Update integration status
            if result["success"]:
                self.integration_repo.update_status(
                    db, integration_id, "connected", 
                    status_message="Connection successful"
                )
            else:
                self.integration_repo.update_status(
                    db, integration_id, "error", 
                    status_message=result.get("message", "Connection failed")
                )
            
            return result
        except Exception as e:
            logger.exception(f"Error testing connection for integration {integration_id}: {str(e)}")
            
            # Update integration status
            self.integration_repo.update_status(
                db, integration_id, "error", 
                status_message=f"Connection error: {str(e)}"
            )
            
            return {
                "success": False,
                "message": f"Connection error: {str(e)}"
            }
    
    def start_sync(self, db: Session, integration_id: str) -> Dict[str, Any]:
        """Start a synchronization process for an integration."""
        # Get integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Create sync record
        sync_data = {
            "sync_id": str(uuid.uuid4()),
            "integration_id": integration_id,
            "status": "in_progress",
            "start_time": datetime.utcnow(),
            "items_processed": 0,
            "items_created": 0,
            "items_updated": 0,
            "items_failed": 0
        }
        
        sync = self.sync_repo.create(db, obj_in=sync_data)
        
        # Update integration last_sync time
        self.integration_repo.update_last_sync(db, integration_id)
        
        # Start sync process in background (this would be a proper background task in production)
        # For now, we'll simulate a successful sync
        self.sync_repo.complete_sync(
            db, 
            sync.sync_id, 
            "completed", 
            10,  # items_processed 
            5,   # items_created
            5,   # items_updated
            0    # items_failed
        )
        
        return {
            "sync_id": sync.sync_id,
            "integration_id": integration_id,
            "status": "in_progress",
            "start_time": sync.start_time.isoformat(),
            "message": "Synchronization started"
        }
    
    def disconnect_integration(self, db: Session, integration_id: str) -> Dict[str, Any]:
        """Disconnect an integration."""
        # Get integration
        integration = self.integration_repo.get_by_integration_id(db, integration_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")
        
        # Deactivate integration
        self.integration_repo.deactivate(db, integration_id)
        
        return {
            "integration_id": integration_id,
            "status": "disconnected",
            "message": "Integration disconnected successfully"
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
        Get data from an integration provider.
        
        Args:
            db: Database session
            client_id: Client ID
            provider: Provider type (zendesk, shopify, etc.)
            resource_type: Resource type (tickets, products, etc.)
            query: Search query
            filters: Additional filters
            
        Returns:
            List of data items
        """
        # Get active integration for this provider
        integration = self.integration_repo.get_by_provider(db, client_id, provider)
        if not integration or not integration.is_active:
            logger.warning(f"No active integration found for provider {provider} and client {client_id}")
            return []
        
        return self.get_data(integration, resource_type, query, filters)
    
    def get_data(
        self,
        integration: Integration,
        resource_type: str,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get data from an integration.
        
        Args:
            integration: Integration entity
            resource_type: Resource type (tickets, products, etc.)
            query: Search query
            filters: Additional filters
            
        Returns:
            List of data items
        """
        # Get provider implementation
        provider = self.provider_factory.get_provider(integration.provider)
        
        # Fetch data
        try:
            return provider.get_data(
                integration.endpoint_url,
                integration.credentials,
                resource_type,
                query,
                filters,
                integration.config
            )
        except Exception as e:
            logger.exception(f"Error fetching data from integration {integration.integration_id}: {str(e)}")
            return []