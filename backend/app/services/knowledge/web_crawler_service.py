import asyncio
import aiohttp
import hashlib
import re
import time
from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.repositories.crawl_repository import WebsiteCrawlJobRepository, CrawledPageRepository
from app.repositories.knowledge_repository import KnowledgeItemRepository, KnowledgeCollectionRepository
from app.domain.knowledge.crawl_entities import WebsiteCrawlJob, CrawledPage
from app.services.knowledge.embedding_service import EmbeddingService
from app.core import logger

class WebCrawlerService:
    """
    Service for crawling websites and adding content to knowledge base.
    
    Features:
    - Configurable crawl depth and page limit
    - URL filtering with include/exclude patterns
    - Content extraction with customizable rules
    - Automatic knowledge item creation
    - Crawl job tracking
    """
    
    def __init__(
        self, 
        db: Session,
        embedding_service: Optional[EmbeddingService] = None
    ):
        self.db = db
        self.job_repo = WebsiteCrawlJobRepository()
        self.page_repo = CrawledPageRepository()
        self.item_repo = KnowledgeItemRepository()
        self.collection_repo = KnowledgeCollectionRepository()
        self.embedding_service = embedding_service
        
        # Default headers for requests
        self.default_headers = {
            "User-Agent": "Customate.ai Web Crawler (https://customate.ai/crawler-info)",
            "Accept": "text/html,application/xhtml+xml,application/xml",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        # Default extraction rules
        self.default_extraction_rules = {
            "title": "title",
            "content": ["article", "main", ".content", "#content", ".post", ".page-content"],
            "exclude": [
                "nav", "header", "footer", "aside", 
                ".navigation", ".menu", ".sidebar", ".footer", 
                ".comments", ".related", ".ads", "script", "style"
            ]
        }
    
    async def create_crawl_job(
        self, 
        client_id: str, 
        base_url: str, 
        collection_id: Optional[str] = None,
        max_pages: int = 100,
        max_depth: int = 3,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        extraction_rules: Optional[Dict[str, Any]] = None
    ) -> WebsiteCrawlJob:
        """
        Create a new website crawl job.
        
        Args:
            client_id: Client ID
            base_url: Website base URL to crawl
            collection_id: Knowledge collection ID to store content
            max_pages: Maximum number of pages to crawl
            max_depth: Maximum depth to crawl
            include_patterns: URL patterns to include
            exclude_patterns: URL patterns to exclude
            extraction_rules: Custom rules for content extraction
            
        Returns:
            Created WebsiteCrawlJob entity
        """
        # Normalize base URL
        if not base_url.startswith(('http://', 'https://')):
            base_url = 'https://' + base_url
        
        if not base_url.endswith('/'):
            base_url += '/'
        
        # Validate collection_id if provided
        if collection_id:
            collection = self.collection_repo.get_by_collection_id(self.db, collection_id)
            if not collection or collection.client_id != client_id:
                # Collection doesn't exist or doesn't belong to the client
                # Create a new collection instead
                collection_id = None
        
        # Create a collection if not provided or invalid
        if not collection_id:
            # Extract domain name for collection name
            domain = urlparse(base_url).netloc
            collection = self.collection_repo.create(self.db, obj_in={
                "client_id": client_id,
                "name": f"Website: {domain}",
                "description": f"Content crawled from {base_url}",
                "type": "website"
            })
            collection_id = collection.collection_id
        
        # Create job
        job_data = {
            "client_id": client_id,
            "collection_id": collection_id,
            "base_url": base_url,
            "max_pages": max_pages,
            "max_depth": max_depth,
            "include_patterns": include_patterns or [],
            "exclude_patterns": exclude_patterns or [],
            "extraction_rules": extraction_rules or self.default_extraction_rules,
            "status": "pending",
            "pages_crawled": 0,
            "pages_processed": 0,
            "pages_failed": 0
        }
        
        job = self.job_repo.create(self.db, obj_in=job_data)
        
        # Create initial page to crawl
        initial_page_data = {
            "job_id": job.job_id,
            "url": base_url,
            "status": "pending",
            "depth": 0
        }
        self.page_repo.create(self.db, obj_in=initial_page_data)
        
        return job
    
    async def start_crawl_job(self, job_id: str) -> bool:
        """
        Start a crawl job.
        
        Args:
            job_id: Job ID
            
        Returns:
            Boolean indicating success
        """
        job = self.job_repo.get_by_job_id(self.db, job_id)
        if not job or job.status != "pending":
            return False
        
        # Update job status
        now = datetime.utcnow()
        self.job_repo.update_job_status(
            self.db,
            job_id,
            "in_progress",
            {"started_at": now}
        )
        
        # Start crawling in a separate task
        asyncio.create_task(self._process_crawl_job(job_id))
        
        return True
    
    async def _process_crawl_job(self, job_id: str) -> None:
        """
        Process a crawl job asynchronously.
        
        Args:
            job_id: Job ID
        """
        job = self.job_repo.get_by_job_id(self.db, job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        logger.info(f"Starting crawl job {job_id} for {job.base_url}")
        
        try:
            # Create a session for all requests
            async with aiohttp.ClientSession(headers=self.default_headers) as session:
                # Set to track URLs we've seen to avoid duplicates
                seen_urls = set()
                
                # While we have pages to crawl and haven't exceeded the limit
                while True:
                    # Get pending pages
                    pending_pages = self.page_repo.get_pending_pages(self.db, job_id, limit=10)
                    
                    if not pending_pages:
                        # No more pages to process
                        break
                    
                    # Update job to get the latest counts
                    job = self.job_repo.get_by_job_id(self.db, job_id)
                    
                    if job.pages_crawled >= job.max_pages:
                        # Reached maximum pages
                        break
                    
                    # Process pages concurrently
                    tasks = []
                    for page in pending_pages:
                        if page.url in seen_urls:
                            # Skip already processed URLs
                            continue
                        
                        seen_urls.add(page.url)
                        task = asyncio.create_task(
                            self._process_page(session, job, page)
                        )
                        tasks.append(task)
                    
                    if tasks:
                        # Wait for all page processing tasks to complete
                        await asyncio.gather(*tasks)
                    else:
                        # No tasks created, we may be stuck in a loop
                        break
            
            # All pages processed, complete the job
            total_pages = len(self.page_repo.get_by_job_id(self.db, job_id))
            
            self.job_repo.update_job_status(
                self.db,
                job_id,
                "completed",
                {
                    "completed_at": datetime.utcnow(),
                    "pages_crawled": total_pages
                }
            )
            
            logger.info(f"Completed crawl job {job_id}, processed {total_pages} pages")
            
        except Exception as e:
            # Handle errors
            logger.exception(f"Error processing crawl job {job_id}: {str(e)}")
            
            self.job_repo.update_job_status(
                self.db,
                job_id,
                "failed",
                {
                    "error_message": str(e),
                    "completed_at": datetime.utcnow()
                }
            )
    
    async def _process_page(
        self, 
        session: aiohttp.ClientSession, 
        job: WebsiteCrawlJob, 
        page: CrawledPage
    ) -> None:
        """
        Process a single page.
        
        Args:
            session: HTTP session
            job: Crawl job
            page: Page to process
        """
        try:
            # Fetch the page
            async with session.get(page.url, allow_redirects=True, timeout=30) as response:
                if response.status != 200:
                    # Update page status
                    self.page_repo.update(
                        self.db,
                        db_obj=page,
                        obj_in={"status": "failed", "title": f"HTTP Error: {response.status}"}
                    )
                    
                    # Increment failed count
                    self.job_repo.increment_counter(self.db, job.job_id, "pages_failed")
                    return
                
                # Get content type
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type.lower():
                    # Only process HTML pages
                    self.page_repo.update(
                        self.db,
                        db_obj=page,
                        obj_in={"status": "skipped", "title": f"Not HTML: {content_type}"}
                    )
                    return
                
                # Read the HTML content
                html_content = await response.text()
                
                # Process the page content
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Extract title
                title = self._extract_title(soup, job.extraction_rules)
                
                # Extract content
                extracted_content = self._extract_content(soup, job.extraction_rules)
                
                if not extracted_content:
                    # No content extracted
                    self.page_repo.update(
                        self.db,
                        db_obj=page,
                        obj_in={"status": "skipped", "title": title or "No content extracted"}
                    )
                    return
                
                # Calculate content hash for deduplication
                content_hash = hashlib.sha256(extracted_content.encode('utf-8')).hexdigest()
                
                # Update page
                self.page_repo.update(
                    self.db,
                    db_obj=page,
                    obj_in={
                        "status": "success", 
                        "title": title,
                        "content_hash": content_hash
                    }
                )
                
                # Create knowledge item
                knowledge_item = self._create_knowledge_item(
                    job, 
                    page, 
                    title, 
                    extracted_content
                )
                
                if knowledge_item:
                    # Update page with knowledge item reference
                    self.page_repo.update(
                        self.db,
                        db_obj=page,
                        obj_in={"knowledge_item_id": knowledge_item.item_id}
                    )
                    
                    # Generate embeddings if service is available
                    if self.embedding_service:
                        await self.embedding_service.create_embeddings_for_item(
                            self.db, 
                            knowledge_item.item_id
                        )
                
                # Increment processed count
                self.job_repo.increment_counter(self.db, job.job_id, "pages_processed")
                
                # Extract links if we're below max depth
                if page.depth < job.max_depth:
                    await self._extract_and_queue_links(job, page, soup)
                
        except Exception as e:
            # Handle errors
            logger.exception(f"Error processing page {page.url}: {str(e)}")
            
            self.page_repo.update(
                self.db,
                db_obj=page,
                obj_in={"status": "failed", "title": f"Error: {str(e)}"}
            )
            
            # Increment failed count
            self.job_repo.increment_counter(self.db, job.job_id, "pages_failed")
    
    def _extract_title(self, soup: BeautifulSoup, rules: Dict[str, Any]) -> str:
        """
        Extract page title using rules.
        
        Args:
            soup: BeautifulSoup object
            rules: Extraction rules
            
        Returns:
            Extracted title
        """
        title = None
        
        # Get title from rules
        title_selector = rules.get("title", "title")
        title_element = soup.select_one(title_selector)
        
        if title_element:
            title = title_element.text.strip()
        
        # Fallback to meta title
        if not title:
            meta_title = soup.find("meta", property="og:title")
            if meta_title and meta_title.get("content"):
                title = meta_title["content"].strip()
        
        # Fallback to document title
        if not title and soup.title:
            title = soup.title.string.strip()
        
        return title or "Untitled Page"
    
    def _extract_content(self, soup: BeautifulSoup, rules: Dict[str, Any]) -> str:
        """
        Extract page content using rules.
        
        Args:
            soup: BeautifulSoup object
            rules: Extraction rules
            
        Returns:
            Extracted content as plain text
        """
        # Make a copy of soup to modify
        content_soup = BeautifulSoup(str(soup), 'html.parser')
        
        # Remove excluded elements
        exclude_selectors = rules.get("exclude", [])
        for selector in exclude_selectors:
            for element in content_soup.select(selector):
                element.decompose()
        
        # Try to find main content using selectors
        content_selectors = rules.get("content", [])
        if isinstance(content_selectors, str):
            content_selectors = [content_selectors]
        
        main_content = None
        
        for selector in content_selectors:
            content_element = content_soup.select_one(selector)
            if content_element:
                main_content = content_element
                break
        
        # If no content found, use body as fallback
        if not main_content:
            main_content = content_soup.body
        
        if not main_content:
            return ""
        
        # Get text content
        text = main_content.get_text(separator='\n', strip=True)
        
        # Clean up the text
        text = re.sub(r'\n+', '\n', text)  # Remove multiple newlines
        text = re.sub(r'\s+', ' ', text)    # Normalize whitespace
        
        return text.strip()
    
    def _create_knowledge_item(
        self, 
        job: WebsiteCrawlJob, 
        page: CrawledPage, 
        title: str, 
        content: str
    ) -> Any:
        """
        Create a knowledge item from the page content.
        
        Args:
            job: Crawl job
            page: Crawled page
            title: Page title
            content: Extracted content
            
        Returns:
            Created knowledge item
        """
        # Check if we have enough content
        if len(content) < 50:  # Arbitrary minimum content length
            return None
        
        # Create knowledge item
        item_data = {
            "collection_id": job.collection_id,
            "title": title,
            "content": content,
            "source_document_id": None,  # No document source for website content
            "item_metadata": {
                "source_url": page.url,
                "crawl_job_id": job.job_id,
                "page_id": page.page_id,
                "crawled_at": datetime.utcnow().isoformat()
            }
        }
        
        return self.item_repo.create(self.db, obj_in=item_data)
    
    async def _extract_and_queue_links(
        self, 
        job: WebsiteCrawlJob, 
        page: CrawledPage, 
        soup: BeautifulSoup
    ) -> None:
        """
        Extract links from page and queue for crawling.
        
        Args:
            job: Crawl job
            page: Current page
            soup: BeautifulSoup object
        """
        # Get all links
        links = soup.find_all('a', href=True)
        base_url = job.base_url
        base_domain = urlparse(base_url).netloc
        
        # Batch create pages to avoid too many DB calls
        new_pages = []
        
        for link in links:
            href = link['href'].strip()
            
            # Skip empty, anchor, or javascript links
            if not href or href.startswith('#') or href.startswith('javascript:'):
                continue
            
            # Resolve relative URLs
            full_url = urljoin(page.url, href)
            
            # Parse URL
            parsed_url = urlparse(full_url)
            
            # Skip non-HTTP(S) URLs
            if parsed_url.scheme not in ('http', 'https'):
                continue
            
            # Skip URLs from different domains
            if parsed_url.netloc != base_domain:
                continue
            
            # Remove fragments
            clean_url = parsed_url._replace(fragment='').geturl()
            
            # Check include/exclude patterns
            if job.include_patterns and not self._matches_any_pattern(clean_url, job.include_patterns):
                continue
            
            if job.exclude_patterns and self._matches_any_pattern(clean_url, job.exclude_patterns):
                continue
            
            # Check if already in database
            existing_page = self.page_repo.get_by_url_and_job(self.db, clean_url, job.job_id)
            if existing_page:
                continue
            
            # Check if we've reached the limit
            if job.pages_crawled >= job.max_pages:
                break
            
            # Create new page
            new_page_data = {
                "job_id": job.job_id,
                "url": clean_url,
                "status": "pending",
                "depth": page.depth + 1
            }
            
            new_pages.append(new_page_data)
            
            # Increment crawled count
            self.job_repo.increment_counter(self.db, job.job_id, "pages_crawled")
        
        # Batch create pages
        for page_data in new_pages:
            self.page_repo.create(self.db, obj_in=page_data)
    
    def _matches_any_pattern(self, url: str, patterns: List[str]) -> bool:
        """
        Check if URL matches any pattern.
        
        Args:
            url: URL to check
            patterns: List of regex patterns
            
        Returns:
            Boolean indicating if URL matches any pattern
        """
        return any(re.search(pattern, url) for pattern in patterns)
    
    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get job status.
        
        Args:
            job_id: Job ID
            
        Returns:
            Dictionary with job status
        """
        job = self.job_repo.get_by_job_id(self.db, job_id)
        if not job:
            return {"error": "Job not found"}
        
        # Get page counts
        page_counts = self.page_repo.get_pages_count_by_status(self.db, job_id)
        
        return {
            "job_id": job.job_id,
            "status": job.status,
            "base_url": job.base_url,
            "max_pages": job.max_pages,
            "pages_crawled": job.pages_crawled,
            "pages_processed": job.pages_processed,
            "pages_failed": job.pages_failed,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "created_at": job.created_at.isoformat(),
            "page_stats": page_counts,
            "error_message": job.error_message
        }
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a crawl job.
        
        Args:
            job_id: Job ID
            
        Returns:
            Boolean indicating success
        """
        job = self.job_repo.get_by_job_id(self.db, job_id)
        if not job or job.status not in ["pending", "in_progress"]:
            return False
        
        # Update job status
        self.job_repo.update_job_status(
            self.db,
            job_id,
            "cancelled",
            {
                "completed_at": datetime.utcnow(),
                "error_message": "Job cancelled by user"
            }
        )
        
        return True