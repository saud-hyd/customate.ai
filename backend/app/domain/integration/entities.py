# backend/app/domain/integration/entities.py
from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON, Boolean, Text
from sqlalchemy.orm import relationship

from app.core.database.session import Base

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class Integration(Base):
    """Integration entity representing a connection to an external service."""
    
    __tablename__ = "integrations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    integration_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # e.g., zendesk, shopify, salesforce
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)  # configured, connected, error, disconnected
    status_message = Column(Text, nullable=True)
    credentials = Column(JSON, nullable=True)  # Store credentials securely
    endpoint_url = Column(String(255), nullable=True)
    config = Column(JSON, nullable=True)  # Additional configuration settings
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="integrations")
    syncs = relationship("IntegrationSync", back_populates="integration", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Integration {self.name} ({self.provider})>"

class IntegrationSync(Base):
    """Entity for tracking integration data synchronization."""
    
    __tablename__ = "integration_syncs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    integration_id = Column(String(36), ForeignKey("integrations.integration_id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False)  # in_progress, completed, failed
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    items_processed = Column(Integer, default=0)
    items_created = Column(Integer, default=0)
    items_updated = Column(Integer, default=0)
    items_failed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    sync_details = Column(JSON, nullable=True)  # Additional sync details
    
    # Relationships
    integration = relationship("Integration", back_populates="syncs")
    
    def __repr__(self):
        return f"<IntegrationSync {self.sync_id} ({self.status})>"