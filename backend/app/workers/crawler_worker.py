# backend/app/workers/crawler_worker.py - Updated to handle metrics updates
import asyncio
import time
from sqlalchemy.orm import Session
import logging

from app.core.database.session import SessionLocal
from app.repositories.crawl_repository import WebsiteCrawlJobRepository, CrawledPageRepository
from app.services.knowledge.web_crawler_service import WebCrawlerService
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.llm.deepseek_service import DeepSeekService
from app.services.analytics.usage_tracker import UsageTracker  # Import UsageTracker

logger = logging.getLogger(__name__)

class CrawlerWorker:
    """
    Background worker for processing website crawl jobs.
    
    This worker:
    1. Polls for pending crawl jobs
    2. Starts processing them one by one
    3. Handles retries and errors
    """
    
    def __init__(self, poll_interval: int = 30):
        """
        Initialize the crawler worker.
        
        Args:
            poll_interval: Interval in seconds to poll for new jobs
        """
        self.poll_interval = poll_interval
        self.job_repo = WebsiteCrawlJobRepository()
        self.page_repo = CrawledPageRepository()
        self.running = False
        self.active_jobs = set()  # Track currently active job IDs
    
    async def start(self):
        """Start the worker."""
        self.running = True
        logger.info("Crawler worker started")
        
        while self.running:
            try:
                # Get pending jobs
                db = SessionLocal()
                try:
                    # Get jobs that are pending or stuck in "in_progress" for a long time
                    pending_jobs = self.job_repo.get_active_jobs(db, limit=5)
                    
                    if pending_jobs:
                        logger.info(f"Found {len(pending_jobs)} pending crawl jobs")
                        
                        # Process jobs in parallel with a reasonable limit
                        job_tasks = []
                        for job in pending_jobs:
                            # Skip jobs that are already being processed
                            if job.job_id in self.active_jobs:
                                continue
                                
                            # Add to active jobs
                            self.active_jobs.add(job.job_id)
                            
                            # Process the job
                            task = asyncio.create_task(
                                self._process_job(job.job_id)
                            )
                            job_tasks.append(task)
                        
                        # Wait for jobs to complete before next poll
                        # But allow cancellation of the worker
                        if job_tasks:
                            await asyncio.gather(*job_tasks)
                    
                finally:
                    db.close()
                
                # Wait for next poll
                await asyncio.sleep(self.poll_interval)
                
            except Exception as e:
                logger.exception(f"Error in crawler worker main loop: {str(e)}")
                await asyncio.sleep(self.poll_interval)
    
    async def _process_job(self, job_id: str):
        """
        Process a single crawl job with error handling.
        
        Args:
            job_id: The ID of the job to process
        """
        logger.info(f"Starting to process job {job_id}")
        db = None
        
        try:
            # Create a new database session for this job
            db = SessionLocal()
            
            # Initialize services
            llm_service = DeepSeekService()
            embedding_service = EmbeddingService(llm_service)
            crawler_service = WebCrawlerService(db, embedding_service)
            
            # Get the job
            job = self.job_repo.get_by_job_id(db, job_id)
            
            if not job:
                logger.error(f"Job {job_id} not found")
                return
                
            # If job is in pending state, start it
            if job.status == "pending":
                logger.info(f"Starting job {job_id} for {job.base_url}")
                await crawler_service.start_crawl_job(job_id)
            
            # If job is already in progress, it might be stuck
            elif job.status == "in_progress":
                # Check if job has been running for too long (over 2 hours)
                if job.started_at:
                    now = time.time()
                    started_time = job.started_at.timestamp()
                    
                    if now - started_time > 7200:  # 2 hours
                        logger.warning(f"Job {job_id} appears to be stuck. Restarting processing.")
                        
                        # Update job status to re-trigger processing
                        job = self.job_repo.update_job_status(
                            db, job_id, "pending",
                            {"error_message": "Job restarted after being stuck"}
                        )
                        
                        # Start the job again
                        await crawler_service.start_crawl_job(job_id)
            
            # If job is completed, update usage metrics
            elif job.status == "completed":
                try:
                    # Update storage and knowledge metrics
                    usage_tracker = UsageTracker()
                    usage_tracker.update_knowledge_counts(db, job.client_id)
                    usage_tracker._update_storage_usage(db, job.client_id)
                    usage_tracker._update_daily_stats(db, job.client_id)
                    logger.info(f"Updated usage metrics for client {job.client_id} for completed job {job_id}")
                except Exception as metrics_error:
                    logger.error(f"Error updating metrics for completed job {job_id}: {str(metrics_error)}")
        
        except Exception as e:
            logger.exception(f"Error processing job {job_id}: {str(e)}")
            
            try:
                if db:
                    # Mark job as failed if an exception occurred
                    self.job_repo.update_job_status(
                        db, job_id, "failed",
                        {"error_message": f"Worker error: {str(e)}"}
                    )
            except Exception as update_error:
                logger.error(f"Error updating job status: {str(update_error)}")
        
        finally:
            # Remove from active jobs
            self.active_jobs.discard(job_id)
            
            # Close the database session
            if db:
                db.close()
                
            logger.info(f"Finished processing job {job_id}")
    
    def stop(self):
        """Stop the worker."""
        self.running = False
        logger.info("Crawler worker stopping")

# Function to start the worker
async def run_crawler_worker():
    """Start the crawler worker."""
    worker = CrawlerWorker()
    try:
        await worker.start()
    except Exception as e:
        logger.exception(f"Crawler worker failed with error: {str(e)}")

# Command-line entry point
if __name__ == "__main__":
    asyncio.run