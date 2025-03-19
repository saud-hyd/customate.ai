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
    
def create(self, db: Session, *, obj_in: Dict[str, Any]) -> Subscription:
    """Create a new subscription."""
    # Check if there's an active subscription already
    active_sub = self.get_active_subscription(db, obj_in["client_id"])
    
    # If creating a new active subscription, deactivate the current one
    if active_sub and obj_in.get("status") == "active":
        active_sub.status = "inactive"
        db.add(active_sub)
        db.commit()
    
    # Add storage limits based on plan type
    plan_type = obj_in.get("plan_type", "free")
    if "storage_limit_bytes" not in obj_in:
        if plan_type == "free":
            obj_in["storage_limit_bytes"] = 52428800  # 50 MB
        elif plan_type == "basic":
            obj_in["storage_limit_bytes"] = 524288000  # 500 MB
        elif plan_type == "professional":
            obj_in["storage_limit_bytes"] = 2147483648  # 2 GB
        elif plan_type == "enterprise":
            obj_in["storage_limit_bytes"] = 10737418240  # 10 GB
        else:
            obj_in["storage_limit_bytes"] = 52428800  # Default 50 MB
    
    # Create the new subscription
    db_obj = self.model(**obj_in)
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
            self.model.status.in_(["active", "trial", "past_due"]),
            (self.model.expires_at > datetime.utcnow()) | (self.model.expires_at == None)
        ).first()
    
    def get_by_payment_id(self, db: Session, payment_id: str) -> Optional[Subscription]:
        """Get subscription by payment ID (Stripe subscription ID)."""
        return db.query(self.model).filter(self.model.payment_id == payment_id).first()
    
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
        
    def get_trial_eligible(self, db: Session, client_id: str) -> bool:
        """Check if a client is eligible for a trial subscription."""
        # Check if client has had a trial subscription before
        had_trial = db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.is_trial == True
        ).first() is not None
        
        return not had_trial
    
    def get_expiring_subscriptions(self, db: Session, days_threshold: int = 3) -> List[Subscription]:
        """Get subscriptions that are expiring within a certain number of days."""
        from datetime import datetime, timedelta
        
        expiry_threshold = datetime.utcnow() + timedelta(days=days_threshold)
        
        return db.query(self.model).filter(
            self.model.status.in_(["active", "trial"]),
            self.model.expires_at <= expiry_threshold,
            self.model.expires_at > datetime.utcnow(),
            self.model.auto_renew == False
        ).all()