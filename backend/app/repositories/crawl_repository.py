# backend/app/repositories/crawl_repository.py

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, and_, or_
import logging

from app.repositories.base_repository import BaseRepository
from app.domain.knowledge.crawl_entities import WebsiteCrawlJob, CrawledPage

logger = logging.getLogger(__name__)

class WebsiteCrawlJobRepository(BaseRepository[WebsiteCrawlJob, dict, dict]):
    """Repository for website crawl job entities with enhanced intelligent crawling support."""
    
    def __init__(self):
        super().__init__(WebsiteCrawlJob)
    
    # ================================
    # BASIC CRUD OPERATIONS
    # ================================
    
    def get_by_job_id(self, db: Session, job_id: str) -> Optional[WebsiteCrawlJob]:
        """Get crawl job by job_id."""
        try:
            return db.query(self.model).filter(self.model.job_id == job_id).first()
        except Exception as e:
            logger.error(f"Error getting job by ID {job_id}: {str(e)}")
            return None
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[WebsiteCrawlJob]:
        """Get all crawl jobs for a client, ordered by creation date."""
        try:
            return db.query(self.model).filter(
                self.model.client_id == client_id
            ).order_by(desc(self.model.created_at)).all()
        except Exception as e:
            logger.error(f"Error getting jobs for client {client_id}: {str(e)}")
            return []
    
    def delete_by_job_id(self, db: Session, job_id: str) -> bool:
        """
        Delete a job by job_id.
        
        Args:
            db: Database session
            job_id: Job ID
            
        Returns:
            Boolean indicating success
        """
        try:
            job = self.get_by_job_id(db, job_id)
            if not job:
                logger.warning(f"Job {job_id} not found for deletion")
                return False
            
            db.delete(job)
            db.commit()
            logger.info(f"Successfully deleted job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {str(e)}")
            db.rollback()
            return False

    def delete_job_and_content(self, db: Session, job_id: str) -> Dict[str, int]:
        """
        Delete a job and all its associated content (pages and knowledge items).
        
        Args:
            db: Database session
            job_id: Job ID
            
        Returns:
            Dictionary with deletion counts
        """
        try:
            # Initialize page repository
            page_repo = CrawledPageRepository()
            
            # Delete knowledge items first (to avoid foreign key issues)
            knowledge_items_deleted = page_repo.delete_content_by_job_id(db, job_id)
            
            # Delete all pages for this job
            pages_deleted = page_repo.delete_by_job_id(db, job_id)
            
            # Delete the job itself
            job_deleted = self.delete_by_job_id(db, job_id)
            
            return {
                'job_deleted': 1 if job_deleted else 0,
                'pages_deleted': pages_deleted,
                'knowledge_items_deleted': knowledge_items_deleted
            }
            
        except Exception as e:
            logger.error(f"Error deleting job and content {job_id}: {str(e)}")
            db.rollback()
            return {
                'job_deleted': 0,
                'pages_deleted': 0,
                'knowledge_items_deleted': 0
            }
    
    # ================================
    # JOB STATUS MANAGEMENT
    # ================================
    
    def get_active_jobs(self, db: Session, limit: int = 10) -> List[WebsiteCrawlJob]:
        """Get all active (pending, in_progress) jobs."""
        try:
            return db.query(self.model).filter(
                self.model.status.in_(["pending", "in_progress"])
            ).order_by(self.model.created_at).limit(limit).all()
        except Exception as e:
            logger.error(f"Error getting active jobs: {str(e)}")
            return []
    
    def update_job_status(
        self, 
        db: Session, 
        job_id: str, 
        status: str,
        update_data: Dict[str, Any] = None
    ) -> Optional[WebsiteCrawlJob]:
        """Update job status and other fields."""
        try:
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
        except Exception as e:
            logger.error(f"Error updating job status {job_id}: {str(e)}")
            db.rollback()
            return None
    
    def increment_counter(
        self, 
        db: Session, 
        job_id: str, 
        counter_name: str
    ) -> Optional[WebsiteCrawlJob]:
        """Increment a counter field (pages_crawled, pages_processed, pages_failed)."""
        try:
            job = self.get_by_job_id(db, job_id)
            if not job or not hasattr(job, counter_name):
                return None
            
            current_value = getattr(job, counter_name, 0) or 0
            setattr(job, counter_name, current_value + 1)
            
            db.add(job)
            db.commit()
            db.refresh(job)
            return job
        except Exception as e:
            logger.error(f"Error incrementing counter {counter_name} for job {job_id}: {str(e)}")
            db.rollback()
            return None
    
    # ================================
    # ENHANCED QUERY METHODS
    # ================================
    
    def get_jobs_by_status(self, db: Session, status: str, limit: int = 50) -> List[WebsiteCrawlJob]:
        """Get jobs filtered by status."""
        try:
            return db.query(self.model).filter(
                self.model.status == status
            ).order_by(desc(self.model.created_at)).limit(limit).all()
        except Exception as e:
            logger.error(f"Error getting jobs by status {status}: {str(e)}")
            return []
    
    def get_jobs_by_date_range(
        self, 
        db: Session, 
        client_id: str, 
        start_date, 
        end_date
    ) -> List[WebsiteCrawlJob]:
        """Get jobs within a date range."""
        try:
            return db.query(self.model).filter(
                and_(
                    self.model.client_id == client_id,
                    self.model.created_at >= start_date,
                    self.model.created_at <= end_date
                )
            ).order_by(desc(self.model.created_at)).all()
        except Exception as e:
            logger.error(f"Error getting jobs by date range: {str(e)}")
            return []
    
    def get_failed_jobs(self, db: Session, client_id: str = None) -> List[WebsiteCrawlJob]:
        """Get all failed jobs for troubleshooting."""
        try:
            query = db.query(self.model).filter(self.model.status == "failed")
            
            if client_id:
                query = query.filter(self.model.client_id == client_id)
            
            return query.order_by(desc(self.model.created_at)).all()
        except Exception as e:
            logger.error(f"Error getting failed jobs: {str(e)}")
            return []
    
    def get_jobs_summary(self, db: Session, client_id: str) -> Dict[str, Any]:
        """Get summary statistics for client's crawl jobs."""
        try:
            # Get status counts
            status_counts = db.query(
                self.model.status,
                func.count(self.model.job_id).label('count')
            ).filter(self.model.client_id == client_id)\
             .group_by(self.model.status).all()
            
            # Get total pages crawled
            total_pages = db.query(
                func.sum(self.model.pages_crawled)
            ).filter(self.model.client_id == client_id).scalar() or 0
            
            # Get total jobs
            total_jobs = db.query(self.model).filter(
                self.model.client_id == client_id
            ).count()
            
            return {
                'total_jobs': total_jobs,
                'total_pages_crawled': total_pages,
                'status_counts': {status: count for status, count in status_counts}
            }
        except Exception as e:
            logger.error(f"Error getting jobs summary: {str(e)}")
            return {'total_jobs': 0, 'total_pages_crawled': 0, 'status_counts': {}}

class CrawledPageRepository(BaseRepository[CrawledPage, dict, dict]):
    """Repository for crawled page entities with intelligent prioritization support."""
    
    def __init__(self):
        super().__init__(CrawledPage)
    
    # ================================
    # BASIC CRUD OPERATIONS
    # ================================
    
    def get_by_page_id(self, db: Session, page_id: str) -> Optional[CrawledPage]:
        """Get crawled page by page_id."""
        try:
            return db.query(self.model).filter(self.model.page_id == page_id).first()
        except Exception as e:
            logger.error(f"Error getting page by ID {page_id}: {str(e)}")
            return None
    
    def get_by_job_id(self, db: Session, job_id: str) -> List[CrawledPage]:
        """Get all crawled pages for a job."""
        try:
            return db.query(self.model).filter(self.model.job_id == job_id).all()
        except Exception as e:
            logger.error(f"Error getting pages for job {job_id}: {str(e)}")
            return []
    
    def get_by_url_and_job(self, db: Session, url: str, job_id: str) -> Optional[CrawledPage]:
        """Get crawled page by URL and job_id to check for duplicates."""
        try:
            return db.query(self.model).filter(
                and_(
                    self.model.url == url,
                    self.model.job_id == job_id
                )
            ).first()
        except Exception as e:
            logger.error(f"Error checking URL existence: {str(e)}")
            return None
    
    def delete_by_job_id(self, db: Session, job_id: str) -> int:
        """
        Delete all crawled pages for a job.
        
        Args:
            db: Database session
            job_id: Job ID
            
        Returns:
            Number of pages deleted
        """
        try:
            # Get count before deletion
            count = db.query(self.model).filter(self.model.job_id == job_id).count()
            
            # Delete pages
            db.query(self.model).filter(self.model.job_id == job_id).delete(synchronize_session=False)
            db.commit()
            
            logger.info(f"Successfully deleted {count} pages for job {job_id}")
            return count
            
        except Exception as e:
            logger.error(f"Error deleting pages for job {job_id}: {str(e)}")
            db.rollback()
            return 0
    
    # ================================
    # PAGE STATUS MANAGEMENT
    # ================================
    
    def get_pending_pages(self, db: Session, job_id: str, limit: int = 50) -> List[CrawledPage]:
        """Get pending pages for a job."""
        try:
            return db.query(self.model).filter(
                and_(
                    self.model.job_id == job_id,
                    self.model.status == "pending"
                )
            ).limit(limit).all()
        except Exception as e:
            logger.error(f"Error getting pending pages: {str(e)}")
            return []
    
    def get_pending_pages_prioritized(
        self, 
        db: Session, 
        job_id: str, 
        limit: int = 50
    ) -> List[CrawledPage]:
        """
        Get pending pages ordered by priority for intelligent crawling.
        Priority order:
        1. Depth 0 pages (specific pages added by user)
        2. Pages with high priority metadata
        3. Lower depth pages first
        4. Alphabetical by URL for consistency
        """
        try:
            return db.query(self.model)\
                .filter(
                    and_(
                        self.model.job_id == job_id,
                        self.model.status == "pending"
                    )
                )\
                .order_by(
                    asc(self.model.depth),  # Lower depth first
                    asc(self.model.url)     # Alphabetical for consistency
                )\
                .limit(limit)\
                .all()
        except Exception as e:
            logger.error(f"Error getting prioritized pending pages: {str(e)}")
            return []
    
    def get_pages_count_by_status(self, db: Session, job_id: str) -> Dict[str, int]:
        """Get count of pages by status for a job."""
        try:
            result = db.query(
                self.model.status,
                func.count(self.model.page_id).label('count')
            ).filter(
                self.model.job_id == job_id
            ).group_by(self.model.status).all()
            
            return {status: count for status, count in result}
        except Exception as e:
            logger.error(f"Error getting pages count by status: {str(e)}")
            return {}
    
    # ================================
    # ENHANCED QUERY METHODS
    # ================================
    
    def get_recent_pages(
        self, 
        db: Session, 
        job_id: str, 
        limit: int = 10
    ) -> List[CrawledPage]:
        """Get recently processed pages for a job."""
        try:
            return db.query(self.model)\
                .filter(self.model.job_id == job_id)\
                .filter(self.model.status.in_(["completed", "failed"]))\
                .order_by(desc(self.model.updated_at))\
                .limit(limit)\
                .all()
        except Exception as e:
            logger.error(f"Error getting recent pages: {str(e)}")
            return []
    
    def get_failed_pages(
        self, 
        db: Session, 
        job_id: str, 
        limit: int = 10
    ) -> List[CrawledPage]:
        """Get failed pages for a job."""
        try:
            return db.query(self.model)\
                .filter(
                    and_(
                        self.model.job_id == job_id,
                        self.model.status == "failed"
                    )
                )\
                .order_by(desc(self.model.updated_at))\
                .limit(limit)\
                .all()
        except Exception as e:
            logger.error(f"Error getting failed pages: {str(e)}")
            return []
    
    def get_completed_pages(
        self, 
        db: Session, 
        job_id: str, 
        limit: int = 100
    ) -> List[CrawledPage]:
        """Get successfully completed pages for a job."""
        try:
            return db.query(self.model)\
                .filter(
                    and_(
                        self.model.job_id == job_id,
                        self.model.status == "completed"
                    )
                )\
                .order_by(desc(self.model.updated_at))\
                .limit(limit)\
                .all()
        except Exception as e:
            logger.error(f"Error getting completed pages: {str(e)}")
            return []
    
    def get_pages_by_depth(
        self, 
        db: Session, 
        job_id: str, 
        depth: int
    ) -> List[CrawledPage]:
        """Get pages at a specific depth level."""
        try:
            return db.query(self.model)\
                .filter(
                    and_(
                        self.model.job_id == job_id,
                        self.model.depth == depth
                    )
                )\
                .order_by(asc(self.model.url))\
                .all()
        except Exception as e:
            logger.error(f"Error getting pages by depth: {str(e)}")
            return []
    
    def get_pages_by_priority(
        self, 
        db: Session, 
        job_id: str,
        priority_levels: List[str] = None
    ) -> List[CrawledPage]:
        """Get pages filtered by priority levels from metadata."""
        try:
            query = db.query(self.model)\
                .filter(self.model.job_id == job_id)
            
            if priority_levels:
                # This would require JSON querying capabilities
                # For now, return all pages ordered by depth
                pass
            
            return query.order_by(asc(self.model.depth)).all()
        except Exception as e:
            logger.error(f"Error getting pages by priority: {str(e)}")
            return []
    
    # ================================
    # CONTENT MANAGEMENT
    # ================================
    
    def get_by_content_hash(self, db: Session, job_id: str, content_hash: str) -> Optional[CrawledPage]:
        """Get crawled page by content hash to detect duplicates."""
        try:
            return db.query(self.model).filter(
                and_(
                    self.model.job_id == job_id,
                    self.model.content_hash == content_hash
                )
            ).first()
        except Exception as e:
            logger.error(f"Error getting page by content hash: {str(e)}")
            return None
    
    def delete_content_by_job_id(self, db: Session, job_id: str) -> int:
        """
        Delete knowledge items associated with a crawl job.
        
        Args:
            db: Database session
            job_id: Crawl job ID
            
        Returns:
            Number of items deleted
        """
        try:
            from app.repositories.knowledge_repository import KnowledgeItem
            from app.repositories.vector_repository import VectorEmbedding
            
            # Find all knowledge_item_ids from crawled pages
            knowledge_item_ids = db.query(self.model.knowledge_item_id).filter(
                and_(
                    self.model.job_id == job_id,
                    self.model.knowledge_item_id.isnot(None)
                )
            ).all()
            
            # Extract IDs from result tuples
            item_ids = [item_id for (item_id,) in knowledge_item_ids if item_id]
            
            if not item_ids:
                return 0
            
            # Delete vector embeddings first (due to foreign key constraints)
            embedding_count = db.query(VectorEmbedding).filter(
                VectorEmbedding.item_id.in_(item_ids)
            ).delete(synchronize_session=False)
            
            # Delete knowledge items
            item_count = db.query(KnowledgeItem).filter(
                KnowledgeItem.item_id.in_(item_ids)
            ).delete(synchronize_session=False)
            
            db.commit()
            
            logger.info(f"Deleted {item_count} knowledge items and {embedding_count} embeddings for job {job_id}")
            return item_count
            
        except Exception as e:
            logger.error(f"Error deleting content for job {job_id}: {str(e)}")
            db.rollback()
            return 0
    
    # ================================
    # STATISTICS AND ANALYTICS
    # ================================
    
    def get_summary_statistics(self, db: Session, job_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a crawl job."""
        try:
            # Status counts
            status_counts = self.get_pages_count_by_status(db, job_id)
            
            # Depth distribution
            depth_stats = db.query(
                self.model.depth,
                func.count(self.model.page_id).label('count')
            ).filter(
                self.model.job_id == job_id
            ).group_by(self.model.depth).all()
            
            # Average processing time (if we track it)
            total_pages = sum(status_counts.values())
            
            # Content statistics
            content_stats = db.query(
                func.count(self.model.page_id).label('total_pages'),
                func.sum(func.length(self.model.content_hash)).label('total_content_size')
            ).filter(
                and_(
                    self.model.job_id == job_id,
                    self.model.status == "completed"
                )
            ).first()
            
            return {
                'status_counts': status_counts,
                'depth_distribution': {depth: count for depth, count in depth_stats},
                'total_pages': total_pages,
                'content_stats': {
                    'pages_with_content': content_stats.total_pages if content_stats else 0,
                    'estimated_content_size': content_stats.total_content_size if content_stats else 0
                }
            }
        except Exception as e:
            logger.error(f"Error getting summary statistics: {str(e)}")
            return {}
    
    def get_crawl_efficiency_metrics(self, db: Session, job_id: str) -> Dict[str, Any]:
        """Get efficiency metrics for a crawl job."""
        try:
            # Success rate
            status_counts = self.get_pages_count_by_status(db, job_id)
            total_pages = sum(status_counts.values())
            success_rate = (status_counts.get('completed', 0) / total_pages * 100) if total_pages > 0 else 0
            
            # Depth efficiency (pages per depth level)
            depth_stats = db.query(
                self.model.depth,
                func.count(self.model.page_id).label('count')
            ).filter(
                and_(
                    self.model.job_id == job_id,
                    self.model.status == "completed"
                )
            ).group_by(self.model.depth).all()
            
            return {
                'success_rate': round(success_rate, 2),
                'total_pages_attempted': total_pages,
                'pages_per_depth': {depth: count for depth, count in depth_stats},
                'efficiency_score': round(success_rate * (total_pages / 100), 2)  # Weighted by volume
            }
        except Exception as e:
            logger.error(f"Error getting efficiency metrics: {str(e)}")
            return {}
    
    # ================================
    # BATCH OPERATIONS
    # ================================
    
    def bulk_update_status(
        self, 
        db: Session, 
        job_id: str, 
        old_status: str, 
        new_status: str
    ) -> int:
        """Bulk update page status for a job."""
        try:
            updated_count = db.query(self.model)\
                .filter(
                    and_(
                        self.model.job_id == job_id,
                        self.model.status == old_status
                    )
                )\
                .update({'status': new_status}, synchronize_session=False)
            
            db.commit()
            return updated_count
        except Exception as e:
            logger.error(f"Error bulk updating status: {str(e)}")
            db.rollback()
            return 0
    
    def reset_failed_pages(self, db: Session, job_id: str) -> int:
        """Reset failed pages to pending for retry."""
        try:
            return self.bulk_update_status(db, job_id, 'failed', 'pending')
        except Exception as e:
            logger.error(f"Error resetting failed pages: {str(e)}")
            return 0
    
    # ================================
    # ADVANCED QUERYING
    # ================================
    
    def search_pages_by_url_pattern(
        self, 
        db: Session, 
        job_id: str, 
        pattern: str
    ) -> List[CrawledPage]:
        """Search pages by URL pattern."""
        try:
            return db.query(self.model)\
                .filter(
                    and_(
                        self.model.job_id == job_id,
                        self.model.url.like(f'%{pattern}%')
                    )
                )\
                .order_by(asc(self.model.depth), asc(self.model.url))\
                .all()
        except Exception as e:
            logger.error(f"Error searching pages by pattern: {str(e)}")
            return []
    
    def get_pages_with_knowledge_items(self, db: Session, job_id: str) -> List[CrawledPage]:
        """Get pages that successfully generated knowledge items."""
        try:
            return db.query(self.model)\
                .filter(
                    and_(
                        self.model.job_id == job_id,
                        self.model.knowledge_item_id.isnot(None)
                    )
                )\
                .order_by(asc(self.model.depth))\
                .all()
        except Exception as e:
            logger.error(f"Error getting pages with knowledge items: {str(e)}")
            return []