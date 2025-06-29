# backend/app/api/knowledge/crawl_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging
import traceback
from datetime import datetime

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.knowledge.web_crawler_service import WebCrawlerService
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.llm.deepseek_service import DeepSeekService
from app.repositories.crawl_repository import WebsiteCrawlJobRepository, CrawledPageRepository
from app.repositories.knowledge_repository import KnowledgeCollectionRepository

logger = logging.getLogger(__name__)

# Create router without a prefix (prefix added in main.py)
router = APIRouter()

@router.post("/crawl", status_code=status.HTTP_202_ACCEPTED)
async def create_crawl_job(
    crawl_data: Dict[str, Any] = Body(...),
    background_tasks: BackgroundTasks = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Create a website crawl job with storage limit validation.
    
    Request body:
    - url (required): Website URL to crawl
    - collection_id (optional): Knowledge collection ID to store content
    - max_pages (optional): Maximum number of pages to crawl, default 100
    - max_depth (optional): Maximum crawl depth, default 3
    - include_patterns (optional): List of URL patterns to include
    - exclude_patterns (optional): List of URL patterns to exclude
    - extraction_rules (optional): Custom rules for content extraction
    """
    # Extract parameters
    url = crawl_data.get("url")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL is required"
        )
    
    collection_id = crawl_data.get("collection_id")
    
    # Validate collection ID if provided
    if collection_id:
        collection_repo = KnowledgeCollectionRepository()
        collection = collection_repo.get_by_collection_id(db, collection_id)
        if not collection or collection.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid collection ID. Collection not found or does not belong to your account."
            )
    
    # Extract and validate other parameters
    try:
        # Default to reasonable values if not provided
        max_pages = int(crawl_data.get("max_pages", 100))
        if max_pages <= 0 or max_pages > 1000:
            max_pages = 100  # Default to 100 if invalid
            
        max_depth = int(crawl_data.get("max_depth", 3))
        if max_depth <= 0 or max_depth > 5:
            max_depth = 3  # Default to 3 if invalid
    except (ValueError, TypeError):
        # Handle parsing errors gracefully
        max_pages = 100
        max_depth = 3
    
    # CRITICAL: Validate storage limits BEFORE starting crawl
    from app.services.subscription.stripe_service import PLAN_LIMITS
    from app.repositories.client_repository import SubscriptionRepository
    from app.services.analytics.usage_tracker import UsageTracker
    
    # Get subscription info
    sub_repo = SubscriptionRepository()
    subscription = sub_repo.get_active_subscription(db, current_client.client_id)
    plan_type = subscription.plan_type if subscription else "free"
    
    # Get plan storage limit
    plan_limits = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])
    storage_limit_bytes = int(plan_limits["storage_limit_mb"] * 1024 * 1024)
    
    # Get current storage usage
    usage_tracker = UsageTracker()
    usage_tracker._update_storage_usage(db, current_client.client_id)
    
    from app.repositories.analytics_repository import StorageUsageRepository
    storage_repo = StorageUsageRepository()
    current_storage = storage_repo.get_latest(db, current_client.client_id)
    current_usage_bytes = current_storage.total_bytes if current_storage else 0
    
    # Calculate storage percentage
    storage_percentage = (current_usage_bytes / storage_limit_bytes * 100) if storage_limit_bytes > 0 else 0
    
    # Prevent crawling if storage is over 85% to leave room for crawled content
    if storage_percentage >= 85:
        current_usage_mb = current_usage_bytes / (1024 * 1024)
        limit_mb = plan_limits['storage_limit_mb']
        
        error_message = (
            f"Storage usage too high for crawling ({current_usage_mb:.2f}MB of {limit_mb}MB used, {storage_percentage:.1f}%). "
            f"Crawling may generate significant content. Please delete some files or upgrade your plan before crawling."
        )
        
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=error_message
        )
    
    # Estimate crawl storage impact and warn if approaching limits
    estimated_content_per_page = 5000  # Estimate ~5KB per page
    estimated_total_content = max_pages * estimated_content_per_page
    projected_usage = current_usage_bytes + estimated_total_content
    
    if projected_usage > storage_limit_bytes:
        current_usage_mb = current_usage_bytes / (1024 * 1024)
        limit_mb = plan_limits['storage_limit_mb']
        estimated_mb = estimated_total_content / (1024 * 1024)
        
        error_message = (
            f"Estimated crawl content ({estimated_mb:.2f}MB for {max_pages} pages) would exceed storage limit. "
            f"Current usage: {current_usage_mb:.2f}MB of {limit_mb}MB. "
            f"Please reduce max_pages, delete some content, or upgrade your plan."
        )
        
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=error_message
        )
    
    include_patterns = crawl_data.get("include_patterns")
    exclude_patterns = crawl_data.get("exclude_patterns")
    extraction_rules = crawl_data.get("extraction_rules")
    
    # Initialize services
    llm_service = DeepSeekService()
    embedding_service = EmbeddingService(llm_service)
    crawler_service = WebCrawlerService(db, embedding_service)
    
    try:
        # Create crawl job
        job = await crawler_service.create_crawl_job(
            client_id=current_client.client_id,
            base_url=url,
            collection_id=collection_id,
            max_pages=max_pages,
            max_depth=max_depth,
            include_patterns=include_patterns,
            exclude_patterns=exclude_patterns,
            extraction_rules=extraction_rules
        )
        
        # Enhanced background task with storage monitoring
        async def monitored_crawl_task():
            """Background crawl task with storage monitoring"""
            try:
                # Start the crawl job
                await crawler_service.start_crawl_job(job.job_id)
                
                # Update storage usage after crawling completes
                try:
                    fresh_db = Session()
                    try:
                        tracker = UsageTracker()
                        tracker._update_storage_usage(fresh_db, current_client.client_id)
                        tracker.update_knowledge_counts(fresh_db, current_client.client_id)
                        tracker._update_daily_stats(fresh_db, current_client.client_id)
                        logger.info(f"Successfully updated analytics after crawl completion for client {current_client.client_id}")
                    finally:
                        fresh_db.close()
                except Exception as tracking_error:
                    logger.error(f"Error updating analytics after crawl: {str(tracking_error)}")
                    
            except Exception as crawl_error:
                logger.error(f"Error in monitored crawl task: {str(crawl_error)}")
        
        # Start job in background with monitoring
        if background_tasks:
            background_tasks.add_task(monitored_crawl_task)
        
        return {
            "job_id": job.job_id,
            "status": "created",
            "base_url": url,
            "collection_id": collection_id,
            "max_pages": max_pages,
            "max_depth": max_depth,
            "created_at": datetime.utcnow().isoformat(),
            "message": "Website crawl job created and scheduled",
            "storage_info": {
                "current_usage_bytes": current_usage_bytes,
                "limit_bytes": storage_limit_bytes,
                "usage_percentage": storage_percentage,
                "estimated_crawl_size_bytes": estimated_total_content,
                "plan_type": plan_type
            }
        }
        
    except Exception as e:
        logger.exception(f"Error creating crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating crawl job: {str(e)}"
        )

@router.get("/crawl/{job_id}")
async def get_crawl_job_status(
    job_id: str,
    include_details: bool = False,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get status of a website crawl job.
    
    Args:
        job_id: The ID of the crawl job
        include_details: Set to true to include detailed page statistics
    """
    # Initialize repositories
    job_repo = WebsiteCrawlJobRepository()
    page_repo = CrawledPageRepository()
    
    # Get job
    job = job_repo.get_by_job_id(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crawl job not found"
        )
    
    # Verify client owns the job
    if job.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this crawl job"
        )
    
    try:
        # Initialize services
        llm_service = DeepSeekService()
        embedding_service = EmbeddingService(llm_service)
        crawler_service = WebCrawlerService(db, embedding_service)
        
        # Get job status
        status_data = await crawler_service.get_job_status(job_id)
        
        # Add storage impact information
        if job.status == "completed":
            try:
                from app.services.analytics.usage_tracker import UsageTracker
                from app.repositories.analytics_repository import StorageUsageRepository
                
                usage_tracker = UsageTracker()
                usage_tracker._update_storage_usage(db, current_client.client_id)
                
                storage_repo = StorageUsageRepository()
                current_storage = storage_repo.get_latest(db, current_client.client_id)
                
                if current_storage:
                    status_data["storage_impact"] = {
                        "total_storage_bytes": current_storage.total_bytes,
                        "crawled_content_bytes": current_storage.crawled_content_bytes,
                        "storage_percentage": "calculated_in_real_time"
                    }
            except Exception as storage_error:
                logger.warning(f"Could not calculate storage impact: {str(storage_error)}")
        
        # If detailed stats are requested, include them
        if include_details:
            # Get detailed page statistics
            page_stats = page_repo.get_summary_statistics(db, job_id)
            status_data["detailed_stats"] = page_stats
            
            # Get collection info
            if job.collection_id:
                collection_repo = KnowledgeCollectionRepository()
                collection = collection_repo.get_by_collection_id(db, job.collection_id)
                if collection:
                    status_data["collection"] = {
                        "collection_id": collection.collection_id,
                        "name": collection.name,
                        "description": collection.description
                    }
        
        return status_data
        
    except Exception as e:
        logger.exception(f"Error retrieving crawl job status: {str(e)}")
        # Return basic info on error rather than failing completely
        error_detail = str(e)
        # Truncate very long error messages
        if len(error_detail) > 200:
            error_detail = error_detail[:200] + "..."
            
        return {
            "job_id": job_id,
            "status": job.status,
            "base_url": job.base_url,
            "max_pages": job.max_pages,
            "pages_crawled": job.pages_crawled,
            "pages_processed": job.pages_processed,
            "pages_failed": job.pages_failed,
            "error": f"Error retrieving full status: {error_detail}",
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

@router.get("/crawl")
async def list_crawl_jobs(
    limit: int = 20,
    offset: int = 0,
    legacy_format: bool = False,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    List all crawl jobs for the current client with enhanced information.
    
    Args:
        limit: Maximum number of jobs to return
        offset: Number of jobs to skip
        legacy_format: If true, returns an array directly for backward compatibility
    """
    # Initialize repositories
    job_repo = WebsiteCrawlJobRepository()
    
    try:
        # Get jobs with pagination
        all_jobs = job_repo.get_by_client_id(db, current_client.client_id)
        
        # Apply pagination
        paginated_jobs = all_jobs[offset:offset+limit] if offset < len(all_jobs) else []
        
        # Format response with enhanced information
        jobs_data = []
        for job in paginated_jobs:
            job_data = {
                "job_id": job.job_id,
                "base_url": job.base_url,
                "status": job.status,
                "collection_id": job.collection_id,
                "max_pages": job.max_pages,
                "pages_crawled": job.pages_crawled,
                "pages_processed": job.pages_processed,
                "pages_failed": job.pages_failed,
                "created_at": job.created_at.isoformat(),
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None
            }
            
            # Add success rate calculation
            if job.pages_crawled > 0:
                success_rate = (job.pages_processed / job.pages_crawled) * 100
                job_data["success_rate"] = round(success_rate, 1)
            else:
                job_data["success_rate"] = 0
            
            # Add duration if completed
            if job.started_at and job.completed_at:
                duration = (job.completed_at - job.started_at).total_seconds()
                job_data["duration_seconds"] = int(duration)
            
            jobs_data.append(job_data)
        
        # For backward compatibility, return the array directly if requested
        if legacy_format:
            return jobs_data
            
        # Otherwise return with pagination details and summary
        total_pages_crawled = sum(job.pages_crawled for job in all_jobs)
        total_pages_processed = sum(job.pages_processed for job in all_jobs)
        
        return {
            "jobs": jobs_data,
            "total": len(all_jobs),
            "limit": limit,
            "offset": offset,
            "summary": {
                "total_jobs": len(all_jobs),
                "total_pages_crawled": total_pages_crawled,
                "total_pages_processed": total_pages_processed,
                "overall_success_rate": round((total_pages_processed / total_pages_crawled * 100), 1) if total_pages_crawled > 0 else 0
            }
        }
        
    except Exception as e:
        logger.exception(f"Error listing crawl jobs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing crawl jobs: {str(e)}"
        )

@router.delete("/crawl/{job_id}")
async def delete_crawl_job(
    job_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Delete a website crawl job and its associated data.
    This will also update storage usage after deletion.
    
    Args:
        job_id: The ID of the crawl job to delete
    """
    # Initialize repositories
    job_repo = WebsiteCrawlJobRepository()
    page_repo = CrawledPageRepository()
    
    # Get job
    job = job_repo.get_by_job_id(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crawl job not found"
        )
    
    # Verify client owns the job
    if job.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this crawl job"
        )
    
    # If the job is still running, cancel it first
    if job.status in ["pending", "in_progress"]:
        llm_service = DeepSeekService()
        embedding_service = EmbeddingService(llm_service)
        crawler_service = WebCrawlerService(db, embedding_service)
        success = await crawler_service.cancel_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel running crawl job before deletion."
            )
    
    try:
        # Get crawled pages with knowledge items for storage calculation
        from app.domain.knowledge.crawl_entities import CrawledPage
        from app.domain.knowledge.entities import KnowledgeItem, VectorEmbedding
        
        # Find knowledge items created by this crawl job
        crawled_pages = db.query(CrawledPage).filter(
            CrawledPage.job_id == job_id,
            CrawledPage.knowledge_item_id.isnot(None)
        ).all()
        
        # Extract knowledge item IDs for cleanup
        knowledge_item_ids = [page.knowledge_item_id for page in crawled_pages if page.knowledge_item_id]
        
        # Calculate storage being freed
        deleted_content_size = 0
        if knowledge_item_ids:
            # Calculate size of content being deleted
            from sqlalchemy import func, text
            size_query = text("""
                SELECT COALESCE(SUM(LENGTH(content)), 0) 
                FROM knowledge_items 
                WHERE item_id = ANY(:item_ids)
            """)
            deleted_content_size = db.execute(size_query, {"item_ids": knowledge_item_ids}).scalar() or 0
        
        # Delete associated data
        if knowledge_item_ids:
            # Delete embeddings first (foreign key constraint)
            db.query(VectorEmbedding).filter(
                VectorEmbedding.item_id.in_(knowledge_item_ids)
            ).delete(synchronize_session=False)
            
            # Delete knowledge items
            db.query(KnowledgeItem).filter(
                KnowledgeItem.item_id.in_(knowledge_item_ids)
            ).delete(synchronize_session=False)
        
        # Delete crawled pages
        page_repo.delete_by_job_id(db, job_id)
        
        # Delete the job itself
        job_repo.delete_by_job_id(db, job_id)
        
        # Commit the transaction
        db.commit()
        
        # Update storage usage after deletion
        try:
            from app.services.analytics.usage_tracker import UsageTracker
            usage_tracker = UsageTracker()
            usage_tracker._update_storage_usage(db, current_client.client_id)
            usage_tracker.update_knowledge_counts(db, current_client.client_id)
            usage_tracker._update_daily_stats(db, current_client.client_id)
            logger.info(f"Updated storage usage after crawl job deletion for client {current_client.client_id}")
        except Exception as tracking_error:
            logger.warning(f"Could not update storage usage after deletion: {str(tracking_error)}")
        
        return {
            "message": f"Crawl job {job_id} and its associated data deleted successfully",
            "deleted_content_size_bytes": deleted_content_size,
            "deleted_content_size_mb": round(deleted_content_size / (1024 * 1024), 2),
            "deleted_items": len(knowledge_item_ids)
        }
        
    except Exception as e:
        db.rollback()
        logger.exception(f"Error deleting crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting crawl job: {str(e)}"
        )
        
@router.post("/crawl/{job_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_crawl_job(
    job_id: str,
    background_tasks: BackgroundTasks = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Retry a failed crawl job with storage validation.
    """
    # Initialize repositories
    job_repo = WebsiteCrawlJobRepository()
    
    # Get job
    job = job_repo.get_by_job_id(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crawl job not found"
        )
    
    # Verify client owns the job
    if job.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this crawl job"
        )
    
    # Check if job is in a failed or cancelled state
    if job.status not in ["failed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot retry job with status '{job.status}'. Only failed or cancelled jobs can be retried."
        )
    
    # Re-validate storage limits before retry
    from app.services.subscription.stripe_service import PLAN_LIMITS
    from app.repositories.client_repository import SubscriptionRepository
    from app.services.analytics.usage_tracker import UsageTracker
    
    # Get subscription info
    sub_repo = SubscriptionRepository()
    subscription = sub_repo.get_active_subscription(db, current_client.client_id)
    plan_type = subscription.plan_type if subscription else "free"
    
    # Get plan storage limit
    plan_limits = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])
    storage_limit_bytes = int(plan_limits["storage_limit_mb"] * 1024 * 1024)
    
    # Get current storage usage
    usage_tracker = UsageTracker()
    usage_tracker._update_storage_usage(db, current_client.client_id)
    
    from app.repositories.analytics_repository import StorageUsageRepository
    storage_repo = StorageUsageRepository()
    current_storage = storage_repo.get_latest(db, current_client.client_id)
    current_usage_bytes = current_storage.total_bytes if current_storage else 0
    
    # Calculate storage percentage
    storage_percentage = (current_usage_bytes / storage_limit_bytes * 100) if storage_limit_bytes > 0 else 0
    
    # Prevent retry if storage is over 85%
    if storage_percentage >= 85:
        current_usage_mb = current_usage_bytes / (1024 * 1024)
        limit_mb = plan_limits['storage_limit_mb']
        
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Storage usage too high for retry ({current_usage_mb:.2f}MB of {limit_mb}MB, {storage_percentage:.1f}%). Please delete some content or upgrade your plan."
        )
    
    try:
        # Update job status to pending
        job_repo.update_job_status(
            db,
            job_id,
            "pending",
            {
                "error_message": None,
                "started_at": None,
                "completed_at": None
            }
        )
        
        # Start job in background with monitoring
        if background_tasks:
            # Initialize services
            llm_service = DeepSeekService()
            embedding_service = EmbeddingService(llm_service)
            crawler_service = WebCrawlerService(db, embedding_service)
            
            async def monitored_retry_task():
                """Background retry task with storage monitoring"""
                try:
                    await crawler_service.start_crawl_job(job_id)
                    
                    # Update storage usage after retry completes
                    try:
                        fresh_db = Session()
                        try:
                            tracker = UsageTracker()
                            tracker._update_storage_usage(fresh_db, current_client.client_id)
                            tracker.update_knowledge_counts(fresh_db, current_client.client_id)
                        finally:
                            fresh_db.close()
                    except Exception as tracking_error:
                        logger.error(f"Error updating analytics after retry: {str(tracking_error)}")
                        
                except Exception as retry_error:
                    logger.error(f"Error in monitored retry task: {str(retry_error)}")
            
            background_tasks.add_task(monitored_retry_task)
        
        return {
            "job_id": job_id,
            "status": "pending",
            "message": "Crawl job has been queued for retry",
            "storage_info": {
                "current_usage_bytes": current_usage_bytes,
                "limit_bytes": storage_limit_bytes,
                "usage_percentage": storage_percentage,
                "plan_type": plan_type
            }
        }
        
    except Exception as e:
        logger.exception(f"Error retrying crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrying crawl job: {str(e)}"
        )