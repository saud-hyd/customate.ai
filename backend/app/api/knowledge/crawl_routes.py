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
    Create a website crawl job.
    
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
        
        # Start job in background
        if background_tasks:
            background_tasks.add_task(crawler_service.start_crawl_job, job.job_id)
        
        return {
            "job_id": job.job_id,
            "status": "created",
            "base_url": url,
            "collection_id": collection_id,
            "max_pages": max_pages,
            "max_depth": max_depth,
            "created_at": datetime.utcnow().isoformat(),
            "message": "Website crawl job created and scheduled"
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
    List all crawl jobs for the current client.
    
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
        
        # Format response
        jobs_data = [
            {
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
            for job in paginated_jobs
        ]
        
        # For backward compatibility, return the array directly if requested
        if legacy_format:
            return jobs_data
            
        # Otherwise return with pagination details
        return {
            "jobs": jobs_data,
            "total": len(all_jobs),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.exception(f"Error listing crawl jobs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing crawl jobs: {str(e)}"
        )

@router.delete("/crawl/{job_id}")
async def cancel_crawl_job(
    job_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Cancel a website crawl job.
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
    
    # Initialize services
    llm_service = DeepSeekService()
    embedding_service = EmbeddingService(llm_service)
    crawler_service = WebCrawlerService(db, embedding_service)
    
    try:
        # Cancel job
        success = await crawler_service.cancel_job(job_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel job. Job may be already completed or cancelled."
            )
        
        return {"message": "Crawl job cancelled successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.exception(f"Error cancelling crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling crawl job: {str(e)}"
        )

@router.post("/crawl/{job_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_crawl_job(
    job_id: str,
    background_tasks: BackgroundTasks = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Retry a failed crawl job.
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
        
        # Start job in background
        if background_tasks:
            # Initialize services
            llm_service = DeepSeekService()
            embedding_service = EmbeddingService(llm_service)
            crawler_service = WebCrawlerService(db, embedding_service)
            
            background_tasks.add_task(crawler_service.start_crawl_job, job_id)
        
        return {
            "job_id": job_id,
            "status": "pending",
            "message": "Crawl job has been queued for retry"
        }
        
    except Exception as e:
        logger.exception(f"Error retrying crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrying crawl job: {str(e)}"
        )