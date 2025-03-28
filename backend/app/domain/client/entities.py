# backend/app/domain/client/entities.py - Add integration relationship
from datetime import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship

from app.core.database.session import Base

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class Client(Base):
    """Client entity representing a tenant in the system."""
    
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(36), unique=True, index=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    website = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    api_key = Column(String(255), unique=True, nullable=False, default=generate_uuid)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    settings = relationship("ClientSettings", back_populates="client", uselist=False, cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="client", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="client", cascade="all, delete-orphan") 
    channels = relationship("Channel", back_populates="client", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Client {self.name}>"

class ClientSettings(Base):
    """Settings for a client."""
    
    __tablename__ = "client_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    primary_color = Column(String(20), default="#4f46e5")
    logo_url = Column(String(255), nullable=True)
    greeting_message = Column(String, nullable=True)
    enable_suggestions = Column(Boolean, default=True)
    enable_typing_indicator = Column(Boolean, default=True)
    widget_position = Column(String(50), default="bottom-right")
    fallback_email = Column(String(255), nullable=True)
    chatbot_name = Column(String(100), default="AI Assistant")
    custom_settings = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="settings")
    
    def __repr__(self):
        return f"<ClientSettings for {self.client_id}>"

class Subscription(Base):
    """Subscription model for client subscription plans."""
    
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    plan_type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    message_limit = Column(Integer, nullable=True)
    user_limit = Column(Integer, nullable=True)
    storage_limit_bytes = Column(Integer, nullable=True)  # Added missing column
    collections_limit = Column(Integer, nullable=True)
    starts_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    payment_id = Column(String(255), nullable=True)
    payment_method_id = Column(String(255), nullable=True)
    auto_renew = Column(Boolean, default=False)
    billing_cycle = Column(String(50), nullable=True)
    is_trial = Column(Boolean, default=False)
    trial_ends_at = Column(DateTime, nullable=True)
    stripe_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define relationships
    client = relationship("Client", back_populates="subscriptions")
    
    def __repr__(self):
        return f"<Subscription {self.plan_type} for {self.client_id}>"
        
    @property
    def is_active(self):
        """Check if subscription is currently active."""
        if self.status not in ["active", "trial"]:
            return False
        
        # Check if expired
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
            
        return True
    
    @property
    def days_until_expiration(self):
        """Get number of days until subscription expires."""
        if not self.expires_at:
            return None
            
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)
    
    @property
    def storage_limit_mb(self):
        """Get storage limit in megabytes."""
        if not self.storage_limit_bytes:
            return None
            
        return self.storage_limit_bytes / (1024 * 1024)