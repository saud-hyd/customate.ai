# backend/app/services/knowledge/web_crawler_service.py
import asyncio
import aiohttp
import hashlib
import re
import time
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from dataclasses import dataclass
from enum import Enum

from app.repositories.crawl_repository import WebsiteCrawlJobRepository, CrawledPageRepository
from app.repositories.knowledge_repository import KnowledgeItemRepository, KnowledgeCollectionRepository
from app.domain.knowledge.crawl_entities import WebsiteCrawlJob, CrawledPage
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.analytics.usage_tracker import UsageTracker  
from app.services.knowledge.content_extractor import EnhancedContentExtractor
from app.services.subscription.stripe_service import PLAN_LIMITS
from app.repositories.client_repository import SubscriptionRepository
from app.core import logger

class PagePriority(Enum):
    """Page priority levels for intelligent crawling"""
    CRITICAL = 1    # Homepage, main sections, sitemap pages
    HIGH = 2        # Important content pages, category pages
    MEDIUM = 3      # Regular content pages
    LOW = 4         # Secondary pages, utility pages

@dataclass
class PrioritizedPage:
    """Enhanced page object with priority and metadata"""
    url: str
    priority: PagePriority
    depth: int = 0
    discovered_from: str = "unknown"
    estimated_size: int = 5000  # Estimated content size in bytes
    page_type: str = "unknown"  # homepage, category, article, etc.
    sitemap_priority: float = 0.5  # from sitemap

class WebCrawlerService:
    """
    Service for crawling websites and adding content to knowledge base.
    
    Enhanced Features:
    - Intelligent auto-crawling based on storage limits
    - Page prioritization using multiple strategies
    - Sitemap and robots.txt integration
    - Storage-aware crawling
    - Real-time progress tracking
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
        self.usage_tracker = UsageTracker()
        
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
        
        # Page type patterns for priority classification
        self.page_type_patterns = {
            'homepage': [r'^/$', r'^/index\.(html?|php)$', r'^/home/?$'],
            'category': [r'/category/', r'/categories/', r'/section/', r'/topics/'],
            'article': [r'/article/', r'/post/', r'/blog/', r'/news/'],
            'product': [r'/product/', r'/item/', r'/p/'],
            'about': [r'/about/', r'/company/', r'/team/'],
            'contact': [r'/contact/', r'/support/'],
            'docs': [r'/docs/', r'/documentation/', r'/help/'],
            'api': [r'/api/', r'/developers/'],
            'legal': [r'/terms/', r'/privacy/', r'/legal/'],
            'sitemap': [r'/sitemap\.xml$', r'/sitemaps/', r'/sitemap/'],
            'robots': [r'/robots\.txt$']
        }
        
        # Priority mapping for different page types
        self.type_priority_map = {
            'homepage': PagePriority.CRITICAL,
            'sitemap': PagePriority.CRITICAL,
            'category': PagePriority.HIGH,
            'article': PagePriority.HIGH,
            'product': PagePriority.HIGH,
            'docs': PagePriority.HIGH,
            'about': PagePriority.MEDIUM,
            'contact': PagePriority.MEDIUM,
            'api': PagePriority.MEDIUM,
            'legal': PagePriority.LOW,
            'robots': PagePriority.LOW
        }

    async def create_intelligent_crawl_job(
        self, 
        client_id: str, 
        base_url: str, 
        collection_id: Optional[str] = None,
        specific_pages: Optional[List[str]] = None,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        extraction_rules: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create an intelligent crawl job that automatically determines crawl scope
        based on storage limits and page importance.
        
        Args:
            client_id: Client ID
            base_url: Website base URL to crawl
            collection_id: Knowledge collection ID
            specific_pages: List of specific pages to prioritize
            include_patterns: URL patterns to include
            exclude_patterns: URL patterns to exclude
            extraction_rules: Custom extraction rules
            
        Returns:
            Enhanced crawl job with intelligent parameters
        """
        # Calculate available storage and determine crawl scope
        crawl_params = await self._calculate_intelligent_crawl_params(client_id, base_url)
        
        # Create enhanced crawl job
        job = await self.create_crawl_job(
            client_id=client_id,
            base_url=base_url,
            collection_id=collection_id,
            max_pages=crawl_params['max_pages'],
            max_depth=crawl_params['max_depth'],
            include_patterns=include_patterns,
            exclude_patterns=exclude_patterns,
            extraction_rules=extraction_rules
        )
        
        # Store intelligent crawl metadata
        await self._store_intelligent_crawl_metadata(job.job_id, {
            'crawl_strategy': 'intelligent',
            'storage_aware': True,
            'page_prioritization': True,
            'specific_pages': specific_pages or [],
            'estimated_storage_usage': crawl_params['estimated_storage'],
            'available_storage': crawl_params['available_storage'],
            'priority_pages_count': crawl_params['priority_pages_count'],
            'discovered_pages': crawl_params.get('discovered_pages', [])
        })
        
        return {
            'job': job,
            'crawl_params': crawl_params,
            'strategy': 'intelligent',
            'discovered_pages': crawl_params.get('discovered_pages', [])
        }

    async def _calculate_intelligent_crawl_params(
        self, 
        client_id: str, 
        base_url: str
    ) -> Dict[str, Any]:
        """
        Calculate intelligent crawl parameters based on storage limits and site analysis
        """
        # Get storage information
        storage_info = await self._get_storage_info(client_id)
        available_storage = storage_info['available_bytes']
        
        # Perform site analysis
        site_analysis = await self._analyze_website_structure(base_url)
        
        # Calculate optimal crawl parameters
        avg_page_size = site_analysis.get('avg_page_size', 5000)  # 5KB default
        max_pages = min(
            int(available_storage * 0.8 / avg_page_size),  # Use 80% of available storage
            site_analysis.get('total_pages_estimate', 100),  # Don't exceed site size
            500  # Hard limit
        )
        
        # Ensure minimum crawl size
        max_pages = max(max_pages, 5)
        
        # Calculate optimal depth based on site structure
        max_depth = min(
            site_analysis.get('recommended_depth', 3),
            5  # Hard limit
        )
        
        return {
            'max_pages': max_pages,
            'max_depth': max_depth,
            'estimated_storage': max_pages * avg_page_size,
            'available_storage': available_storage,
            'priority_pages_count': site_analysis.get('priority_pages_count', 0),
            'discovered_pages': site_analysis.get('discovered_pages', []),
            'site_structure': site_analysis
        }

    async def _get_storage_info(self, client_id: str) -> Dict[str, Any]:
        """Get current storage usage and limits"""
        try:
            # Get subscription info
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(self.db, client_id)
            plan_type = subscription.plan_type if subscription else "free"
            
            # Get plan storage limit
            plan_limits = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])
            storage_limit_bytes = int(plan_limits["storage_limit_mb"] * 1024 * 1024)
            
            # Get current storage usage
            self.usage_tracker._update_storage_usage(self.db, client_id)
            
            from app.repositories.analytics_repository import StorageUsageRepository
            storage_repo = StorageUsageRepository()
            current_storage = storage_repo.get_latest(self.db, client_id)
            current_usage_bytes = current_storage.total_bytes if current_storage else 0
            
            # Calculate available storage
            available_bytes = max(0, storage_limit_bytes - current_usage_bytes)
            
            return {
                'current_usage_bytes': current_usage_bytes,
                'storage_limit_bytes': storage_limit_bytes,
                'available_bytes': available_bytes,
                'usage_percentage': (current_usage_bytes / storage_limit_bytes * 100) if storage_limit_bytes > 0 else 0,
                'plan_type': plan_type
            }
        except Exception as e:
            logger.error(f"Error getting storage info: {str(e)}")
            return {
                'current_usage_bytes': 0,
                'storage_limit_bytes': 500000,  # 500KB default
                'available_bytes': 500000,
                'usage_percentage': 0,
                'plan_type': 'free'
            }

    async def _analyze_website_structure(self, base_url: str) -> Dict[str, Any]:
        """
        Analyze website structure to determine optimal crawl parameters
        """
        try:
            async with aiohttp.ClientSession(headers=self.default_headers) as session:
                discovered_pages = []
                priority_pages_count = 0
                
                # Try to get sitemap
                sitemap_pages = await self._get_sitemap_pages(session, base_url)
                if sitemap_pages:
                    discovered_pages.extend(sitemap_pages)
                    priority_pages_count += len([p for p in sitemap_pages if p.priority in [PagePriority.CRITICAL, PagePriority.HIGH]])
                
                # Try to get robots.txt
                robots_info = await self._get_robots_info(session, base_url)
                
                # Analyze homepage to estimate site structure
                homepage_analysis = await self._analyze_homepage(session, base_url)
                
                # Estimate total pages and average size
                total_pages_estimate = max(
                    len(sitemap_pages) if sitemap_pages else 0,
                    homepage_analysis.get('estimated_total_pages', 50)
                )
                
                avg_page_size = homepage_analysis.get('avg_page_size', 5000)
                
                # Determine recommended depth
                recommended_depth = 3
                if total_pages_estimate > 100:
                    recommended_depth = 4
                elif total_pages_estimate > 500:
                    recommended_depth = 5
                
                return {
                    'total_pages_estimate': total_pages_estimate,
                    'avg_page_size': avg_page_size,
                    'recommended_depth': recommended_depth,
                    'priority_pages_count': priority_pages_count,
                    'has_sitemap': len(sitemap_pages) > 0 if sitemap_pages else False,
                    'robots_info': robots_info,
                    'discovered_pages': [p.url for p in discovered_pages[:20]],  # Return top 20 for preview
                    'homepage_analysis': homepage_analysis
                }
        except Exception as e:
            logger.error(f"Error analyzing website structure: {str(e)}")
            return {
                'total_pages_estimate': 50,
                'avg_page_size': 5000,
                'recommended_depth': 3,
                'priority_pages_count': 0,
                'has_sitemap': False,
                'robots_info': {},
                'discovered_pages': [],
                'homepage_analysis': {}
            }

    async def _get_sitemap_pages(self, session: aiohttp.ClientSession, base_url: str) -> List[PrioritizedPage]:
        """Get pages from sitemap.xml"""
        try:
            sitemap_urls = [
                urljoin(base_url, '/sitemap.xml'),
                urljoin(base_url, '/sitemap_index.xml'),
                urljoin(base_url, '/sitemaps/sitemap.xml')
            ]
            
            pages = []
            
            for sitemap_url in sitemap_urls:
                try:
                    async with session.get(sitemap_url, timeout=10) as response:
                        if response.status == 200:
                            content = await response.text()
                            pages.extend(self._parse_sitemap_xml(content, base_url))
                            break  # Found a sitemap, stop trying others
                except Exception as e:
                    logger.debug(f"Failed to fetch sitemap {sitemap_url}: {str(e)}")
                    continue
            
            return pages
        except Exception as e:
            logger.error(f"Error getting sitemap pages: {str(e)}")
            return []

    def _parse_sitemap_xml(self, xml_content: str, base_url: str) -> List[PrioritizedPage]:
        """Parse sitemap XML and return prioritized pages"""
        try:
            pages = []
            root = ET.fromstring(xml_content)
            
            # Handle different sitemap namespaces
            namespaces = {
                'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                'default': 'http://www.sitemaps.org/schemas/sitemap/0.9'
            }
            
            # Look for URL elements
            for url_elem in root.findall('.//sm:url', namespaces) or root.findall('.//url'):
                try:
                    loc_elem = url_elem.find('sm:loc', namespaces) or url_elem.find('loc')
                    if loc_elem is not None:
                        url = loc_elem.text
                        
                        # Get priority if available
                        priority_elem = url_elem.find('sm:priority', namespaces) or url_elem.find('priority')
                        sitemap_priority = float(priority_elem.text) if priority_elem is not None else 0.5
                        
                        # Determine page type and priority
                        page_type = self._classify_page_type(url)
                        priority = self._get_page_priority(page_type, sitemap_priority)
                        
                        pages.append(PrioritizedPage(
                            url=url,
                            priority=priority,
                            page_type=page_type,
                            sitemap_priority=sitemap_priority,
                            discovered_from="sitemap"
                        ))
                except Exception as e:
                    logger.debug(f"Error parsing sitemap URL element: {str(e)}")
                    continue
            
            # Sort by priority and sitemap priority
            pages.sort(key=lambda p: (p.priority.value, -p.sitemap_priority))
            
            return pages
        except Exception as e:
            logger.error(f"Error parsing sitemap XML: {str(e)}")
            return []

    async def _get_robots_info(self, session: aiohttp.ClientSession, base_url: str) -> Dict[str, Any]:
        """Get information from robots.txt"""
        try:
            robots_url = urljoin(base_url, '/robots.txt')
            async with session.get(robots_url, timeout=10) as response:
                if response.status == 200:
                    content = await response.text()
                    return self._parse_robots_txt(content)
        except Exception as e:
            logger.debug(f"Error getting robots.txt: {str(e)}")
        
        return {}

    def _parse_robots_txt(self, content: str) -> Dict[str, Any]:
        """Parse robots.txt content"""
        try:
            lines = content.strip().split('\n')
            sitemaps = []
            disallowed_paths = []
            
            for line in lines:
                line = line.strip()
                if line.lower().startswith('sitemap:'):
                    sitemap_url = line.split(':', 1)[1].strip()
                    sitemaps.append(sitemap_url)
                elif line.lower().startswith('disallow:'):
                    path = line.split(':', 1)[1].strip()
                    if path:
                        disallowed_paths.append(path)
            
            return {
                'sitemaps': sitemaps,
                'disallowed_paths': disallowed_paths
            }
        except Exception as e:
            logger.error(f"Error parsing robots.txt: {str(e)}")
            return {}

    async def _analyze_homepage(self, session: aiohttp.ClientSession, base_url: str) -> Dict[str, Any]:
        """Analyze homepage to estimate site structure"""
        try:
            async with session.get(base_url, timeout=15) as response:
                if response.status == 200:
                    content = await response.text()
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    # Count internal links
                    internal_links = self._count_internal_links(soup, base_url)
                    
                    # Estimate page size
                    page_size = len(content.encode('utf-8'))
                    
                    # Estimate total pages based on navigation structure
                    estimated_total_pages = max(50, min(internal_links * 2, 500))
                    
                    return {
                        'internal_links_count': internal_links,
                        'page_size': page_size,
                        'avg_page_size': page_size,  # Use homepage size as estimate
                        'estimated_total_pages': estimated_total_pages,
                        'has_navigation': soup.find('nav') is not None,
                        'has_footer_links': soup.find('footer') is not None
                    }
        except Exception as e:
            logger.error(f"Error analyzing homepage: {str(e)}")
        
        return {
            'internal_links_count': 0,
            'page_size': 5000,
            'avg_page_size': 5000,
            'estimated_total_pages': 50,
            'has_navigation': False,
            'has_footer_links': False
        }

    def _count_internal_links(self, soup: BeautifulSoup, base_url: str) -> int:
        """Count internal links on a page"""
        try:
            base_domain = urlparse(base_url).netloc
            links = soup.find_all('a', href=True)
            internal_count = 0
            
            for link in links:
                href = link.get('href', '')
                if href.startswith('/') or base_domain in href:
                    internal_count += 1
            
            return internal_count
        except Exception as e:
            logger.error(f"Error counting internal links: {str(e)}")
            return 0

    def _classify_page_type(self, url: str) -> str:
        """Classify page type based on URL patterns"""
        try:
            path = urlparse(url).path.lower()
            
            for page_type, patterns in self.page_type_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, path):
                        return page_type
            
            return 'unknown'
        except Exception as e:
            logger.error(f"Error classifying page type: {str(e)}")
            return 'unknown'

    def _get_page_priority(self, page_type: str, sitemap_priority: float) -> PagePriority:
        """Get page priority based on type and sitemap priority"""
        try:
            base_priority = self.type_priority_map.get(page_type, PagePriority.MEDIUM)
            
            # Adjust priority based on sitemap priority
            if sitemap_priority >= 0.8:
                if base_priority.value > PagePriority.HIGH.value:
                    return PagePriority.HIGH
            elif sitemap_priority <= 0.3:
                if base_priority.value < PagePriority.LOW.value:
                    return PagePriority.LOW
            
            return base_priority
        except Exception as e:
            logger.error(f"Error getting page priority: {str(e)}")
            return PagePriority.MEDIUM

    async def _store_intelligent_crawl_metadata(self, job_id: str, metadata: Dict[str, Any]):
        """Store intelligent crawl metadata"""
        try:
            # Store in job's metadata or create a separate table if needed
            job = self.job_repo.get_by_job_id(self.db, job_id)
            if job:
                # Update job with intelligent metadata
                current_metadata = job.metadata if hasattr(job, 'metadata') else {}
                current_metadata.update(metadata)
                
                # Store metadata (this would require adding a metadata field to the job model)
                # For now, we'll just log it
                logger.info(f"Intelligent crawl metadata for job {job_id}: {metadata}")
        except Exception as e:
            logger.error(f"Error storing intelligent crawl metadata: {str(e)}")

    # Keep all existing methods from the original service
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
        Create a new website crawl job - original method preserved
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
                collection_id = None
        
        # Create a collection if not provided or invalid
        if not collection_id:
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
        Start a crawl job with intelligent page prioritization.
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
        
        # Start crawling with intelligent prioritization
        asyncio.create_task(self._process_crawl_job_intelligently(job_id))
        
        return True

    async def _process_crawl_job_intelligently(self, job_id: str) -> None:
        """
        Process a crawl job with intelligent page prioritization and storage monitoring.
        """
        job = self.job_repo.get_by_job_id(self.db, job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        logger.info(f"Starting intelligent crawl job {job_id} for {job.base_url}")
        
        try:
            # Create a session for all requests
            async with aiohttp.ClientSession(headers=self.default_headers) as session:
                # Get initial pages sorted by priority
                pages_to_process = []
                
                # Process pages in priority order
                while True:
                    # Get pending pages ordered by priority (depth 0 first, then by URL patterns)
                    pending_pages = self.page_repo.get_pending_pages_prioritized(
                        self.db, job_id, limit=10
                    )
                    
                    if not pending_pages:
                        break
                    
                    # Check storage limits before processing more pages
                    if await self._should_stop_crawling_due_to_storage(job.client_id):
                        logger.info(f"Stopping crawl {job_id} due to storage limits")
                        break
                    
                    # Update job to get the latest counts
                    job = self.job_repo.get_by_job_id(self.db, job_id)
                    
                    if job.pages_crawled >= job.max_pages:
                        break
                    
                    # Process pages with intelligent prioritization
                    for page in pending_pages:
                        if job.pages_crawled >= job.max_pages:
                            break
                        
                        try:
                            await self._process_page_intelligently(session, job, page)
                            
                            # Small delay to be respectful to the server
                            await asyncio.sleep(0.5)
                            
                        except Exception as e:
                            logger.error(f"Error processing page {page.url}: {str(e)}")
                            continue
                
                # Mark job as completed
                self.job_repo.update_job_status(
                    self.db,
                    job_id,
                    "completed",
                    {"completed_at": datetime.utcnow()}
                )
                
                logger.info(f"Completed intelligent crawl job {job_id}")
                
        except Exception as e:
            logger.exception(f"Error in intelligent crawl job {job_id}: {str(e)}")
            self.job_repo.update_job_status(
                self.db,
                job_id,
                "failed",
                {
                    "completed_at": datetime.utcnow(),
                    "error_message": str(e)
                }
            )

    async def _should_stop_crawling_due_to_storage(self, client_id: str) -> bool:
        """Check if crawling should stop due to storage limits"""
        try:
            storage_info = await self._get_storage_info(client_id)
            return storage_info['usage_percentage'] >= 90  # Stop at 90% usage
        except Exception as e:
            logger.error(f"Error checking storage limits: {str(e)}")
            return False

    async def _process_page_intelligently(self, session: aiohttp.ClientSession, job: WebsiteCrawlJob, page: CrawledPage) -> None:
        """
        Process a single page with intelligent content extraction and link discovery.
        """
        try:
            # Mark page as processing
            self.page_repo.update(
                self.db,
                db_obj=page,
                obj_in={"status": "processing"}
            )
            
            # Increment crawled count
            self.job_repo.increment_counter(self.db, job.job_id, "pages_crawled")
            
            # Fetch page content
            async with session.get(page.url, timeout=30) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}")
                
                content = await response.text()
                
                # Parse content
                soup = BeautifulSoup(content, 'html.parser')
                
                # Extract content using enhanced methods
                title = self._extract_title(soup, job.extraction_rules)
                text_content = self._extract_content(soup, job.extraction_rules)
                
                # Extract metadata
                metadata = self._extract_metadata(soup)
                
                # Create knowledge item
                knowledge_item = self._create_knowledge_item(
                    job, page, title, text_content
                )
                
                if knowledge_item:
                    # Update page with knowledge item reference
                    self.page_repo.update(
                        self.db,
                        db_obj=page,
                        obj_in={
                            "status": "completed",
                            "title": title,
                            "knowledge_item_id": knowledge_item.item_id
                        }
                    )
                    
                    # Generate embeddings if service is available
                    if self.embedding_service:
                        await self.embedding_service.create_embeddings_for_item(
                            self.db, 
                            knowledge_item.item_id
                        )
                else:
                    # Mark as completed but no knowledge item created
                    self.page_repo.update(
                        self.db,
                        db_obj=page,
                        obj_in={
                            "status": "completed",
                            "title": title
                        }
                    )
                
                # Increment processed count
                self.job_repo.increment_counter(self.db, job.job_id, "pages_processed")
                
                # Extract and queue priority links if we're below max depth
                if page.depth < job.max_depth:
                    await self._extract_and_queue_priority_links(job, page, soup)
                
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

    async def _extract_and_queue_priority_links(
        self, 
        job: WebsiteCrawlJob, 
        page: CrawledPage, 
        soup: BeautifulSoup
    ) -> None:
        """
        Extract links from page and queue them with intelligent prioritization.
        """
        # Get all links
        links = soup.find_all('a', href=True)
        base_url = job.base_url
        base_domain = urlparse(base_url).netloc
        
        # Prioritize links based on content and URL patterns
        prioritized_links = []
        
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
            
            # Check if already exists
            existing_page = self.page_repo.get_by_url_and_job(self.db, clean_url, job.job_id)
            if existing_page:
                continue
            
            # Check if we've reached the limit
            if job.pages_crawled >= job.max_pages:
                break
            
            # Calculate priority based on URL patterns and link context
            priority = self._calculate_link_priority(clean_url, link, page.depth)
            
            prioritized_links.append({
                'url': clean_url,
                'priority': priority,
                'depth': page.depth + 1,
                'link_text': link.text.strip()[:100] if link.text else '',
                'discovered_from': page.url
            })
        
        # Sort by priority and create pages
        prioritized_links.sort(key=lambda x: x['priority'].value)
        
        # Limit the number of links to queue from each page
        max_links_per_page = min(20, max(5, job.max_pages // 10))
        
        for link_data in prioritized_links[:max_links_per_page]:
            page_data = {
                "job_id": job.job_id,
                "url": link_data['url'],
                "status": "pending",
                "depth": link_data['depth'],
                "metadata": {
                    'priority': link_data['priority'].name,
                    'link_text': link_data['link_text'],
                    'discovered_from': link_data['discovered_from']
                }
            }
            
            self.page_repo.create(self.db, obj_in=page_data)

    def _calculate_link_priority(self, url: str, link_element, current_depth: int) -> PagePriority:
        """Calculate priority for a discovered link"""
        try:
            # Base priority on URL patterns
            page_type = self._classify_page_type(url)
            base_priority = self.type_priority_map.get(page_type, PagePriority.MEDIUM)
            
            # Adjust based on link context
            link_text = link_element.text.strip().lower() if link_element.text else ''
            
            # High priority indicators in link text
            high_priority_keywords = [
                'about', 'contact', 'product', 'service', 'help', 'support',
                'documentation', 'docs', 'guide', 'tutorial', 'blog', 'news'
            ]
            
            # Low priority indicators
            low_priority_keywords = [
                'privacy', 'terms', 'legal', 'cookie', 'sitemap', 'rss',
                'xml', 'archive', 'old', 'deprecated'
            ]
            
            if any(keyword in link_text for keyword in high_priority_keywords):
                if base_priority.value > PagePriority.HIGH.value:
                    base_priority = PagePriority.HIGH
            elif any(keyword in link_text for keyword in low_priority_keywords):
                if base_priority.value < PagePriority.LOW.value:
                    base_priority = PagePriority.LOW
            
            # Adjust based on depth (deeper pages get lower priority)
            if current_depth >= 3:
                if base_priority.value < PagePriority.LOW.value:
                    base_priority = PagePriority.LOW
            
            return base_priority
            
        except Exception as e:
            logger.error(f"Error calculating link priority: {str(e)}")
            return PagePriority.MEDIUM

    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract metadata from page"""
        try:
            metadata = {}
            
            # Extract meta tags
            meta_tags = soup.find_all('meta')
            for tag in meta_tags:
                name = tag.get('name') or tag.get('property')
                content = tag.get('content')
                if name and content:
                    metadata[name] = content
            
            # Extract structured data
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            if json_ld_scripts:
                metadata['structured_data'] = len(json_ld_scripts)
            
            # Extract language
            html_tag = soup.find('html')
            if html_tag and html_tag.get('lang'):
                metadata['language'] = html_tag.get('lang')
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}")
            return {}

    def _extract_title(self, soup: BeautifulSoup, rules: Dict[str, Any]) -> str:
        """Extract page title using rules."""
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
        """Extract page content using rules."""
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
        """Create a knowledge item from the page content."""
        # Check if we have enough content
        if len(content) < 50:  # Minimum content length
            return None
        
        # Create knowledge item
        item_data = {
            "collection_id": job.collection_id,
            "title": title,
            "content": content,
            "source_document_id": None,
            "item_metadata": {
                "source_url": page.url,
                "crawl_job_id": job.job_id,
                "page_id": page.page_id,
                "crawled_at": datetime.utcnow().isoformat(),
                "depth": page.depth,
                "page_type": self._classify_page_type(page.url)
            }
        }
        
        return self.item_repo.create(self.db, obj_in=item_data)

    def _matches_any_pattern(self, url: str, patterns: List[str]) -> bool:
        """Check if URL matches any pattern."""
        return any(re.search(pattern, url) for pattern in patterns)

    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status with enhanced information."""
        job = self.job_repo.get_by_job_id(self.db, job_id)
        if not job:
            return {"error": "Job not found"}
        
        # Get page counts
        page_counts = self.page_repo.get_pages_count_by_status(self.db, job_id)
        
        # Get recent pages
        recent_pages = self.page_repo.get_recent_pages(self.db, job_id, limit=5)
        
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
            "recent_pages": [
                {
                    "url": page.url,
                    "title": page.title,
                    "status": page.status,
                    "depth": page.depth
                }
                for page in recent_pages
            ],
            "error_message": job.error_message
        }

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a crawl job."""
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