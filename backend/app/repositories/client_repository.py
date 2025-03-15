from typing import Optional, List, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.domain.client.entities import Client, ClientSettings, Subscription
from app.repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)

class ClientRepository(BaseRepository[Client, Dict[str, Any], Dict[str, Any]]):
    """Repository for client entities."""
    
    def __init__(self):
        super().__init__(Client)
    
    def get_by_client_id(self, db: Session, client_id: str) -> Optional[Client]:
        """Get client by client_id."""
        return db.query(self.model).filter(self.model.client_id == client_id).first()
    
    def get_by_email(self, db: Session, email: str) -> Optional[Client]:
        """Get client by email."""
        logger.debug(f"Looking up client by email: {email}")
        return db.query(self.model).filter(self.model.email == email).first()
    
    def get_by_api_key(self, db: Session, api_key: str) -> Optional[Client]:
        """Get client by API key."""
        logger.debug(f"Looking up client by API key: {api_key[:8]}...")
        return db.query(self.model).filter(self.model.api_key == api_key).first()
        
    def create(self, db: Session, *, obj_in: Dict[str, Any]) -> Client:
        """Create a new client."""
        # Make sure we're not accidentally creating a duplicate
        existing = self.get_by_email(db, obj_in["email"])
        if existing:
            logger.warning(f"Attempted to create duplicate client with email: {obj_in['email']}")
            return existing
            
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Create default settings for this client
        settings_repo = ClientSettingsRepository()
        settings_repo.create(db, obj_in={"client_id": db_obj.client_id})
        
        # Create a default trial subscription
        sub_repo = SubscriptionRepository()
        from datetime import datetime, timedelta
        
        sub_repo.create(db, obj_in={
            "client_id": db_obj.client_id,
            "plan_type": "trial",
            "status": "active",
            "message_limit": 1000,
            "user_limit": 10,
            "starts_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=30)
        })
        
        return db_obj


class ClientSettingsRepository(BaseRepository[ClientSettings, Dict[str, Any], Dict[str, Any]]):
    """Repository for client settings entities."""
    
    def __init__(self):
        super().__init__(ClientSettings)
    
    def get_by_client_id(self, db: Session, client_id: str) -> Optional[ClientSettings]:
        """Get client settings by client_id."""
        return db.query(self.model).filter(self.model.client_id == client_id).first()
    
    def create(self, db: Session, *, obj_in: Dict[str, Any]) -> ClientSettings:
        """Create client settings."""
        # Check if settings already exist
        existing = self.get_by_client_id(db, obj_in["client_id"])
        if existing:
            return existing
            
        # Create new settings with defaults
        settings_data = {
            "client_id": obj_in["client_id"],
            "primary_color": obj_in.get("primary_color", "#4f46e5"),
            "logo_url": obj_in.get("logo_url"),
            "greeting_message": obj_in.get("greeting_message", "Hello! How can I help you today?"),
            "enable_suggestions": obj_in.get("enable_suggestions", True),
            "enable_typing_indicator": obj_in.get("enable_typing_indicator", True),
            "widget_position": obj_in.get("widget_position", "bottom-right"),
            "fallback_email": obj_in.get("fallback_email"),
            "chatbot_name": obj_in.get("chatbot_name", "AI Assistant"),
            "custom_settings": obj_in.get("custom_settings", {})
        }
        
        db_obj = self.model(**settings_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class SubscriptionRepository(BaseRepository[Subscription, Dict[str, Any], Dict[str, Any]]):
    """Repository for subscription entities."""
    
    def __init__(self):
        super().__init__(Subscription)
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[Subscription]:
        """Get all subscriptions for a client."""
        return db.query(self.model).filter(self.model.client_id == client_id).all()
    
    def get_active_subscription(self, db: Session, client_id: str) -> Optional[Subscription]:
        """Get the active subscription for a client."""
        from datetime import datetime
        
        # Get the active subscription that hasn't expired
        return db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.status == "active",
            (self.model.expires_at > datetime.utcnow()) | (self.model.expires_at == None)
        ).first()
    
    def create(self, db: Session, *, obj_in: Dict[str, Any]) -> Subscription:
        """Create a new subscription."""
        # Check if there's an active subscription already
        active_sub = self.get_active_subscription(db, obj_in["client_id"])
        
        # If creating a new active subscription, deactivate the current one
        if active_sub and obj_in.get("status") == "active":
            active_sub.status = "inactive"
            db.add(active_sub)
            db.commit()
            
        # Create the new subscription
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj