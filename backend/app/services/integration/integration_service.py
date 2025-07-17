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

logger = logging.getLogger(__name__)    

class IntegrationService:
    """Enhanced service for managing external integrations with validation and improved error handling."""
    
    def __init__(self):
        self.repo = IntegrationRepository()
        self.sync_repo = IntegrationSyncRepository()
        self.provider_factory = ProviderFactory()
        self.auth_manager = IntegrationAuthManager()
        
    def get_available_integrations(self) -> List[Dict[str, Any]]:
        """Get list of available integration providers with updated information."""
        return [
            {
                "id": "shopify",
                "name": "Shopify",
                "description": "E-commerce platform integration for products, orders, and customers",
                "resource_types": ["products", "orders", "customers", "inventory_levels", "locations"],
                "auth_types": ["access_token"],
                "fields": [
                    {
                        "name": "store_domain",
                        "label": "Store Domain",
                        "type": "text",
                        "placeholder": "your-store.myshopify.com",
                        "required": True,
                        "help": "Your Shopify store domain (e.g., your-store.myshopify.com)"
                    },
                    {
                        "name": "access_token",
                        "label": "Admin API Access Token",
                        "type": "password",
                        "placeholder": "shpat_...",
                        "required": True,
                        "help": "Admin API Access Token from your Shopify Custom App"
                    }
                ],
                "setup_instructions": [
                    "Go to your Shopify Admin → Settings → Apps and sales channels",
                    "Click 'Develop apps' → 'Create an app'",
                    "Configure Admin API access with required scopes",
                    "Generate Admin API access token",
                    "Copy the token (starts with 'shpat_') and your store domain"
                ]
            },
            {
                "id": "zendesk",
                "name": "Zendesk",
                "description": "Customer service and engagement platform",
                "resource_types": ["tickets", "users", "organizations"],
                "auth_types": ["api_key", "oauth2"],
                "fields": [
                    {
                        "name": "subdomain",
                        "label": "Zendesk Subdomain",
                        "type": "text",
                        "placeholder": "yourcompany",
                        "required": True,
                        "help": "Your Zendesk subdomain (from yourcompany.zendesk.com)"
                    },
                    {
                        "name": "api_key",
                        "label": "API Token",
                        "type": "password",
                        "required": True,
                        "help": "API token from Zendesk Admin → Channels → API"
                    },
                    {
                        "name": "email",
                        "label": "Admin Email",
                        "type": "email",
                        "required": True,
                        "help": "Email address of Zendesk admin user"
                    }
                ]
            },
            {
                "id": "salesforce",
                "name": "Salesforce",
                "description": "CRM platform integration",
                "resource_types": ["contacts", "accounts", "opportunities", "leads"],
                "auth_types": ["oauth2"],
                "fields": [
                    {
                        "name": "instance_url",
                        "label": "Salesforce Instance",
                        "type": "text",
                        "placeholder": "https://yourinstance.salesforce.com",
                        "required": True,
                        "help": "Your Salesforce instance URL"
                    },
                    {
                        "name": "client_id",
                        "label": "Consumer Key",
                        "type": "text",
                        "required": True,
                        "help": "Consumer Key from Connected App"
                    },
                    {
                        "name": "client_secret",
                        "label": "Consumer Secret",
                        "type": "password",
                        "required": True,
                        "help": "Consumer Secret from Connected App"
                    }
                ]
            }
        ]
    
    def get_client_integrations(
        self, db: Session, client_id: str
    ) -> List[Dict[str, Any]]:
        """Get all integrations for a client with enhanced details."""
        integrations = self.repo.get_by_client_id(db, client_id)
        
        result = []
        for integration in integrations:
            # Get latest sync info
            latest_sync = self.sync_repo.get_latest_by_integration_id(db, integration.integration_id)
            
            # Format integration data
            integration_data = {
                "integration_id": integration.integration_id,
                "provider": integration.provider,
                "name": integration.name,
                "status": integration.status,
                "status_message": integration.status_message,
                "endpoint_url": integration.endpoint_url,
                "is_active": integration.is_active,
                "last_sync": integration.last_sync.isoformat() if integration.last_sync else None,
                "created_at": integration.created_at.isoformat(),
                "updated_at": integration.updated_at.isoformat(),
                "config": {
                    # Only return non-sensitive config data
                    key: value for key, value in (integration.config or {}).items() 
                    if key not in ["credentials", "api_key", "access_token", "client_secret"]
                }
            }
            
            # Add sync information
            if latest_sync:
                integration_data["latest_sync"] = {
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
    
    def test_integration_connection(
        self,
        db: Session,
        client_id: str,
        provider: str,
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Test integration connection with comprehensive validation."""
        try:
            # Get provider implementation
            provider_impl = self.provider_factory.get_provider(provider)
            
            # Extract endpoint from config or credentials
            endpoint_url = None
            if config:
                endpoint_url = config.get("endpoint_url") or config.get("store_domain") or config.get("subdomain")
            
            if not endpoint_url and "store_domain" in credentials:
                endpoint_url = credentials["store_domain"]
            elif not endpoint_url and "subdomain" in credentials:
                endpoint_url = credentials["subdomain"]
            
            # Test connection
            result = provider_impl.test_connection(
                endpoint_url=endpoint_url,
                credentials=credentials,
                config=config
            )
            
            # Log test result
            logger.info(f"Integration test for {provider} - Client {client_id}: {result['success']}")
            
            return result
            
        except Exception as e:
            logger.exception(f"Error testing integration connection for {provider}: {str(e)}")
            return {
                "success": False,
                "message": f"Connection test failed: {str(e)}",
                "status_code": 500
            }
    
    def create_integration(
        self,
        db: Session,
        client_id: str,
        provider: str,
        name: str,
        credentials: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new integration with enhanced validation."""
        try:
            # Check if integration already exists for this client and provider
            existing = self.repo.get_by_provider(db, client_id, provider)
            if existing:
                raise ValueError(f"Integration with provider {provider} already exists for this client")
            
            # Test connection first
            test_result = self.test_integration_connection(db, client_id, provider, credentials, config)
            if not test_result["success"]:
                return {
                    "success": False,
                    "message": f"Connection test failed: {test_result['message']}",
                    "error_code": "CONNECTION_FAILED"
                }
            
            # Prepare configuration
            if config is None:
                config = {}
            
            # Store credentials securely in config
            config["credentials"] = credentials
            
            # Extract endpoint URL from credentials or config
            endpoint_url = None
            if "store_domain" in credentials:
                endpoint_url = credentials["store_domain"]
            elif "subdomain" in credentials:
                endpoint_url = f"{credentials['subdomain']}.zendesk.com"
            elif "instance_url" in credentials:
                endpoint_url = credentials["instance_url"]
            elif config and "endpoint_url" in config:
                endpoint_url = config["endpoint_url"]
            
            # Create integration
            integration_data = {
                "client_id": client_id,
                "provider": provider,
                "name": name,
                "status": "connected",
                "status_message": "Successfully connected",
                "endpoint_url": endpoint_url,
                "config": config,
                "is_active": True
            }
            
            integration = self.repo.create(db, obj_in=integration_data)
            
            # Log successful creation
            logger.info(f"Integration created successfully: {integration.integration_id} for client {client_id}")
            
            # Return success response
            return {
                "success": True,
                "message": "Integration created successfully",
                "integration": {
                    "integration_id": integration.integration_id,
                    "provider": integration.provider,
                    "name": integration.name,
                    "status": integration.status,
                    "endpoint_url": integration.endpoint_url,
                    "is_active": integration.is_active,
                    "created_at": integration.created_at.isoformat()
                }
            }
            
        except ValueError as e:
            logger.warning(f"Validation error creating integration: {str(e)}")
            return {
                "success": False,
                "message": str(e),
                "error_code": "VALIDATION_ERROR"
            }
        except Exception as e:
            logger.exception(f"Error creating integration: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to create integration: {str(e)}",
                "error_code": "CREATION_ERROR"
            }
    
    def update_integration(
        self,
        db: Session,
        integration_id: str,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing integration with validation."""
        try:
            # Get existing integration
            integration = self.repo.get_by_integration_id(db, integration_id)
            if not integration:
                return {
                    "success": False,
                    "message": f"Integration not found: {integration_id}",
                    "error_code": "NOT_FOUND"
                }
            
            # If credentials are being updated, test connection
            if "credentials" in update_data or "config" in update_data:
                # Merge new credentials with existing ones
                new_credentials = update_data.get("credentials", {})
                existing_credentials = integration.config.get("credentials", {}) if integration.config else {}
                merged_credentials = {**existing_credentials, **new_credentials}
                
                # Test connection with new credentials
                test_result = self.test_integration_connection(
                    db, 
                    integration.client_id, 
                    integration.provider, 
                    merged_credentials,
                    update_data.get("config", integration.config)
                )
                
                if not test_result["success"]:
                    return {
                        "success": False,
                        "message": f"Connection test failed: {test_result['message']}",
                        "error_code": "CONNECTION_FAILED"
                    }
                
                # Update config with new credentials
                new_config = integration.config.copy() if integration.config else {}
                new_config["credentials"] = merged_credentials
                if "config" in update_data:
                    new_config.update(update_data["config"])
                update_data["config"] = new_config
                update_data["status"] = "connected"
                update_data["status_message"] = "Successfully updated and connected"
            
            # Update integration
            updated_integration = self.repo.update(db, db_obj=integration, obj_in=update_data)
            
            logger.info(f"Integration updated successfully: {integration_id}")
            
            return {
                "success": True,
                "message": "Integration updated successfully",
                "integration": {
                    "integration_id": updated_integration.integration_id,
                    "provider": updated_integration.provider,
                    "name": updated_integration.name,
                    "status": updated_integration.status,
                    "endpoint_url": updated_integration.endpoint_url,
                    "is_active": updated_integration.is_active,
                    "updated_at": updated_integration.updated_at.isoformat()
                }
            }
            
        except Exception as e:
            logger.exception(f"Error updating integration: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to update integration: {str(e)}",
                "error_code": "UPDATE_ERROR"
            }
    
    def delete_integration(self, db: Session, integration_id: str) -> Dict[str, Any]:
        """Delete an integration with proper cleanup."""
        try:
            integration = self.repo.get_by_integration_id(db, integration_id)
            if not integration:
                return {
                    "success": False,
                    "message": f"Integration not found: {integration_id}",
                    "error_code": "NOT_FOUND"
                }
            
            # Deactivate first
            self.repo.deactivate(db, integration_id)
            
            # Delete the integration (this will cascade to related syncs)
            self.repo.delete(db, id=integration.id)
            
            logger.info(f"Integration deleted successfully: {integration_id}")
            
            return {
                "success": True,
                "message": "Integration deleted successfully"
            }
            
        except Exception as e:
            logger.exception(f"Error deleting integration: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to delete integration: {str(e)}",
                "error_code": "DELETE_ERROR"
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
        """Get data from integration with enhanced error handling."""
        try:
            # Get active integration for this provider
            integration = self.repo.get_by_provider(db, client_id, provider)
            if not integration or not integration.is_active:
                logger.warning(f"No active integration found for provider {provider} and client {client_id}")
                return []
            
            return self.get_data(integration, resource_type, query, filters)
            
        except Exception as e:
            logger.exception(f"Error getting integration data: {str(e)}")
            return []
    
    def get_data(
        self,
        integration: Integration,
        resource_type: str,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get data from an integration with comprehensive error handling."""
        try:
            # Get provider implementation
            provider = self.provider_factory.get_provider(integration.provider)
            
            # Extract credentials from config
            credentials = integration.config.get("credentials", {}) if integration.config else {}
            
            if not credentials:
                logger.error(f"No credentials found for integration {integration.integration_id}")
                return []
            
            # Fetch data
            data = provider.get_data(
                integration.endpoint_url,
                credentials,
                resource_type,
                query,
                filters,
                integration.config
            )
            
            # Update last sync time
            self.repo.update_last_sync(db=None, integration_id=integration.integration_id)
            
            return data
            
        except Exception as e:
            logger.exception(f"Error fetching data from integration {integration.integration_id}: {str(e)}")
            # Update integration status to indicate error
            try:
                self.repo.update_status(
                    db=None, 
                    integration_id=integration.integration_id, 
                    status="error", 
                    status_message=f"Data fetch error: {str(e)}"
                )
            except:
                pass  # Don't fail the main operation if status update fails
            return []