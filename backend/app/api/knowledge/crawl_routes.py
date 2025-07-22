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
from app.services.llm.llm_service import LLMService
from app.repositories.crawl_repository import WebsiteCrawlJobRepository, CrawledPageRepository
from app.repositories.knowledge_repository import KnowledgeCollectionRepository

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/crawl", status_code=status.HTTP_202_ACCEPTED)
async def create_crawl_job(
    crawl_data: Dict[str, Any] = Body(...),
    background_tasks: BackgroundTasks = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Create a website crawl job with intelligent mode support.
    
    Request body:
    - url (required): Website URL to crawl
    - collection_id (optional): Knowledge collection ID to store content
    - intelligent_mode (optional): Use intelligent auto-crawling (default: true)
    - specific_pages (optional): List of specific pages to prioritize
    - max_pages (optional): Maximum pages for manual mode
    - max_depth (optional): Maximum depth for manual mode
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
    intelligent_mode = crawl_data.get("intelligent_mode", True)  # Default to intelligent mode
    specific_pages = crawl_data.get("specific_pages", [])
    
    # Validate collection ID if provided
    if collection_id:
        collection_repo = KnowledgeCollectionRepository()
        collection = collection_repo.get_by_collection_id(db, collection_id)
        if not collection or collection.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid collection ID. Collection not found or does not belong to your account."
            )
    
    # Initialize services
    llm_service = LLMService()  
    embedding_service = EmbeddingService(llm_service)
    crawler_service = WebCrawlerService(db, embedding_service)
    
    try:
        if intelligent_mode:
            # Use intelligent crawling
            result = await crawler_service.create_intelligent_crawl_job(
                client_id=current_client.client_id,
                base_url=url,
                collection_id=collection_id,
                specific_pages=specific_pages,
                include_patterns=crawl_data.get("include_patterns"),
                exclude_patterns=crawl_data.get("exclude_patterns"),
                extraction_rules=crawl_data.get("extraction_rules")
            )
            
            job = result['job']
            crawl_params = result['crawl_params']
            
            # Enhanced background task with storage monitoring
            async def intelligent_crawl_task():
                try:
                    await crawler_service.start_crawl_job(job.job_id)
                    logger.info(f"Intelligent crawl job {job.job_id} completed successfully")
                except Exception as e:
                    logger.exception(f"Error in intelligent crawl job {job.job_id}: {str(e)}")
                    crawler_service.job_repo.update_job_status(
                        db, job.job_id, "failed", 
                        {"error_message": str(e), "completed_at": datetime.utcnow()}
                    )
            
            background_tasks.add_task(intelligent_crawl_task)
            
            return {
                "job_id": job.job_id,
                "message": "Intelligent crawl job started successfully",
                "crawl_strategy": "intelligent",
                "estimated_pages": crawl_params['max_pages'],
                "storage_usage": {
                    "available_bytes": crawl_params['available_storage'],
                    "estimated_usage_bytes": crawl_params['estimated_storage']
                },
                "discovered_pages": result.get('discovered_pages', []),
                "site_analysis": crawl_params.get('site_structure', {})
            }
        else:
            # Use manual crawling (existing logic)
            max_pages = int(crawl_data.get("max_pages", 100))
            max_depth = int(crawl_data.get("max_depth", 3))
            
            # Storage validation for manual mode
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
            
            # Prevent crawling if storage is over 85%
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
            
            # Create manual crawl job
            job = await crawler_service.create_crawl_job(
                client_id=current_client.client_id,
                base_url=url,
                collection_id=collection_id,
                max_pages=max_pages,
                max_depth=max_depth,
                include_patterns=crawl_data.get("include_patterns"),
                exclude_patterns=crawl_data.get("exclude_patterns"),
                extraction_rules=crawl_data.get("extraction_rules")
            )
            
            # Background task for manual crawling
            async def manual_crawl_task():
                try:
                    await crawler_service.start_crawl_job(job.job_id)
                    logger.info(f"Manual crawl job {job.job_id} completed successfully")
                except Exception as e:
                    logger.exception(f"Error in manual crawl job {job.job_id}: {str(e)}")
                    crawler_service.job_repo.update_job_status(
                        db, job.job_id, "failed", 
                        {"error_message": str(e), "completed_at": datetime.utcnow()}
                    )
            
            background_tasks.add_task(manual_crawl_task)
            
            return {
                "job_id": job.job_id,
                "message": "Manual crawl job started successfully",
                "crawl_strategy": "manual",
                "max_pages": max_pages,
                "max_depth": max_depth
            }
            
    except Exception as e:
        logger.exception(f"Error creating crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create crawl job: {str(e)}"
        )

@router.get("/crawl/{job_id}/progress")
async def get_crawl_progress(
    job_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get detailed crawl progress including discovered pages
    """
    try:
        job_repo = WebsiteCrawlJobRepository()
        page_repo = CrawledPageRepository()
        
        # Get job
        job = job_repo.get_by_job_id(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crawl job not found"
            )
        
        # Verify ownership
        if job.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this crawl job"
            )
        
        # Get page statistics
        page_stats = page_repo.get_pages_count_by_status(db, job_id)
        
        # Get recent crawled pages (last 10)
        recent_pages = page_repo.get_recent_pages(db, job_id, limit=10)
        
        # Get failed pages for debugging
        failed_pages = page_repo.get_failed_pages(db, job_id, limit=5)
        
        return {
            "job_id": job.job_id,
            "status": job.status,
            "progress": {
                "pages_crawled": job.pages_crawled,
                "pages_processed": job.pages_processed,
                "pages_failed": job.pages_failed,
                "max_pages": job.max_pages,
                "completion_percentage": min(100, (job.pages_crawled / job.max_pages) * 100) if job.max_pages > 0 else 0
            },
            "page_stats": page_stats,
            "recent_pages": [
                {
                    "url": page.url,
                    "title": page.title,
                    "status": page.status,
                    "depth": page.depth,
                    "crawled_at": page.updated_at.isoformat() if page.updated_at else None
                }
                for page in recent_pages
            ],
            "failed_pages": [
                {
                    "url": page.url,
                    "error": page.title if page.status == "failed" else None,
                    "depth": page.depth
                }
                for page in failed_pages
            ],
            "timing": {
                "created_at": job.created_at.isoformat(),
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting crawl progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get crawl progress: {str(e)}"
        )

@router.post("/crawl/{job_id}/add-pages")
async def add_specific_pages(
    job_id: str,
    page_data: Dict[str, Any] = Body(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Add specific pages to an existing crawl job
    
    Request body:
    - pages (required): List of URLs to add
    """
    try:
        pages = page_data.get("pages", [])
        if not pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pages list is required"
            )
        
        job_repo = WebsiteCrawlJobRepository()
        page_repo = CrawledPageRepository()
        
        # Get job
        job = job_repo.get_by_job_id(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crawl job not found"
            )
        
        # Verify ownership
        if job.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this crawl job"
            )
        
        # Check if job can accept new pages
        if job.status not in ["pending", "in_progress"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add pages to job with status '{job.status}'"
            )
        
        # Add pages
        added_pages = []
        for page_url in pages:
            # Validate URL is from same domain
            from urllib.parse import urlparse
            base_domain = urlparse(job.base_url).netloc
            page_domain = urlparse(page_url).netloc
            
            if page_domain != base_domain:
                continue  # Skip pages from different domains
            
            # Check if page already exists
            existing = page_repo.get_by_url_and_job(db, page_url, job_id)
            if existing:
                continue  # Skip if already exists
            
            # Add page
            page_data = {
                "job_id": job_id,
                "url": page_url,
                "status": "pending",
                "depth": 0  # Specific pages get priority (depth 0)
            }
            
            new_page = page_repo.create(db, obj_in=page_data)
            added_pages.append({
                "url": new_page.url,
                "page_id": new_page.page_id
            })
        
        return {
            "message": f"Added {len(added_pages)} pages to crawl job",
            "added_pages": added_pages,
            "job_id": job_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error adding specific pages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add pages: {str(e)}"
        )

@router.get("/crawl")
async def get_crawl_jobs(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all crawl jobs for the current client"""
    try:
        job_repo = WebsiteCrawlJobRepository()
        jobs = job_repo.get_by_client_id(db, current_client.client_id)
        
        return {
            "jobs": [
                {
                    "job_id": job.job_id,
                    "base_url": job.base_url,
                    "status": job.status,
                    "max_pages": job.max_pages,
                    "pages_crawled": job.pages_crawled,
                    "pages_processed": job.pages_processed,
                    "pages_failed": job.pages_failed,
                    "created_at": job.created_at.isoformat(),
                    "started_at": job.started_at.isoformat() if job.started_at else None,
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None
                }
                for job in jobs
            ]
        }
    except Exception as e:
        logger.exception(f"Error getting crawl jobs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get crawl jobs: {str(e)}"
        )
                
@router.delete("/crawl/{job_id}")
async def cancel_crawl_job(
    job_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Cancel or delete a crawl job"""
    try:
        job_repo = WebsiteCrawlJobRepository()
        page_repo = CrawledPageRepository()
        
        # Get job
        job = job_repo.get_by_job_id(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crawl job not found"
            )
        
        # Verify ownership
        if job.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this crawl job"
            )
        
        # Cancel or delete job
        if job.status in ["pending", "in_progress"]:
            # Cancel running job
            job_repo.update_job_status(
                db, job_id, "cancelled",
                {"completed_at": datetime.utcnow(), "error_message": "Cancelled by user"}
            )
            return {"message": "Crawl job cancelled successfully"}
        else:
            # Delete completed job and its pages
            try:
                # Use the complete deletion method
                deletion_result = job_repo.delete_job_and_content(db, job_id)
                
                if deletion_result['job_deleted'] > 0:
                    return {
                        "message": "Crawl job deleted successfully",
                        "details": {
                            "pages_deleted": deletion_result['pages_deleted'],
                            "knowledge_items_deleted": deletion_result['knowledge_items_deleted']
                        }
                    }
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to delete crawl job"
                    )
                    
            except Exception as delete_error:
                logger.error(f"Error deleting job {job_id}: {str(delete_error)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to delete crawl job: {str(delete_error)}"
                )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error cancelling crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel crawl job: {str(e)}"
        )

@router.post("/crawl/{job_id}/retry")
async def retry_crawl_job(
    job_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Retry a failed crawl job"""
    try:
        job_repo = WebsiteCrawlJobRepository()
        page_repo = CrawledPageRepository()
        
        # Get job
        job = job_repo.get_by_job_id(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crawl job not found"
            )
        
        # Verify ownership
        if job.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this crawl job"
            )
        
        # Check if job can be retried
        if job.status not in ["failed", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot retry job with status '{job.status}'"
            )
        
        # Reset job status
        job_repo.update_job_status(
            db, job_id, "pending",
            {
                "started_at": None,
                "completed_at": None,
                "error_message": None
            }
        )
        
        # Reset failed pages to pending
        reset_count = page_repo.reset_failed_pages(db, job_id)
        
        return {
            "message": "Crawl job reset for retry",
            "reset_pages": reset_count,
            "job_id": job_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrying crawl job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retry crawl job: {str(e)}"
        )
        
@router.get("/storage-stats")
async def get_storage_stats(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get storage statistics for the current client."""
    try:
        from app.repositories.knowledge_repository import (
            DocumentSourceRepository, 
            KnowledgeItemRepository
        )
        
        doc_repo = DocumentSourceRepository()
        item_repo = KnowledgeItemRepository()
        crawl_repo = WebsiteCrawlJobRepository()
        
        # Get counts and sizes
        documents = doc_repo.get_by_client_id(db, current_client.client_id)
        total_documents = len(documents)
        total_file_size = sum(doc.file_size or 0 for doc in documents)
        
        items = item_repo.get_by_client_id(db, current_client.client_id)
        total_items = len(items)
        
        crawl_jobs = crawl_repo.get_by_client_id(db, current_client.client_id)
        total_crawled_pages = sum(job.pages_crawled or 0 for job in crawl_jobs)
        
        return {
            "total_documents": total_documents,
            "total_file_size": total_file_size,
            "total_knowledge_items": total_items,
            "total_crawled_pages": total_crawled_pages,
            "total_crawl_jobs": len(crawl_jobs)
        }
    except Exception as e:
        logger.exception(f"Error getting storage stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch storage statistics"
        )
                                
@router.post("/analyze")
async def analyze_website(
    analyze_data: Dict[str, Any] = Body(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Analyze a website and return discoverable pages before crawling."""
    try:
        url = analyze_data.get("url")
        if not url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL is required"
            )
        
        # Normalize URL
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        logger.info(f"Analyzing website: {url}")
        
        # Simple discovery approach - just use the URL and basic logic
        discovered_pages = []
        
        try:
            import aiohttp
            from bs4 import BeautifulSoup
            from urllib.parse import urljoin, urlparse
            
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                headers = {
                    "User-Agent": "Customate.ai Web Crawler (https://customate.ai)"
                }
                
                try:
                    async with session.get(url, headers=headers) as response:
                        if response.status == 200:
                            html = await response.text()
                            soup = BeautifulSoup(html, 'html.parser')
                            
                            # Add homepage first
                            page_title = soup.title.string.strip() if soup.title and soup.title.string else url
                            discovered_pages.append({
                                "url": url,
                                "title": page_title,
                                "priority": "CRITICAL",
                                "estimated_size": 5000,
                                "page_type": "homepage",
                                "selected": True
                            })
                            
                            # Find all links on the homepage
                            links = soup.find_all('a', href=True)
                            base_domain = urlparse(url).netloc
                            seen_urls = {url}
                            
                            for link in links:
                                href = link.get('href')
                                if not href:
                                    continue
                                    
                                # Convert relative URLs to absolute
                                full_url = urljoin(url, href)
                                
                                # Skip if not same domain
                                if urlparse(full_url).netloc != base_domain:
                                    continue
                                    
                                # Skip if already seen
                                if full_url in seen_urls:
                                    continue
                                    
                                # Skip common non-content URLs
                                if any(skip in full_url.lower() for skip in ['#', 'javascript:', 'mailto:', 'tel:', '.jpg', '.png', '.gif', '.pdf']):
                                    continue
                                
                                seen_urls.add(full_url)
                                
                                # Get link text
                                link_text = link.get_text(strip=True)
                                page_title = link_text if link_text else full_url.split('/')[-1] or "Page"
                                
                                # Determine priority based on URL patterns
                                priority = "MEDIUM"
                                page_type = "page"
                                
                                url_lower = full_url.lower()
                                if any(pattern in url_lower for pattern in ['/about', '/contact', '/services']):
                                    priority = "HIGH"
                                    page_type = "about"
                                elif any(pattern in url_lower for pattern in ['/blog', '/news', '/article', '/post']):
                                    priority = "HIGH"
                                    page_type = "article"
                                elif any(pattern in url_lower for pattern in ['/product', '/shop', '/store']):
                                    priority = "HIGH"
                                    page_type = "product"
                                elif any(pattern in url_lower for pattern in ['/docs', '/help', '/support', '/faq']):
                                    priority = "HIGH"
                                    page_type = "docs"
                                
                                discovered_pages.append({
                                    "url": full_url,
                                    "title": page_title[:100],  # Limit title length
                                    "priority": priority,
                                    "estimated_size": 5000,
                                    "page_type": page_type,
                                    "selected": True
                                })
                                
                                # Limit to prevent too many pages
                                if len(discovered_pages) >= 25:
                                    break
                        else:
                            logger.warning(f"Failed to fetch homepage, status: {response.status}")
                            
                except Exception as fetch_error:
                    logger.error(f"Error fetching homepage: {fetch_error}")
                    # Fallback: just add the homepage
                    discovered_pages = [{
                        "url": url,
                        "title": url,
                        "priority": "CRITICAL",
                        "estimated_size": 5000,
                        "page_type": "homepage",
                        "selected": True
                    }]
                    
        except Exception as discovery_error:
            logger.error(f"Error in page discovery: {discovery_error}")
            # Fallback: just add the homepage
            discovered_pages = [{
                "url": url,
                "title": url,
                "priority": "CRITICAL",
                "estimated_size": 5000,
                "page_type": "homepage",
                "selected": True
            }]
        
        # If we still have no pages, add homepage as fallback
        if not discovered_pages:
            discovered_pages = [{
                "url": url,
                "title": url,
                "priority": "CRITICAL",
                "estimated_size": 5000,
                "page_type": "homepage",
                "selected": True
            }]
        
        logger.info(f"Analysis complete. Found {len(discovered_pages)} pages")
        
        return {
            "url": url,
            "total_pages_found": len(discovered_pages),
            "estimated_total_size": 5000 * len(discovered_pages),
            "has_sitemap": False,  # We can enhance this later
            "recommended_depth": 3,
            "discovered_pages": discovered_pages,
            "analysis_summary": {
                "homepage_accessible": len(discovered_pages) > 0,
                "sitemap_found": False,
                "robots_txt_found": False,
                "estimated_crawl_time": f"{len(discovered_pages) * 3} seconds"
            }
        }
        
    except Exception as e:
        logger.exception(f"Error analyzing website: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze website: {str(e)}"
        )
        
@router.post("/crawl/analyze")
async def analyze_website(
    analyze_data: Dict[str, Any] = Body(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Analyze a website and return discoverable pages before crawling."""
    try:
        url = analyze_data.get("url")
        if not url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL is required"
            )
        
        # Normalize URL
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        logger.info(f"Analyzing website: {url}")
        
        # Simple discovery approach - just use the URL and basic logic
        discovered_pages = []
        
        try:
            import aiohttp
            from bs4 import BeautifulSoup
            from urllib.parse import urljoin, urlparse
            
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                headers = {
                    "User-Agent": "Customate.ai Web Crawler (https://customate.ai)"
                }
                
                try:
                    async with session.get(url, headers=headers) as response:
                        if response.status == 200:
                            html = await response.text()
                            soup = BeautifulSoup(html, 'html.parser')
                            
                            # Add homepage first
                            page_title = soup.title.string.strip() if soup.title and soup.title.string else url
                            discovered_pages.append({
                                "url": url,
                                "title": page_title,
                                "priority": "CRITICAL",
                                "estimated_size": 5000,
                                "page_type": "homepage",
                                "selected": True
                            })
                            
                            # Find all links on the homepage
                            links = soup.find_all('a', href=True)
                            base_domain = urlparse(url).netloc
                            seen_urls = {url}
                            
                            for link in links:
                                href = link.get('href')
                                if not href:
                                    continue
                                    
                                # Convert relative URLs to absolute
                                full_url = urljoin(url, href)
                                
                                # Skip if not same domain
                                if urlparse(full_url).netloc != base_domain:
                                    continue
                                    
                                # Skip if already seen
                                if full_url in seen_urls:
                                    continue
                                    
                                # Skip common non-content URLs
                                if any(skip in full_url.lower() for skip in ['#', 'javascript:', 'mailto:', 'tel:', '.jpg', '.png', '.gif', '.pdf']):
                                    continue
                                
                                seen_urls.add(full_url)
                                
                                # Get link text
                                link_text = link.get_text(strip=True)
                                page_title = link_text if link_text else full_url.split('/')[-1] or "Page"
                                
                                # Determine priority based on URL patterns
                                priority = "MEDIUM"
                                page_type = "page"
                                
                                url_lower = full_url.lower()
                                if any(pattern in url_lower for pattern in ['/about', '/contact', '/services']):
                                    priority = "HIGH"
                                    page_type = "about"
                                elif any(pattern in url_lower for pattern in ['/blog', '/news', '/article', '/post']):
                                    priority = "HIGH"
                                    page_type = "article"
                                elif any(pattern in url_lower for pattern in ['/product', '/shop', '/store']):
                                    priority = "HIGH"
                                    page_type = "product"
                                elif any(pattern in url_lower for pattern in ['/docs', '/help', '/support', '/faq']):
                                    priority = "HIGH"
                                    page_type = "docs"
                                
                                discovered_pages.append({
                                    "url": full_url,
                                    "title": page_title[:100],  # Limit title length
                                    "priority": priority,
                                    "estimated_size": 5000,
                                    "page_type": page_type,
                                    "selected": True
                                })
                                
                                # Limit to prevent too many pages
                                if len(discovered_pages) >= 25:
                                    break
                        else:
                            logger.warning(f"Failed to fetch homepage, status: {response.status}")
                            
                except Exception as fetch_error:
                    logger.error(f"Error fetching homepage: {fetch_error}")
                    # Fallback: just add the homepage
                    discovered_pages = [{
                        "url": url,
                        "title": url,
                        "priority": "CRITICAL",
                        "estimated_size": 5000,
                        "page_type": "homepage",
                        "selected": True
                    }]
                    
        except Exception as discovery_error:
            logger.error(f"Error in page discovery: {discovery_error}")
            # Fallback: just add the homepage
            discovered_pages = [{
                "url": url,
                "title": url,
                "priority": "CRITICAL",
                "estimated_size": 5000,
                "page_type": "homepage",
                "selected": True
            }]
        
        # If we still have no pages, add homepage as fallback
        if not discovered_pages:
            discovered_pages = [{
                "url": url,
                "title": url,
                "priority": "CRITICAL",
                "estimated_size": 5000,
                "page_type": "homepage",
                "selected": True
            }]
        
        logger.info(f"Analysis complete. Found {len(discovered_pages)} pages")
        
        return {
            "url": url,
            "total_pages_found": len(discovered_pages),
            "estimated_total_size": 5000 * len(discovered_pages),
            "has_sitemap": False,  # We can enhance this later
            "recommended_depth": 3,
            "discovered_pages": discovered_pages,
            "analysis_summary": {
                "homepage_accessible": len(discovered_pages) > 0,
                "sitemap_found": False,
                "robots_txt_found": False,
                "estimated_crawl_time": f"{len(discovered_pages) * 3} seconds"
            }
        }
        
    except Exception as e:
        logger.exception(f"Error analyzing website: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze website: {str(e)}"
        )        