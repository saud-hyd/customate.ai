import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.orm import relationship

from app.core.database.session import Base

class Notification(Base):
    """Notification entity representing a message sent to a client."""
    
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    notification_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # limit_warning, subscription_update, system_notification, etc.
    notification_metadata = Column(JSON, nullable=True)  # Changed from 'metadata' to 'notification_metadata'
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", backref="notifications")
    
    def __repr__(self):
        return f"<Notification {self.notification_id}>"


class NotificationPreference(Base):
    """Notification preferences for a client."""
    
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    preference_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    
    # Email notification preferences
    email_limit_warnings = Column(Boolean, default=True)
    email_subscription_updates = Column(Boolean, default=True)
    email_system_updates = Column(Boolean, default=True)
    
    # In-app notification preferences
    inapp_limit_warnings = Column(Boolean, default=True)
    inapp_subscription_updates = Column(Boolean, default=True)
    inapp_system_updates = Column(Boolean, default=True)
    
    # Push notification preferences (for future use)
    push_limit_warnings = Column(Boolean, default=False)
    push_subscription_updates = Column(Boolean, default=False)
    push_system_updates = Column(Boolean, default=False)
    
    # Notification thresholds
    limit_warning_threshold = Column(Integer, default=80)  # Percentage at which to warn
    
    # Contact information
    custom_email = Column(String(255), nullable=True)  # If different from account email
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", backref="notification_preferences")
    
    def __repr__(self):
        return f"<NotificationPreference {self.preference_id}>"