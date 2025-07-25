# backend/app/api/integration/routes.py
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database.dependencies import get_db  # FIXED: Use correct import
from app.api.auth.dependencies import get_current_client
from app.services.integration.integration_service import IntegrationService
from app.domain.client.entities import Client  # FIXED: Import Client type
from app.core import logger
import time

router = APIRouter()

# Pydantic models for request/response
class IntegrationTestRequest(BaseModel):
    provider: str = Field(..., description="Integration provider type")
    credentials: Dict[str, Any] = Field(..., description="Authentication credentials")
    config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")

class IntegrationCreateRequest(BaseModel):
    provider: str = Field(..., description="Integration provider type")
    name: str = Field(..., description="Integration name")
    credentials: Dict[str, Any] = Field(..., description="Authentication credentials")
    config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")

class IntegrationUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="Integration name")
    credentials: Optional[Dict[str, Any]] = Field(None, description="Authentication credentials")
    config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")

class IntegrationSyncRequest(BaseModel):
    resource_types: Optional[List[str]] = Field(None, description="Specific resource types to sync")
    full_sync: bool = Field(False, description="Whether to perform full sync")

@router.get("/integrations/available")
async def get_available_integrations(
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get list of available integration providers.
    
    Returns:
        List of available integration providers with setup information
    """
    try:
        service = IntegrationService()
        providers = service.get_available_integrations()
        
        logger.info(f"Retrieved {len(providers)} available integration providers")
        return providers
        
    except Exception as e:
        logger.exception(f"Error getting available integrations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve available integrations"
        )

@router.get("/integrations")
async def get_client_integrations(
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get all integrations for the current client.
    
    Returns:
        List of client integrations with status and sync information
    """
    try:
        service = IntegrationService()
        integrations = service.get_client_integrations(db, client.client_id)  # FIXED: Extract client_id
        
        logger.info(f"Retrieved {len(integrations)} integrations for client {client.client_id}")
        return integrations
        
    except Exception as e:
        logger.exception(f"Error getting client integrations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve integrations"
        )

@router.post("/integrations/test")
async def test_integration_connection(
    request: IntegrationTestRequest,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Test connection to an integration provider.
    
    Args:
        request: Integration test request with provider and credentials
        
    Returns:
        Connection test results
    """
    try:
        service = IntegrationService()
        result = service.test_integration_connection(
            db=db,
            client_id=client.client_id,  # FIXED: Extract client_id
            provider=request.provider,
            credentials=request.credentials,
            config=request.config
        )
        
        logger.info(f"Integration test for {request.provider} - Client {client.client_id}: {result['success']}")
        return result
        
    except Exception as e:
        logger.exception(f"Error testing integration connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}"
        )

@router.post("/integrations")
async def create_integration(
    request: IntegrationCreateRequest,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new integration.
    
    Args:
        request: Integration creation request
        
    Returns:
        Created integration details
    """
    try:
        service = IntegrationService()
        result = service.create_integration(
            db=db,
            client_id=client.client_id,  # FIXED: Extract client_id
            provider=request.provider,
            name=request.name,
            credentials=request.credentials,
            config=request.config
        )
        
        if result.get("success"):
            logger.info(f"Integration created successfully for client {client.client_id}: {request.provider}")
        else:
            logger.warning(f"Integration creation failed for client {client.client_id}: {result.get('message')}")
        
        return result
        
    except Exception as e:
        logger.exception(f"Error creating integration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create integration: {str(e)}"
        )

@router.get("/integrations/{integration_id}")
async def get_integration(
    integration_id: str,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a specific integration by ID.
    
    Args:
        integration_id: Integration ID
        
    Returns:
        Integration details
    """
    try:
        from app.repositories.integration_repository import IntegrationRepository
        
        repo = IntegrationRepository()
        integration = repo.get_by_integration_id(db, integration_id)
        
        if not integration or integration.client_id != client.client_id:  # FIXED: Extract client_id
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        return {
            "integration_id": integration.integration_id,
            "provider": integration.provider,
            "name": integration.name,
            "status": integration.status,
            "status_message": integration.status_message,
            "is_active": integration.is_active,
            "created_at": integration.created_at.isoformat(),
            "last_sync": integration.last_sync.isoformat() if integration.last_sync else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting integration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve integration: {str(e)}"
        )

@router.put("/integrations/{integration_id}")
async def update_integration(
    integration_id: str,
    request: IntegrationUpdateRequest,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update an existing integration.
    
    Args:
        integration_id: Integration ID
        request: Integration update request
        
    Returns:
        Updated integration details
    """
    try:
        service = IntegrationService()
        
        # Verify ownership
        from app.repositories.integration_repository import IntegrationRepository
        repo = IntegrationRepository()
        integration = repo.get_by_integration_id(db, integration_id)
        
        if not integration or integration.client_id != client.client_id:  # FIXED: Extract client_id
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        # Update integration
        update_data = request.dict(exclude_unset=True)
        result = service.update_integration(db, integration_id, update_data)
        
        logger.info(f"Integration updated: {integration_id} for client {client.client_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating integration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update integration: {str(e)}"
        )

@router.delete("/integrations/{integration_id}")
async def delete_integration(
    integration_id: str,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete an integration.
    
    Args:
        integration_id: Integration ID
        
    Returns:
        Deletion confirmation
    """
    try:
        service = IntegrationService()
        
        # Verify ownership
        from app.repositories.integration_repository import IntegrationRepository
        repo = IntegrationRepository()
        integration = repo.get_by_integration_id(db, integration_id)
        
        if not integration or integration.client_id != client.client_id:  # FIXED: Extract client_id
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        # Delete integration
        result = service.delete_integration(db, integration_id)
        
        logger.info(f"Integration deleted: {integration_id} for client {client.client_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting integration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete integration: {str(e)}"
        )

@router.post("/integrations/{integration_id}/test")
async def test_existing_integration(
    integration_id: str,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Test connection for an existing integration.
    
    Args:
        integration_id: Integration ID
        
    Returns:
        Connection test results
    """
    try:
        service = IntegrationService()
        
        # Get the integration first
        integrations = service.get_client_integrations(db, client.client_id)  # FIXED: Extract client_id
        integration = next(
            (i for i in integrations if i["integration_id"] == integration_id), 
            None
        )
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        # Get the integration entity for testing
        from app.repositories.integration_repository import IntegrationRepository
        repo = IntegrationRepository()
        integration_entity = repo.get_by_integration_id(db, integration_id)
        
        if not integration_entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        # Extract credentials from config
        credentials = integration_entity.config.get("credentials", {}) if integration_entity.config else {}
        
        result = service.test_integration_connection(
            db=db,
            client_id=client.client_id,  # FIXED: Extract client_id
            provider=integration_entity.provider,
            credentials=credentials,
            config=integration_entity.config
        )
        
        logger.info(f"Integration test for existing integration {integration_id}: {result['success']}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error testing existing integration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}"
        )

@router.post("/integrations/{integration_id}/sync")
async def sync_integration(
    integration_id: str,
    request: IntegrationSyncRequest = None,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Start data synchronization for an integration.
    
    Args:
        integration_id: Integration ID
        request: Sync configuration (optional)
        
    Returns:
        Sync status and details
    """
    try:
        # Note: This is a placeholder for sync functionality
        # In a real implementation, you would:
        # 1. Start background sync job
        # 2. Create sync record in database
        # 3. Return job status
        
        logger.info(f"Sync requested for integration {integration_id}")
        
        # For now, return a success response
        return {
            "success": True,
            "message": "Sync started successfully",
            "sync_id": f"sync_{integration_id}_{int(time.time())}",
            "status": "in_progress"
        }
        
    except Exception as e:
        logger.exception(f"Error starting sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start sync: {str(e)}"
        )

@router.get("/integrations/{integration_id}/data/{resource_type}")
async def get_integration_data(
    integration_id: str,
    resource_type: str,
    query: Optional[str] = None,
    limit: Optional[int] = 50,
    client: Client = Depends(get_current_client),  # FIXED: Use Client object
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get data from an integration.
    
    Args:
        integration_id: Integration ID
        resource_type: Type of resource to fetch
        query: Search query (optional)
        limit: Maximum number of items to return
        
    Returns:
        Integration data
    """
    try:
        from app.repositories.integration_repository import IntegrationRepository
        
        repo = IntegrationRepository()
        integration = repo.get_by_integration_id(db, integration_id)
        
        if not integration or integration.client_id != client.client_id:  # FIXED: Extract client_id
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        service = IntegrationService()
        filters = {"limit": min(limit, 100)} if limit else {"limit": 50}
        
        data = service.get_data(
            integration=integration,
            resource_type=resource_type,
            query=query,
            filters=filters
        )
        
        return {
            "success": True,
            "data": data,
            "resource_type": resource_type,
            "count": len(data),
            "query": query
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting integration data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve data: {str(e)}"
        )