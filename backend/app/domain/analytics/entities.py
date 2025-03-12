# backend/app/domain/analytics/entities.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship

from app.core.database.session import Base

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class ApiUsageLog(Base):
    """Entity for tracking API endpoint usage."""
    
    __tablename__ = "api_usage_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    log_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)  # GET, POST, etc.
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    
    def __repr__(self):
        return f"<ApiUsageLog {self.endpoint} - {self.status_code}>"

class ChatMetrics(Base):
    """Entity for tracking chat interaction metrics."""
    
    __tablename__ = "chat_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(36), ForeignKey("chat_sessions.session_id", ondelete="CASCADE"), nullable=True)
    total_messages = Column(Integer, default=0)
    average_response_time_ms = Column(Float, nullable=True)
    knowledge_usage_count = Column(Integer, default=0)
    user_satisfaction = Column(Float, nullable=True)  # Optional feedback score (1-5)
    timestamp = Column(DateTime, default=datetime.utcnow)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD format for easy grouping
    
    def __repr__(self):
        return f"<ChatMetrics {self.client_id} - {self.date}>"

class KnowledgeMetrics(Base):
    """Entity for tracking knowledge base usage metrics."""
    
    __tablename__ = "knowledge_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    collection_id = Column(String(36), ForeignKey("knowledge_collections.collection_id", ondelete="CASCADE"), nullable=True)
    search_count = Column(Integer, default=0)
    average_relevance_score = Column(Float, nullable=True)
    items_count = Column(Integer, default=0)
    document_count = Column(Integer, default=0)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD format for easy grouping
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<KnowledgeMetrics {self.client_id} - {self.date}>"

class SubscriptionUsage(Base):
    """Entity for tracking subscription usage and limits."""
    
    __tablename__ = "subscription_usage"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    usage_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)  # Changed to Integer
    month_year = Column(String(7), nullable=False)  # YYYY-MM format
    messages_used = Column(Integer, default=0)
    messages_limit = Column(Integer, nullable=True)
    active_users = Column(Integer, default=0)
    active_users_limit = Column(Integer, nullable=True)
    storage_used_bytes = Column(Integer, default=0)
    storage_limit_bytes = Column(Integer, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<SubscriptionUsage {self.client_id} - {self.month_year}>"
    
class DailyStats(Base):
    """Entity for tracking daily aggregate statistics."""
    
    __tablename__ = "daily_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    stat_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    total_sessions = Column(Integer, default=0)
    total_messages = Column(Integer, default=0)
    total_searches = Column(Integer, default=0)
    total_users = Column(Integer, default=0)
    average_response_time_ms = Column(Float, nullable=True)
    knowledge_usage_ratio = Column(Float, nullable=True)  # percentage of responses using knowledge
    stats_metadata = Column(JSON, nullable=True)  # Changed from 'metadata' to 'stats_metadata'
    
    def __repr__(self):
        return f"<DailyStats {self.client_id} - {self.date}>"