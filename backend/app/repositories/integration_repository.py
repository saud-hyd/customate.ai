# backend/app/repositories/integration_repository.py
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.repositories.base_repository import BaseRepository
from app.domain.integration.entities import Integration, IntegrationSync

class IntegrationRepository(BaseRepository[Integration, Dict[str, Any], Dict[str, Any]]):
    """Repository for managing integration entities."""
    
    def __init__(self):
        super().__init__(Integration)
    
    def get_by_integration_id(self, db: Session, integration_id: str) -> Optional[Integration]:
        """Get integration by integration_id."""
        return db.query(self.model).filter(self.model.integration_id == integration_id).first()
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[Integration]:
        """Get all integrations for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id
        ).order_by(desc(self.model.created_at)).all()
    
    def get_active_by_client_id(self, db: Session, client_id: str) -> List[Integration]:
        """Get active integrations for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.is_active == True
        ).order_by(desc(self.model.created_at)).all()
    
    def get_by_provider(self, db: Session, client_id: str, provider: str) -> Optional[Integration]:
        """Get integration by provider for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.provider == provider
        ).first()
    
    def update_status(
        self, 
        db: Session, 
        integration_id: str, 
        status: str, 
        status_message: Optional[str] = None
    ) -> Optional[Integration]:
        """Update integration status."""
        integration = self.get_by_integration_id(db, integration_id)
        if integration:
            integration.status = status
            if status_message:
                integration.status_message = status_message
            integration.updated_at = datetime.utcnow()
            db.add(integration)
            db.commit()
            db.refresh(integration)
        return integration
    
    def update_last_sync(self, db: Session, integration_id: str) -> Optional[Integration]:
        """Update integration last sync time to now."""
        integration = self.get_by_integration_id(db, integration_id)
        if integration:
            integration.last_sync = datetime.utcnow()
            integration.updated_at = datetime.utcnow()
            db.add(integration)
            db.commit()
            db.refresh(integration)
        return integration
    
    def deactivate(self, db: Session, integration_id: str) -> Optional[Integration]:
        """Deactivate an integration."""
        integration = self.get_by_integration_id(db, integration_id)
        if integration:
            integration.is_active = False
            integration.status = "disconnected"
            integration.updated_at = datetime.utcnow()
            db.add(integration)
            db.commit()
            db.refresh(integration)
        return integration

class IntegrationSyncRepository(BaseRepository[IntegrationSync, Dict[str, Any], Dict[str, Any]]):
    """Repository for managing integration sync entities."""
    
    def __init__(self):
        super().__init__(IntegrationSync)
    
    def get_by_sync_id(self, db: Session, sync_id: str) -> Optional[IntegrationSync]:
        """Get sync by sync_id."""
        return db.query(self.model).filter(self.model.sync_id == sync_id).first()
    
    def get_by_integration_id(self, db: Session, integration_id: str, limit: int = 10) -> List[IntegrationSync]:
        """Get syncs for an integration."""
        return db.query(self.model).filter(
            self.model.integration_id == integration_id
        ).order_by(desc(self.model.start_time)).limit(limit).all()
    
    def get_latest_by_integration_id(self, db: Session, integration_id: str) -> Optional[IntegrationSync]:
        """Get latest sync for an integration."""
        return db.query(self.model).filter(
            self.model.integration_id == integration_id
        ).order_by(desc(self.model.start_time)).first()
    
    def complete_sync(
        self, 
        db: Session, 
        sync_id: str, 
        status: str, 
        items_processed: int,
        items_created: int,
        items_updated: int,
        items_failed: int,
        error_message: Optional[str] = None,
        sync_details: Optional[Dict[str, Any]] = None
    ) -> Optional[IntegrationSync]:
        """Complete a sync process with results."""
        sync = self.get_by_sync_id(db, sync_id)
        if sync:
            sync.end_time = datetime.utcnow()
            sync.status = status
            sync.items_processed = items_processed
            sync.items_created = items_created
            sync.items_updated = items_updated
            sync.items_failed = items_failed
            if error_message:
                sync.error_message = error_message
            if sync_details:
                sync.sync_details = sync_details
            db.add(sync)
            db.commit()
            db.refresh(sync)
        return sync