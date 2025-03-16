import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.orm import relationship

from app.core.database.session import Base

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class Integration(Base):
    """Integration entity for storing connections to external services."""
    
    __tablename__ = "integrations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    integration_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # zendesk, shopify, salesforce, etc.
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    api_endpoint = Column(String(255), nullable=True)
    api_key = Column(String(255), nullable=True)
    api_secret = Column(String(255), nullable=True)
    auth_token = Column(String(1024), nullable=True)
    auth_expiry = Column(DateTime, nullable=True)
    refresh_token = Column(String(1024), nullable=True)
    config = Column(JSON, nullable=True)
    last_sync = Column(DateTime, nullable=True)
    status = Column(String(50), default="connected")  # connected, failed, pending
    status_message = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="integrations")
    
    def __repr__(self):
        return f"<Integration {self.provider}:{self.name}>"

class IntegrationSync(Base):
    """Entity to track integration sync history and results."""
    
    __tablename__ = "integration_syncs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    integration_id = Column(String(36), ForeignKey("integrations.integration_id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(50), default="running")  # running, success, failed
    items_processed = Column(Integer, default=0)
    items_created = Column(Integer, default=0)
    items_updated = Column(Integer, default=0)
    items_failed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    sync_details = Column(JSON, nullable=True)
    
    # Relationships
    integration = relationship("Integration")
    
    def __repr__(self):
        return f"<IntegrationSync {self.sync_id}>"