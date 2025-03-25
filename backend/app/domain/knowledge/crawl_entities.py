import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, JSON, Boolean
from sqlalchemy.orm import relationship

from app.core.database.session import Base

class WebsiteCrawlJob(Base):
    """Entity for tracking website crawling jobs."""
    
    __tablename__ = "website_crawl_jobs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    collection_id = Column(String(36), ForeignKey("knowledge_collections.collection_id", ondelete="CASCADE"), nullable=True)
    
    # Website configuration
    base_url = Column(String(255), nullable=False)
    max_pages = Column(Integer, default=100)
    max_depth = Column(Integer, default=3)
    
    # Additional configuration
    include_patterns = Column(JSON, nullable=True)  # URL patterns to include
    exclude_patterns = Column(JSON, nullable=True)  # URL patterns to exclude
    extraction_rules = Column(JSON, nullable=True)  # CSS selectors for content extraction
    
    # Status tracking
    status = Column(String(50), nullable=False)  # pending, in_progress, completed, failed
    pages_crawled = Column(Integer, default=0)
    pages_processed = Column(Integer, default=0)
    pages_failed = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Error logging
    error_message = Column(Text, nullable=True)
    
    # Relationships
    client = relationship("Client", backref="crawl_jobs")
    collection = relationship("KnowledgeCollection", backref="crawl_jobs")
    
    def __repr__(self):
        return f"<WebsiteCrawlJob {self.job_id} ({self.status})>"

class CrawledPage(Base):
    """Entity for tracking individual pages crawled from a website."""
    
    __tablename__ = "crawled_pages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    page_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("website_crawl_jobs.job_id", ondelete="CASCADE"), nullable=False)
    url = Column(String(512), nullable=False)
    title = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False)  # success, failed, skipped
    content_hash = Column(String(64), nullable=True)  # For deduplication
    depth = Column(Integer, default=0)
    crawled_at = Column(DateTime, default=datetime.utcnow)
    knowledge_item_id = Column(String(36), nullable=True)  # Reference to created knowledge item
    
    # Relationships
    job = relationship("WebsiteCrawlJob", backref="pages")
    
    def __repr__(self):
        return f"<CrawledPage {self.url}>"