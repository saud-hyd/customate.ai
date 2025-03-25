from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.knowledge.web_crawler_service import WebCrawlerService
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.llm.deepseek_service import DeepSeekService
from app.repositories.crawl_repository import WebsiteCrawlJobRepository
from app.repositories.knowledge_repository import KnowledgeCollectionRepository
# Create router without a prefix (prefix added in main.py)
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
    
    max_pages = crawl_data.get("max_pages", 100)
    max_depth = crawl_data.get("max_depth", 3)
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
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get status of a website crawl job.
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
    
    # Get job status
    status = await crawler_service.get_job_status(job_id)
    
    return status

@router.get("/crawl")
async def list_crawl_jobs(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    List all crawl jobs for the current client.
    """
    # Initialize repositories
    job_repo = WebsiteCrawlJobRepository()
    
    # Get jobs
    jobs = job_repo.get_by_client_id(db, current_client.client_id)
    
    return [
        {
            "job_id": job.job_id,
            "base_url": job.base_url,
            "status": job.status,
            "collection_id": job.collection_id,
            "max_pages": job.max_pages,
            "pages_crawled": job.pages_crawled,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }
        for job in jobs
    ]

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
    
    # Cancel job
    success = await crawler_service.cancel_job(job_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel job. Job may be already completed or cancelled."
        )
    
    return {"message": "Crawl job cancelled successfully"}