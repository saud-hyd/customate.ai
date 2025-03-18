from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, update

from app.domain.notification.entities import Notification, NotificationPreference
from app.repositories.base_repository import BaseRepository

class NotificationRepository(BaseRepository[Notification, Dict[str, Any], Dict[str, Any]]):
    """Repository for notification entities."""
    
    def __init__(self):
        super().__init__(Notification)
    
    def get_by_notification_id(self, db: Session, notification_id: str) -> Optional[Notification]:
        """Get notification by notification_id."""
        return db.query(self.model).filter(self.model.notification_id == notification_id).first()
    
    def get_by_client_id(
        self, 
        db: Session, 
        client_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications for a client with pagination."""
        return db.query(self.model)\
            .filter(self.model.client_id == client_id)\
            .order_by(desc(self.model.created_at))\
            .offset(offset)\
            .limit(limit)\
            .all()
    
    def get_unread_by_client_id(
        self, 
        db: Session, 
        client_id: str,
        limit: int = 10
    ) -> List[Notification]:
        """Get unread notifications for a client."""
        return db.query(self.model)\
            .filter(self.model.client_id == client_id, self.model.read == False)\
            .order_by(desc(self.model.created_at))\
            .limit(limit)\
            .all()
    
    def get_by_type(
        self, 
        db: Session, 
        client_id: str,
        notification_type: str,
        limit: int = 10
    ) -> List[Notification]:
        """Get notifications of a specific type for a client."""
        return db.query(self.model)\
            .filter(self.model.client_id == client_id, self.model.type == notification_type)\
            .order_by(desc(self.model.created_at))\
            .limit(limit)\
            .all()
    
    def mark_as_read(self, db: Session, notification_id: int) -> Optional[Notification]:
        """Mark a notification as read."""
        notification = self.get(db, id=notification_id)
        if notification:
            notification.read = True
            db.add(notification)
            db.commit()
            db.refresh(notification)
        return notification
    
    def mark_all_as_read(self, db: Session, client_id: str) -> int:
        """Mark all notifications for a client as read.
        
        Returns:
            int: Number of notifications marked as read
        """
        result = db.execute(
            update(self.model)
            .where(self.model.client_id == client_id, self.model.read == False)
            .values(read=True)
        )
        db.commit()
        return result.rowcount
    
    def create_bulk(
        self, 
        db: Session, 
        notifications: List[Dict[str, Any]]
    ) -> List[Notification]:
        """Create multiple notifications in bulk."""
        db_objs = [self.model(**obj_data) for obj_data in notifications]
        db.add_all(db_objs)
        db.commit()
        for obj in db_objs:
            db.refresh(obj)
        return db_objs


class NotificationPreferenceRepository(BaseRepository[NotificationPreference, Dict[str, Any], Dict[str, Any]]):
    """Repository for notification preference entities."""
    
    def __init__(self):
        super().__init__(NotificationPreference)
    
    def get_by_client_id(self, db: Session, client_id: str) -> Optional[NotificationPreference]:
        """Get notification preferences for a client."""
        return db.query(self.model).filter(self.model.client_id == client_id).first()
    
    def get_or_create(self, db: Session, client_id: str) -> NotificationPreference:
        """Get or create notification preferences for a client."""
        preferences = self.get_by_client_id(db, client_id)
        if preferences:
            return preferences
        
        # Create default preferences
        preferences = self.create(db, obj_in={
            "client_id": client_id,
            "email_limit_warnings": True,
            "email_subscription_updates": True,
            "email_system_updates": True,
            "inapp_limit_warnings": True,
            "inapp_subscription_updates": True,
            "inapp_system_updates": True,
            "limit_warning_threshold": 80
        })
        
        return preferences
    
    def should_notify(
        self, 
        db: Session, 
        client_id: str, 
        notification_type: str, 
        channel: str = "inapp"
    ) -> bool:
        """Check if a client should be notified for a specific type and channel."""
        preferences = self.get_or_create(db, client_id)
        
        # Determine preference field based on type and channel
        field_name = f"{channel}_{notification_type}"
        
        # Default to True if field doesn't exist
        if not hasattr(preferences, field_name):
            return True
        
        return getattr(preferences, field_name)