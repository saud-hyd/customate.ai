import asyncio
import time
from sqlalchemy.orm import Session
import logging

from app.core.database.session import SessionLocal
from app.repositories.crawl_repository import WebsiteCrawlJobRepository
from app.services.knowledge.web_crawler_service import WebCrawlerService
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.llm.deepseek_service import DeepSeekService

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
        self.running = False
    
    async def start(self):
        """Start the worker."""
        self.running = True
        logger.info("Crawler worker started")
        
        while self.running:
            try:
                # Get pending jobs
                db = SessionLocal()
                try:
                    pending_jobs = self.job_repo.get_active_jobs(db, limit=5)
                    
                    if pending_jobs:
                        logger.info(f"Found {len(pending_jobs)} pending crawl jobs")
                        
                        for job in pending_jobs:
                            # Initialize services
                            llm_service = DeepSeekService()
                            embedding_service = EmbeddingService(llm_service)
                            
                            # Create crawler service
                            crawler_service = WebCrawlerService(db, embedding_service)
                            
                            # Process the job
                            if job.status == "pending":
                                logger.info(f"Starting job {job.job_id} for {job.base_url}")
                                await crawler_service.start_crawl_job(job.job_id)
                            
                            # Wait a bit between jobs to avoid overloading resources
                            await asyncio.sleep(5)
                    
                finally:
                    db.close()
                
                # Wait for next poll
                await asyncio.sleep(self.poll_interval)
                
            except Exception as e:
                logger.exception(f"Error in crawler worker: {str(e)}")
                await asyncio.sleep(self.poll_interval)
    
    def stop(self):
        """Stop the worker."""
        self.running = False
        logger.info("Crawler worker stopped")

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
    asyncio.run(run_crawler_worker())