# backend/app/api/integration/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.integration.integration_service import IntegrationService

router = APIRouter(prefix="/integration", tags=["integration"])

@router.get("/providers", response_model=List[Dict[str, Any]])
async def get_available_integrations(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get list of available integration providers."""
    service = IntegrationService()
    return service.get_available_integrations()

@router.get("", response_model=List[Dict[str, Any]])
async def get_client_integrations(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all integrations for the current client."""
    service = IntegrationService()
    return service.get_client_integrations(db, current_client.client_id)

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_integration(
    data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Create a new integration for the current client."""
    service = IntegrationService()
    
    # Validate required fields
    if "provider" not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider is required"
        )
    
    if "name" not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required"
        )
    
    try:
        return service.create_integration(
            db=db,
            client_id=current_client.client_id,
            provider=data["provider"],
            name=data["name"],
            api_endpoint=data.get("api_endpoint"),
            api_key=data.get("api_key"),
            api_secret=data.get("api_secret"),
            config=data.get("config")
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create integration: {str(e)}"
        )

@router.put("/{integration_id}", response_model=Dict[str, Any])
async def update_integration(
    integration_id: str,
    data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Update an existing integration."""
    service = IntegrationService()
    
    try:
        return service.update_integration(db, integration_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update integration: {str(e)}"
        )

@router.delete("/{integration_id}", response_model=Dict[str, Any])
async def delete_integration(
    integration_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Delete an integration."""
    service = IntegrationService()
    
    try:
        result = service.delete_integration(db, integration_id)
        return {"success": result, "integration_id": integration_id}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete integration: {str(e)}"
        )

@router.post("/{integration_id}/test", response_model=Dict[str, Any])
async def test_integration_connection(
    integration_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Test connection to an integration provider."""
    service = IntegrationService()
    
    try:
        return service.test_connection(db, integration_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test integration: {str(e)}"
        )

@router.post("/{integration_id}/sync", response_model=Dict[str, Any])
async def sync_integration_data(
    integration_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Sync data from an integration provider."""
    service = IntegrationService()
    
    try:
        return service.start_sync(db, integration_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync integration: {str(e)}"
        )

@router.post("/{integration_id}/disconnect", response_model=Dict[str, Any])
async def disconnect_integration(
    integration_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Disconnect an integration."""
    service = IntegrationService()
    
    try:
        return service.disconnect_integration(db, integration_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect integration: {str(e)}"
        )

@router.get("/data/{provider}/{resource_type}", response_model=List[Dict[str, Any]])
async def get_integration_data(
    provider: str,
    resource_type: str,
    query: Optional[str] = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get data from an integration provider."""
    service = IntegrationService()
    
    try:
        return service.get_integration_data(
            db=db,
            client_id=current_client.client_id,
            provider=provider,
            resource_type=resource_type,
            query=query
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get integration data: {str(e)}"
        )