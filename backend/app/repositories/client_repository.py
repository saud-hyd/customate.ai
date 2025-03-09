from typing import Optional, List
from sqlalchemy.orm import Session

from app.domain.client.entities import Client, ClientSettings, Subscription
from app.repositories.base_repository import BaseRepository

class ClientRepository(BaseRepository[Client, dict, dict]):
    """Repository for Client entity with client-specific operations."""
    
    def __init__(self):
        super().__init__(Client)
    
    def get_by_client_id(self, db: Session, client_id: str) -> Optional[Client]:
        """Get client by client_id UUID."""
        return db.query(Client).filter(Client.client_id == client_id).first()
    
    def get_by_email(self, db: Session, email: str) -> Optional[Client]:
        """Get client by email address."""
        return db.query(Client).filter(Client.email == email).first()
    
    def get_by_api_key(self, db: Session, api_key: str) -> Optional[Client]:
        """Get client by API key."""
        return db.query(Client).filter(Client.api_key == api_key).first()
    
    def get_active_clients(self, db: Session, skip: int = 0, limit: int = 100) -> List[Client]:
        """Get all active clients."""
        return db.query(Client).filter(Client.active == True).offset(skip).limit(limit).all()
    
    def get_clients_by_industry(self, db: Session, industry: str, skip: int = 0, limit: int = 100) -> List[Client]:
        """Get clients by industry type."""
        return db.query(Client).filter(Client.industry == industry).offset(skip).limit(limit).all()

class ClientSettingsRepository(BaseRepository[ClientSettings, dict, dict]):
    """Repository for ClientSettings entity."""
    
    def __init__(self):
        super().__init__(ClientSettings)
    
    def get_by_client_id(self, db: Session, client_id: str) -> Optional[ClientSettings]:
        """Get settings for a specific client."""
        return db.query(ClientSettings).filter(ClientSettings.client_id == client_id).first()

class SubscriptionRepository(BaseRepository[Subscription, dict, dict]):
    """Repository for Subscription entity."""
    
    def __init__(self):
        super().__init__(Subscription)
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[Subscription]:
        """Get all subscriptions for a specific client."""
        return db.query(Subscription).filter(Subscription.client_id == client_id).all()
    
    def get_active_subscription(self, db: Session, client_id: str) -> Optional[Subscription]:
        """Get current active subscription for a client."""
        return db.query(Subscription).filter(
            Subscription.client_id == client_id,
            Subscription.status == "active"
        ).first()