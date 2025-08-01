# backend/app/api/demo/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid
from datetime import datetime, timedelta
import asyncio, aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import json
from fastapi.responses import StreamingResponse
from app.core.database.session import SessionLocal

from app.core.database.dependencies import get_db
from app.core.database.session import SessionLocal
from app.core import logger
from app.services.knowledge.web_crawler_service import WebCrawlerService
from app.services.knowledge.embedding_service import EmbeddingService
from app.repositories.knowledge_repository import KnowledgeCollectionRepository
from app.repositories.knowledge_repository import KnowledgeItemRepository
from app.repositories.client_repository import ClientRepository

router = APIRouter()

# In-memory store for demo sessions (you could use Redis in production)
demo_sessions = {}

@router.post("/create")
async def create_demo_session(
    request: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a temporary demo session with quick website crawl"""
    try:
        url = request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Generate demo session
        demo_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=7)
        temp_api_key = f"demo_{demo_id}"
        
        logger.info(f"Creating demo session {demo_id} for URL: {url}")
        
        # Quick crawl in background (NOW USING REAL CRAWLER)
        background_tasks.add_task(quick_demo_crawl, demo_id, url, db)
        
        # Store demo session
        demo_sessions[demo_id] = {
            "demo_id": demo_id,
            "api_key": temp_api_key,
            "target_url": url,
            "expires_at": expires_at,
            "status": "crawling",
            "knowledge_collection_id": None,
            "message_count": 0,  # Track message count for 15-message limit
            "crawl_job_id": None  # Track the actual crawl job
        }
        
        return {
            "demo_id": demo_id,
            "api_key": temp_api_key,
            "target_url": url,
            "expires_at": expires_at.isoformat(),
            "status": "crawling"
        }
        
    except Exception as e:
        logger.error(f"Demo creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create demo: {str(e)}")

@router.get("/status/{demo_id}")
async def get_demo_status(demo_id: str):
    """Get demo session status"""
    if demo_id not in demo_sessions:
        raise HTTPException(status_code=404, detail="Demo session not found")
    
    session = demo_sessions[demo_id]
    
    # Check if expired
    if datetime.utcnow() > session["expires_at"]:
        return {"status": "expired"}
    
    return session

async def quick_demo_crawl(demo_id: str, url: str, db: Session):
    """Complete demo crawling function that discovers and crawls up to 100KB of content"""
    db = SessionLocal()
    
    try:
        logger.info(f"🚀 Creating SAFE ISOLATED demo session: {demo_id} for URL: {url}")
        
        # Parse domain for naming
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        domain = urlparse(url).netloc or "unknown"
        
        # ✅ CREATE SHORT IDENTIFIERS that fit database constraints
        short_demo_id = demo_id[:8]  # Only first 8 characters
        demo_client_id = f"demo_{short_demo_id}"  # Max 13 chars (fits in 36)
        demo_api_key = f"dapi_{demo_id}"  # Shorter prefix
        demo_email = f"{short_demo_id}@demo.ai"  # Much shorter email
        
        # ✅ CREATE SAFE DEMO CLIENT with database-compliant lengths
        client_repo = ClientRepository()
        demo_client = client_repo.create(db, obj_in={
            "name": f"Demo-{short_demo_id}",  # Short name
            "industry": "Demo",
            "email": demo_email,  # Short email that fits
            "client_id": demo_client_id,  # Short client_id (13 chars)
            "api_key": demo_api_key,  # API key can be longer (255 char limit)
            "active": True
        })
        
        demo_client_id = demo_client.client_id
        logger.info(f"✅ Created unique demo client: {demo_client_id}")
        
        # ✅ Create collection under the UNIQUE client
        collection_repo = KnowledgeCollectionRepository()
        demo_collection = collection_repo.create(db, obj_in={
            "client_id": demo_client_id,  # Now unique per demo!
            "name": f"Demo: {domain}",
            "description": f"Demo content from {url}",
            "type": "demo_website"
        })
        
        # 🚀 COMPLETE CRAWLING LOGIC - UP TO 100KB
        try:
            timeout = aiohttp.ClientTimeout(total=120)  # 2 minutes for thorough crawling
            headers = {
                "User-Agent": "Customate.ai Demo Crawler (https://customate.ai)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1"
            }
            
            async with aiohttp.ClientSession(
                timeout=timeout, 
                headers=headers,
                connector=aiohttp.TCPConnector(limit=10, limit_per_host=5)
            ) as session:
                logger.info(f"🎯 Starting comprehensive demo crawl for: {url}")
                logger.info(f"🎯 Target: 100KB ({100 * 1024} bytes)")
                
                # Initialize crawling state
                total_content_size = 0
                max_content_size = 100 * 1024  # 100KB limit
                pages_crawled = []
                pages_to_crawl = [url]
                visited_urls = set()
                failed_urls = set()
                base_domain = urlparse(url).netloc
                
                # Priority URLs to check first
                priority_urls = []
                
                logger.info(f"🌐 Base domain: {base_domain}")
                logger.info(f"🎯 Starting crawl loop...")
                
                crawl_iteration = 0
                while (pages_to_crawl and 
                       total_content_size < max_content_size and 
                       len(pages_crawled) < 35 and  # Increased page limit
                       crawl_iteration < 50):  # Prevent infinite loops
                    
                    crawl_iteration += 1
                    
                    # Get next URL (prioritize certain pages)
                    if priority_urls:
                        current_url = priority_urls.pop(0)
                        if current_url in pages_to_crawl:
                            pages_to_crawl.remove(current_url)
                    else:
                        current_url = pages_to_crawl.pop(0)
                    
                    # Skip if already processed
                    if current_url in visited_urls or current_url in failed_urls:
                        logger.debug(f"⏭️ Skipping already processed: {current_url}")
                        continue
                        
                    visited_urls.add(current_url)
                    
                    try:
                        logger.info(f"📄 [{crawl_iteration}] Crawling page {len(pages_crawled)+1}: {current_url}")
                        logger.info(f"📊 Progress: {total_content_size/1024:.1f}KB / 100KB ({(total_content_size/max_content_size)*100:.1f}%)")
                        logger.info(f"📋 Queue: {len(pages_to_crawl)} URLs remaining")
                        
                        async with session.get(current_url, allow_redirects=True) as response:
                            # Handle redirects
                            final_url = str(response.url)
                            if final_url != current_url:
                                logger.info(f"🔄 Redirected to: {final_url}")
                                if final_url in visited_urls:
                                    continue
                                visited_urls.add(final_url)
                            
                            if response.status == 200:
                                # Get content
                                try:
                                    html_content = await response.text(encoding='utf-8')
                                except UnicodeDecodeError:
                                    html_content = await response.text(encoding='latin-1', errors='ignore')
                                
                                # Parse HTML
                                soup = BeautifulSoup(html_content, 'html.parser')
                                
                                # Remove unwanted elements
                                unwanted_tags = [
                                    "script", "style","noscript", "meta", "link", "title", 
                                    "form", "input", "button", "select", "textarea",
                                    "img", "svg", "canvas", "audio", "video"
                                ]
                                for tag in soup(unwanted_tags):
                                    tag.decompose()
                                
                                # Extract main content areas first
                                main_content_selectors = [
                                    'main', 'article', '[role="main"]', '.main-content', 
                                    '#main-content', '.content', '#content', '.post-content',
                                    '.entry-content', '.page-content', '.article-content'
                                ]
                                
                                main_content_element = None
                                for selector in main_content_selectors:
                                    main_content_element = soup.select_one(selector)
                                    if main_content_element:
                                        logger.debug(f"📄 Found main content with selector: {selector}")
                                        break
                                
                                # Extract text content
                                if main_content_element:
                                    content_element = main_content_element
                                else:
                                    content_element = soup.find('body') or soup
                                
                                # Get clean text
                                page_content = content_element.get_text(separator=' ', strip=True)
                                
                                # Clean up content
                                import re
                                # Remove extra whitespace
                                page_content = re.sub(r'\s+', ' ', page_content)
                                # Remove common navigation text
                                page_content = re.sub(r'\b(Home|Menu|Navigation|Skip to|Jump to)\b', '', page_content, flags=re.IGNORECASE)
                                page_content = page_content.strip()
                                
                                # Calculate content size
                                content_bytes = len(page_content.encode('utf-8'))
                                logger.info(f"📊 Extracted {content_bytes} bytes ({content_bytes/1024:.1f} KB) from {current_url}")
                                
                                # Check if we should add this content
                                if content_bytes > 30:  # Must have at least 100 bytes of meaningful content
                                    # Check if adding would exceed limit
                                    if total_content_size + content_bytes > max_content_size:
                                        remaining_bytes = max_content_size - total_content_size
                                        logger.info(f"⚠️ Would exceed limit. Remaining: {remaining_bytes} bytes")
                                        
                                        if remaining_bytes > 500:  # Only truncate if we have reasonable space
                                            # Truncate content safely
                                            page_content_bytes = page_content.encode('utf-8')
                                            truncated_bytes = page_content_bytes[:remaining_bytes]
                                            
                                            # Ensure valid UTF-8
                                            try:
                                                page_content = truncated_bytes.decode('utf-8')
                                            except UnicodeDecodeError:
                                                # Find safe cut point
                                                for i in range(remaining_bytes - 1, max(0, remaining_bytes - 10), -1):
                                                    try:
                                                        page_content = page_content_bytes[:i].decode('utf-8')
                                                        break
                                                    except UnicodeDecodeError:
                                                        continue
                                            
                                            content_bytes = len(page_content.encode('utf-8'))
                                            logger.info(f"✂️ Truncated to: {content_bytes} bytes")
                                        else:
                                            logger.info(f"🛑 Stopping - insufficient space remaining")
                                            break
                                    
                                    # Add the page content
                                    pages_crawled.append({
                                        'url': current_url,
                                        'content': page_content,
                                        'size_bytes': content_bytes,
                                        'title': soup.find('title').get_text(strip=True) if soup.find('title') else 'Untitled'
                                    })
                                    
                                    total_content_size += content_bytes
                                    logger.info(f"✅ Page added: {content_bytes} bytes. Total: {total_content_size}/{max_content_size} bytes ({total_content_size/1024:.1f}/100 KB)")
                                else:
                                    logger.info(f"⏭️ Skipping page with insufficient content: {content_bytes} bytes")
                                
                                # Discover new links
                                if total_content_size < max_content_size and len(pages_to_crawl) < 100:
                                    links = soup.find_all('a', href=True)
                                    logger.info(f"🔍 Found {len(links)} total links on page")
                                    
                                    new_links = 0
                                    rejected_links = 0
                                    rejection_stats = {}
                                    
                                    for link in links:
                                        href = link.get('href', '').strip()
                                        if not href:
                                            continue
                                        
                                        try:
                                            # Build absolute URL
                                            absolute_url = urljoin(current_url, href)
                                            parsed = urlparse(absolute_url)
                                            
                                            # Clean the URL
                                            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
                                            if parsed.query:
                                                # Keep important query parameters
                                                important_params = ['id', 'page', 'category', 'slug', 'post']
                                                query_params = []
                                                for param in parsed.query.split('&'):
                                                    if any(imp in param.lower() for imp in important_params):
                                                        query_params.append(param)
                                                if query_params:
                                                    clean_url += '?' + '&'.join(query_params)
                                            
                                            # Filter links
                                            rejection_reason = None
                                            
                                            # Domain check
                                            if parsed.netloc != base_domain:
                                                rejection_reason = "external_domain"
                                            # Already processed
                                            elif clean_url in visited_urls or clean_url in failed_urls:
                                                rejection_reason = "already_processed"
                                            # Already queued
                                            elif clean_url in pages_to_crawl or clean_url in priority_urls:
                                                rejection_reason = "already_queued"
                                            # Special protocols
                                            elif href.startswith(('mailto:', 'tel:', 'javascript:', 'ftp:', '#')):
                                                rejection_reason = "special_protocol"
                                            # File downloads
                                            elif any(clean_url.lower().endswith(ext) for ext in [
                                                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                                                '.zip', '.rar', '.tar', '.gz', '.exe', '.dmg', '.pkg',
                                                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
                                                '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'
                                            ]):
                                                rejection_reason = "file_download"
                                            # Same as current page
                                            elif clean_url == current_url:
                                                rejection_reason = "self_reference"
                                            # Admin/system paths
                                            elif any(pattern in clean_url.lower() for pattern in [
                                                '/admin', '/wp-admin', '/login', '/register', '/logout',
                                                '/api/', '/ajax', '/json', '/xml', '/rss', '/feed',
                                                '/search', '/cart', '/checkout', '/account'
                                            ]):
                                                rejection_reason = "system_path"
                                            
                                            if rejection_reason:
                                                rejected_links += 1
                                                rejection_stats[rejection_reason] = rejection_stats.get(rejection_reason, 0) + 1
                                            else:
                                                # Prioritize certain types of pages
                                                link_text = link.get_text(strip=True).lower()
                                                if any(keyword in link_text for keyword in [
                                                    'about', 'service', 'product', 'solution', 'feature',
                                                    'pricing', 'contact', 'team', 'company', 'help', 'support'
                                                ]):
                                                    if clean_url not in priority_urls:
                                                        priority_urls.append(clean_url)
                                                        logger.debug(f"⭐ Priority link: {clean_url} ({link_text})")
                                                else:
                                                    if clean_url not in pages_to_crawl:
                                                        pages_to_crawl.append(clean_url)
                                                
                                                new_links += 1
                                                logger.debug(f"➕ Added: {clean_url}")
                                        
                                        except Exception as link_error:
                                            logger.debug(f"❌ Link processing error for {href}: {link_error}")
                                            continue
                                    
                                    logger.info(f"🔗 Link discovery: {new_links} added, {rejected_links} rejected")
                                    if rejection_stats:
                                        logger.info(f"📊 Rejection reasons: {rejection_stats}")
                                    logger.info(f"📋 Queue status: {len(priority_urls)} priority, {len(pages_to_crawl)} regular")
                                
                                # Check if we've reached our target
                                if total_content_size >= max_content_size:
                                    logger.info(f"🎯 Target size reached! Stopping crawl.")
                                    break
                                    
                            else:
                                logger.warning(f"❌ HTTP {response.status} for {current_url}")
                                failed_urls.add(current_url)
                                
                    except asyncio.TimeoutError:
                        logger.warning(f"⏱️ Timeout crawling {current_url}")
                        failed_urls.add(current_url)
                    except Exception as page_error:
                        logger.warning(f"⚠️ Error crawling {current_url}: {str(page_error)}")
                        failed_urls.add(current_url)
                
                # Final crawl summary
                logger.info(f"")
                logger.info(f"🏁 CRAWL COMPLETED!")
                logger.info(f"=" * 50)
                logger.info(f"📊 URLs discovered: {len(visited_urls) + len(failed_urls)}")
                logger.info(f"✅ URLs successfully crawled: {len(visited_urls) - len(failed_urls)}")
                logger.info(f"❌ URLs failed: {len(failed_urls)}")
                logger.info(f"📄 Pages with content: {len(pages_crawled)}")
                logger.info(f"💾 Total content size: {total_content_size} bytes ({total_content_size/1024:.1f} KB)")
                logger.info(f"🎯 Target achievement: {(total_content_size/max_content_size)*100:.1f}% of 100KB")
                logger.info(f"📋 Remaining queue: {len(pages_to_crawl)} URLs")
                
                if pages_crawled:
                    logger.info(f"📄 Successfully crawled pages:")
                    for i, page in enumerate(pages_crawled, 1):
                        logger.info(f"  {i:2d}. {page['url']} ({page['size_bytes']} bytes) - {page['title'][:50]}")
                
                # Combine all content
                if pages_crawled:
                    all_content_parts = []
                    for page in pages_crawled:
                        page_header = f"=== {page['title']} ===\nURL: {page['url']}\nSize: {page['size_bytes']} bytes\n\n"
                        all_content_parts.append(page_header + page['content'])
                    
                    main_content = "\n\n" + "="*80 + "\n\n".join(all_content_parts)
                    
                    final_size = len(main_content.encode('utf-8'))
                    logger.info(f"✅ Final content compiled: {final_size} bytes ({final_size/1024:.1f} KB)")
                else:
                    main_content = f"Demo content for {domain}. This demo shows how AI can understand and chat about website content."
                    logger.warning(f"⚠️ No pages crawled successfully - using fallback content")
                    
        except Exception as crawl_error:
            logger.error(f"❌ Critical crawling error: {str(crawl_error)}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            main_content = f"Demo content for {domain}. This demo shows how the AI assistant would work with your website content."
        
        # ✅ Store content under unique client
        item_repo = KnowledgeItemRepository()
        item_repo.create(db, obj_in={
            "collection_id": demo_collection.collection_id,
            "title": f"Website Content: {domain}",
            "content": main_content,
            "item_metadata": {
                "source_url": url, 
                "demo_session": demo_id,
                "pages_crawled": len(pages_crawled) if 'pages_crawled' in locals() else 0,
                "content_size_bytes": len(main_content.encode('utf-8'))
            }
        })
        
        # ✅ Update demo session with unique client info
        if demo_id in demo_sessions:
            demo_sessions[demo_id]["knowledge_collection_id"] = demo_collection.collection_id
            demo_sessions[demo_id]["client_id"] = demo_client_id
            demo_sessions[demo_id]["status"] = "ready"
            logger.info(f"🎉 Demo ready with content: {demo_id} | Client: {demo_client_id}")
            
    except Exception as e:
        logger.error(f"❌ Demo setup error: {str(e)}")
        import traceback
        logger.error(f"❌ Full setup traceback: {traceback.format_exc()}")
        if demo_id in demo_sessions:
            demo_sessions[demo_id]["status"] = "failed"
    finally:
        db.close()            

@router.delete("/cleanup/{demo_id}")
async def cleanup_demo_session(demo_id: str, db: Session = Depends(get_db)):
    """🗑️ COMPLETE cleanup - Delete entire demo client and ALL associated data"""
    try:
        if demo_id in demo_sessions:
            demo_session = demo_sessions[demo_id]
            demo_client_id = demo_session.get("client_id")
            
            if demo_client_id and demo_client_id.startswith("demo_client_"):
                # ✅ DELETE THE ENTIRE CLIENT (Cascades EVERYTHING!)
                client_repo = ClientRepository()
                deleted = client_repo.delete_by_client_id(db, demo_client_id)
                
                if deleted:
                    logger.info(f"🗑️ Completely deleted demo client and ALL data: {demo_client_id}")
                else:
                    logger.warning(f"⚠️ Demo client not found in database: {demo_client_id}")
            
            # Remove from memory
            del demo_sessions[demo_id]
            logger.info(f"🗑️ Removed demo session from memory: {demo_id}")
            
            return {"status": "cleaned_up", "demo_id": demo_id, "client_deleted": demo_client_id}
        else:
            raise HTTPException(status_code=404, detail="Demo session not found")
            
    except Exception as e:
        logger.error(f"❌ Demo cleanup error for {demo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")
    
# Add simple stats endpoint
@router.get("/stats")
async def get_demo_stats():
    """Get basic demo session statistics"""
    try:
        current_time = datetime.utcnow()
        active_count = 0
        expired_count = 0
        
        for session in demo_sessions.values():
            if current_time <= session["expires_at"]:
                active_count += 1
            else:
                expired_count += 1
        
        return {
            "total_sessions": len(demo_sessions),
            "active_sessions": active_count,
            "expired_sessions": expired_count
        }
    except Exception as e:
        logger.error(f"Demo stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
    
    
@router.post("/message/stream")
async def demo_message_stream(
    request: Request,
    db: Session = Depends(get_db)
):
    """Stream endpoint specifically for demo chat interactions"""
    try:
        logger.info("🎯 Demo message stream request received")
        
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key or not api_key.startswith("demo_"):
            raise HTTPException(status_code=401, detail="Invalid demo API key")
        
        # Extract demo_id from API key
        demo_id = api_key[5:]  # Remove "demo_" prefix
        
        # Check if demo session exists
        if demo_id not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session = demo_sessions[demo_id]
        
        # Check if demo session expired
        if datetime.utcnow() > demo_session["expires_at"]:
            raise HTTPException(status_code=410, detail="Demo session expired")
        
        # Check if demo is ready
        if demo_session["status"] != "ready":
            async def generate_status_stream():
                status_response = f"Demo is still being prepared. Current status: {demo_session['status']}. Please wait a moment and try again."
                
                chunk_data = {
                    "type": "chunk",
                    "content": status_response,
                    "demo_mode": True
                }
                yield f"data: {json.dumps(chunk_data)}\n\n"
                
                final_data = {
                    "type": "complete",
                    "demo_mode": True
                }
                yield f"data: {json.dumps(final_data)}\n\n"
            
            return StreamingResponse(
                generate_status_stream(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type, X-API-Key"
                }
            )
        
        # Get request body
        body = await request.json()
        message = body.get("message", "")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Check 15-message limit
        if demo_session["message_count"] >= 15:
            async def generate_limit_stream():
                limit_response = "Demo message limit reached (15 messages). Please sign up for a full account to continue chatting!"
                
                chunk_data = {
                    "type": "chunk",
                    "content": limit_response,
                    "demo_mode": True
                }
                yield f"data: {json.dumps(chunk_data)}\n\n"
                
                final_data = {
                    "type": "complete",
                    "demo_mode": True,
                    "limit_reached": True
                }
                yield f"data: {json.dumps(final_data)}\n\n"
            
            return StreamingResponse(
                generate_limit_stream(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type, X-API-Key"
                }
            )
        
        # Increment message count
        demo_sessions[demo_id]["message_count"] += 1
        
        logger.info(f"🎯 Processing demo message #{demo_session['message_count']}: {message[:50]}...")
        
        # Generate demo response stream
        async def generate_demo_response():
            try:
                # Demo collection ID for knowledge search
                demo_collection_id = demo_session.get("knowledge_collection_id")
                
                # Simple demo responses based on message content
                knowledge_used = False
                demo_response = ""
                
                # Try knowledge search if we have a collection
                if demo_collection_id :
                    try:
                        # Initialize search service for demo
                        from app.services.llm.llm_factory import LLMFactory
                        from app.services.knowledge.enhanced_search_service import EnhancedSearchService
                        
                        stored_client_id = demo_session.get("client_id")
                        if not stored_client_id:
                            raise Exception("No client ID found in demo session")
                        
                        llm_service = LLMFactory.create_llm_service(db, stored_client_id)
                        search_service = EnhancedSearchService(llm_service)
                        
                        search_results = await search_service.hybrid_search(
                            client_id=stored_client_id,
                            query_text=message,
                            limit=3,
                            collection_id=demo_collection_id
                        )
                        
                        if search_results.get("results"):
                            knowledge_used = True
                            # Build response from knowledge
                            knowledge_content = ""
                            for result in search_results["results"][:2]:
                                knowledge_content += f"{result.get('content', '')[:200]}... "
                            demo_response = f"I found relevant information about your question: {knowledge_content}"
                            logger.info(f"✅ Demo knowledge search found {len(search_results['results'])} results")
                        else:
                            demo_response = f"I'm a demo AI assistant and I couldn't find specific information about '{message}'. "
                            logger.info("🔄 Demo knowledge search returned no results")                        
                    except Exception as search_error:
                        logger.error(f"Demo search error: {search_error}")
                        demo_response = f"I'm a demo AI assistant and I encountered an error while searching for information about '{message}'. "
                else:
                    demo_response = f"I'm a demo AI assistant and I don't have any specific information about '{message}'. "
                
                # Fallback responses
                if not demo_response:
                    message_lower = message.lower()
                    if any(greeting in message_lower for greeting in ["hi", "hello", "hey"]):
                        demo_response = f"Hello! I'm the AI assistant for this website demo. I can help answer questions about the content on {demo_session['target_url']}. What would you like to know?"
                    elif any(question in message_lower for question in ["what", "how", "where", "when", "why"]):
                        demo_response = f"That's a great question! In the full version, I would search through all the content on {demo_session['target_url']} to provide you with detailed, accurate information. This demo shows how I can understand and respond to your questions about website content."
                    else:
                        demo_response = f"I understand you're asking about: '{message}'. In a full implementation, I would analyze all the content from {demo_session['target_url']} to give you specific, relevant answers. This demo showcases the conversational AI capabilities!"
                
                # Send info chunk
                info_data = {
                    "type": "info",
                    "knowledge_used": knowledge_used,
                    "demo_mode": True,
                    "message_count": demo_session["message_count"]
                }
                yield f"data: {json.dumps(info_data)}\n\n"
                
                # Stream response word by word for realistic effect
                words = demo_response.split()
                for i, word in enumerate(words):
                    chunk_data = {
                        "type": "chunk",
                        "content": word + " ",
                        "demo_mode": True
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                    await asyncio.sleep(0.05)  # Typing effect
                
                # Send completion
                final_data = {
                    "type": "complete",
                    "demo_mode": True,
                    "message_count": demo_session["message_count"],
                    "remaining_messages": 15 - demo_session["message_count"]
                }
                yield f"data: {json.dumps(final_data)}\n\n"
                
                logger.info(f"✅ Demo response completed - {demo_session['message_count']}/15 messages used")
                
            except Exception as stream_error:
                logger.error(f"❌ Demo stream error: {str(stream_error)}")
                error_data = {
                    'type': 'error',
                    'error': f"Demo processing failed: {str(stream_error)}",
                    'demo_mode': True
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(
            generate_demo_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
                "X-Demo-Mode": "true"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Demo message stream error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Demo stream failed: {str(e)}") 
    
@router.post("/auto-cleanup")
async def auto_cleanup_expired_demos(db: Session = Depends(get_db)):
    """🔄 Automatic cleanup of expired demo sessions"""
    current_time = datetime.utcnow()
    cleaned_demos = []
    
    for demo_id, session in list(demo_sessions.items()):
        if current_time > session["expires_at"]:
            demo_client_id = session.get("client_id")
            
            if demo_client_id and demo_client_id.startswith("demo_client_"):
                # Delete entire demo client and all data
                client_repo = ClientRepository()
                deleted = client_repo.delete_by_client_id(db, demo_client_id)
                
                if deleted:
                    cleaned_demos.append({
                        "demo_id": demo_id,
                        "client_id": demo_client_id,
                        "expired_at": session["expires_at"].isoformat()
                    })
            
            # Remove from memory
            del demo_sessions[demo_id]
    
    logger.info(f"🔄 Auto-cleanup completed: {len(cleaned_demos)} expired demos removed")
    
    return {
        "cleaned_count": len(cleaned_demos),
        "cleaned_demos": cleaned_demos,
        "cleanup_time": current_time.isoformat()
    }       