from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.repositories.base_repository import BaseRepository
from app.domain.knowledge.crawl_entities import WebsiteCrawlJob, CrawledPage

class WebsiteCrawlJobRepository(BaseRepository[WebsiteCrawlJob, dict, dict]):
    """Repository for website crawl job entities."""
    
    def __init__(self):
        super().__init__(WebsiteCrawlJob)
    
    def get_by_job_id(self, db: Session, job_id: str) -> Optional[WebsiteCrawlJob]:
        """Get crawl job by job_id."""
        return db.query(self.model).filter(self.model.job_id == job_id).first()
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[WebsiteCrawlJob]:
        """Get all crawl jobs for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id
        ).order_by(desc(self.model.created_at)).all()
    
    def get_active_jobs(self, db: Session, limit: int = 10) -> List[WebsiteCrawlJob]:
        """Get all active (pending, in_progress) jobs."""
        return db.query(self.model).filter(
            self.model.status.in_(["pending", "in_progress"])
        ).order_by(self.model.created_at).limit(limit).all()
    
    def update_job_status(
        self, 
        db: Session, 
        job_id: str, 
        status: str,
        update_data: Dict[str, Any] = None
    ) -> Optional[WebsiteCrawlJob]:
        """Update job status and other fields."""
        job = self.get_by_job_id(db, job_id)
        if not job:
            return None
        
        # Update status
        job.status = status
        
        # Update additional fields if provided
        if update_data:
            for key, value in update_data.items():
                if hasattr(job, key):
                    setattr(job, key, value)
        
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    
    def increment_counter(
        self, 
        db: Session, 
        job_id: str, 
        counter_name: str
    ) -> Optional[WebsiteCrawlJob]:
        """Increment a counter field (pages_crawled, pages_processed, pages_failed)."""
        job = self.get_by_job_id(db, job_id)
        if not job or not hasattr(job, counter_name):
            return None
        
        current_value = getattr(job, counter_name, 0) or 0
        setattr(job, counter_name, current_value + 1)
        
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

class CrawledPageRepository(BaseRepository[CrawledPage, dict, dict]):
    """Repository for crawled page entities."""
    
    def __init__(self):
        super().__init__(CrawledPage)
    
    def get_by_page_id(self, db: Session, page_id: str) -> Optional[CrawledPage]:
        """Get crawled page by page_id."""
        return db.query(self.model).filter(self.model.page_id == page_id).first()
    
    def get_by_job_id(self, db: Session, job_id: str) -> List[CrawledPage]:
        """Get all crawled pages for a job."""
        return db.query(self.model).filter(self.model.job_id == job_id).all()
    
    def get_by_url_and_job(self, db: Session, url: str, job_id: str) -> Optional[CrawledPage]:
        """Get crawled page by URL and job_id."""
        return db.query(self.model).filter(
            self.model.url == url,
            self.model.job_id == job_id
        ).first()
    
    def get_pending_pages(self, db: Session, job_id: str, limit: int = 10) -> List[CrawledPage]:
        """Get pending pages for a job."""
        return db.query(self.model).filter(
            self.model.job_id == job_id,
            self.model.status == "pending"
        ).limit(limit).all()
    
    def get_pages_count_by_status(
        self, 
        db: Session, 
        job_id: str
    ) -> Dict[str, int]:
        """Get count of pages by status for a job."""
        result = db.query(
            self.model.status,
            func.count(self.model.id)
        ).filter(
            self.model.job_id == job_id
        ).group_by(self.model.status).all()
        
        return {status: count for status, count in result}