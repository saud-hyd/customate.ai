# backend/app/repositories/client_repository.py
from typing import Optional, List, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime

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
    
    # New methods required by admin dashboard
    def count_total(self, db: Session) -> int:
        """Count total number of clients."""
        return db.query(func.count(self.model.id)).scalar() or 0
    
    def count_active(self, db: Session) -> int:
        """Count active clients."""
        return db.query(func.count(self.model.id)).filter(self.model.active == True).scalar() or 0
    
    def count_since(self, db: Session, since_date: datetime) -> int:
        """Count clients created since a specific date."""
        return db.query(func.count(self.model.id)).filter(self.model.created_at >= since_date).scalar() or 0
    
    def get_all_active(self, db: Session) -> List[Client]:
        """Get all active clients."""
        return db.query(self.model).filter(self.model.active == True).all()
    
    def get_all_with_filters(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Client]:
        """
        Get clients with optional filtering.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search string to filter by name, email, or client_id
            filters: Dictionary of field-value pairs to filter by
            
        Returns:
            List of clients matching criteria
        """
        query = db.query(self.model)
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (self.model.name.ilike(search_term)) |
                (self.model.email.ilike(search_term)) |
                (self.model.client_id.ilike(search_term))
            )
        
        # Apply additional filters if provided
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.filter(getattr(self.model, field) == value)
                elif field == "plan_type" and value:
                    # Special case for plan_type, which is in the Subscription model
                    query = query.join(Subscription).filter(Subscription.plan_type == value)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        return query.all()
        
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
        
        # Create a free subscription instead of trial
        sub_repo = SubscriptionRepository()
        
        # Get free plan limits
        plan_type = "free"
        storage_bytes = int(0.5 * 1024 * 1024)  # 500KB in bytes
        
        sub_repo.create(db, obj_in={
            "client_id": db_obj.client_id,
            "plan_type": plan_type,  # Changed from "trial"
            "status": "active",
            "message_limit": 100,  # New free tier limit
            "user_limit": 5,
            "storage_limit_bytes": storage_bytes,
            "starts_at": datetime.utcnow(),
            "expires_at": None,  # Free plans don't expire
            "is_trial": False
        })
        
        return db_obj


class ClientSettingsRepository(BaseRepository[ClientSettings, Dict[str, Any], Dict[str, Any]]):
    """Repository for client settings entities."""
    
    def __init__(self):
        super().__init__(ClientSettings)
    
    def get_by_client_id(self, db: Session, client_id: str) -> Optional[ClientSettings]:
        """Get client settings by client_id."""
        return db.query(self.model).filter(self.model.client_id == client_id).first()


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
        
    def count_by_plan_type(self, db: Session) -> Dict[str, int]:
        """Count subscriptions by plan type."""
        # Get counts for each plan type
        results = db.query(
            self.model.plan_type,
            func.count(self.model.id)
        ).filter(
            self.model.status.in_(["active", "trialing"])
        ).group_by(self.model.plan_type).all()
        
        # Convert to dictionary
        counts = {plan_type: count for plan_type, count in results}
        
        # Ensure all plan types have entries
        plan_types = ["free", "basic", "professional", "enterprise"]
        for plan_type in plan_types:
            if plan_type not in counts:
                counts[plan_type] = 0
        
        return counts
    
    def get_revenue_data(self, db: Session, days: int = 30) -> Dict[str, Any]:
        """
        Get estimated revenue data based on subscriptions.
        
        Args:
            db: Database session
            days: Number of days to consider
            
        Returns:
            Dictionary with revenue statistics
        """
        # Get active subscriptions
        active_subs = db.query(self.model).filter(
            self.model.status.in_(["active", "trialing"])
        ).all()
        
        # Calculate monthly recurring revenue (MRR)
        # These are example price points - adjust to match your actual pricing
        price_map = {
            "free": 0,
            "basic": 29,
            "professional": 99,
            "enterprise": 299
        }
        
        # Calculate total MRR
        mrr = sum(price_map.get(sub.plan_type, 0) for sub in active_subs)
        
        # Convert to annual
        arr = mrr * 12
        
        # Estimate monthly and daily
        monthly = mrr
        daily = mrr / 30
        
        return {
            "total_arr": arr,
            "total_mrr": mrr,
            "total_month": monthly,
            "total_day": daily,
            "active_subscriptions": len(active_subs)
        }
        
    # Add this method to backend/app/repositories/client_repository.py

# backend/app/repositories/client_repository.py
from typing import Optional, List, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime

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
    
    # New methods required by admin dashboard
    def count_total(self, db: Session) -> int:
        """Count total number of clients."""
        return db.query(func.count(self.model.id)).scalar() or 0
    
    def count_active(self, db: Session) -> int:
        """Count active clients."""
        return db.query(func.count(self.model.id)).filter(self.model.active == True).scalar() or 0
    
    def count_since(self, db: Session, since_date: datetime) -> int:
        """Count clients created since a specific date."""
        return db.query(func.count(self.model.id)).filter(self.model.created_at >= since_date).scalar() or 0
    
    def get_all_active(self, db: Session) -> List[Client]:
        """Get all active clients."""
        return db.query(self.model).filter(self.model.active == True).all()
    
    def get_all_with_filters(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Client]:
        """
        Get clients with optional filtering.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search string to filter by name, email, or client_id
            filters: Dictionary of field-value pairs to filter by
            
        Returns:
            List of clients matching criteria
        """
        query = db.query(self.model)
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (self.model.name.ilike(search_term)) |
                (self.model.email.ilike(search_term)) |
                (self.model.client_id.ilike(search_term))
            )
        
        # Apply additional filters if provided
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.filter(getattr(self.model, field) == value)
                elif field == "plan_type" and value:
                    # Special case for plan_type, which is in the Subscription model
                    query = query.join(Subscription).filter(Subscription.plan_type == value)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        return query.all()
        
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
        
        # Create a free subscription instead of trial
        sub_repo = SubscriptionRepository()
        
        # Get free plan limits
        plan_type = "free"
        storage_bytes = int(0.5 * 1024 * 1024)  # 500KB in bytes
        
        sub_repo.create(db, obj_in={
            "client_id": db_obj.client_id,
            "plan_type": plan_type,  # Changed from "trial"
            "status": "active",
            "message_limit": 100,  # New free tier limit
            "user_limit": 5,
            "storage_limit_bytes": storage_bytes,
            "starts_at": datetime.utcnow(),
            "expires_at": None,  # Free plans don't expire
            "is_trial": False
        })
        
        return db_obj


class ClientSettingsRepository(BaseRepository[ClientSettings, Dict[str, Any], Dict[str, Any]]):
    """Repository for client settings entities."""
    
    def __init__(self):
        super().__init__(ClientSettings)
    
    def get_by_client_id(self, db: Session, client_id: str) -> Optional[ClientSettings]:
        """Get client settings by client_id."""
        return db.query(self.model).filter(self.model.client_id == client_id).first()


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
        
    def count_by_plan_type(self, db: Session) -> Dict[str, int]:
        """Count subscriptions by plan type."""
        # Get counts for each plan type
        results = db.query(
            self.model.plan_type,
            func.count(self.model.id)
        ).filter(
            self.model.status.in_(["active", "trialing"])
        ).group_by(self.model.plan_type).all()
        
        # Convert to dictionary
        counts = {plan_type: count for plan_type, count in results}
        
        # Ensure all plan types have entries
        plan_types = ["free", "basic", "professional", "enterprise"]
        for plan_type in plan_types:
            if plan_type not in counts:
                counts[plan_type] = 0
        
        return counts
    
    def get_revenue_data(self, db: Session, days: int = 30) -> Dict[str, Any]:
        """
        Get estimated revenue data based on subscriptions.
        
        Args:
            db: Database session
            days: Number of days to consider
            
        Returns:
            Dictionary with revenue statistics
        """
        # Get active subscriptions
        active_subs = db.query(self.model).filter(
            self.model.status.in_(["active", "trialing"])
        ).all()
        
        # Calculate monthly recurring revenue (MRR)
        # These are example price points - adjust to match your actual pricing
        price_map = {
            "free": 0,
            "basic": 29,
            "professional": 99,
            "enterprise": 299
        }
        
        # Calculate total MRR
        mrr = sum(price_map.get(sub.plan_type, 0) for sub in active_subs)
        
        # Convert to annual
        arr = mrr * 12
        
        # Estimate monthly and daily
        monthly = mrr
        daily = mrr / 30
        
        return {
            "total_arr": arr,
            "total_mrr": mrr,
            "total_month": monthly,
            "total_day": daily,
            "active_subscriptions": len(active_subs)
        }
        
    # Add this method to backend/app/repositories/client_repository.py

    def update_api_key(self, db: Session, client_id: str, new_api_key: str) -> bool:
        """
        Update a client's API key (password).
        
        Args:
            db: Database session
            client_id: Client ID to update
            new_api_key: New API key to set
            
        Returns:
            Boolean indicating success or failure
        """
        try:
            # Find the client by client_id
            client = self.get_by_client_id(db, client_id)
            
            if not client:
                logger.error(f"No client found with ID: {client_id}")
                return False
            
            # Update the API key
            client.api_key = new_api_key
            
            # Save to database
            db.add(client)
            db.commit()
            
            logger.info(f"Successfully updated API key for client: {client_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating API key: {str(e)}")
            db.rollback()
            return False