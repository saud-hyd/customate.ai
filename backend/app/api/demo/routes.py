# backend/app/api/demo/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid
from datetime import datetime, timedelta
import asyncio, aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urlparse
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
        expires_at = datetime.utcnow() + timedelta(minutes=30)
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
    """Real demo crawl that fetches and processes website content"""
    db = SessionLocal()
    
    try:
        logger.info(f"Starting REAL demo crawl for {demo_id} - URL: {url}")
        
        # Get ANY existing client
        result = db.execute("SELECT client_id FROM clients WHERE active = true LIMIT 1")
        existing_client = result.fetchone()
        
        if not existing_client:
            logger.error("No active clients found!")
            if demo_id in demo_sessions:
                demo_sessions[demo_id]["status"] = "failed"
            return
            
        client_id = existing_client[0]
        logger.info(f"Using client for demo: {client_id}")
        
        # Parse URL and ensure proper format
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        domain = urlparse(url).netloc
        
        # Create collection
        collection_repo = KnowledgeCollectionRepository()
        demo_collection = collection_repo.create(db, obj_in={
            "client_id": client_id,
            "name": f"Demo: {domain}",
            "description": f"Demo content from {url}",
            "type": "demo_website"
        })
        
        # 🚀 REAL WEB CRAWLING STARTS HERE
        try:
            timeout = aiohttp.ClientTimeout(total=30)
            headers = {
                "User-Agent": "Customate.ai Demo Crawler (https://customate.ai)"
            }
            
            async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                logger.info(f"Fetching webpage: {url}")
                async with session.get(url) as response:
                    if response.status == 200:
                        html_content = await response.text()
                        
                        # Parse HTML content
                        soup = BeautifulSoup(html_content, 'html.parser')
                        
                        # Remove unwanted elements
                        for element in soup(['script', 'style', 'nav', 'footer', 'header']):
                            element.decompose()
                        
                        # Extract title
                        title = "Homepage"
                        if soup.title and soup.title.string:
                            title = soup.title.string.strip()
                        elif soup.find('h1'):
                            title = soup.find('h1').get_text().strip()
                        
                        # Extract main content
                        main_content = ""
                        
                        # Try to find main content areas
                        content_selectors = ['main', 'article', '.content', '#content', '.main-content']
                        for selector in content_selectors:
                            content_element = soup.select_one(selector)
                            if content_element:
                                main_content = content_element.get_text(separator='\n', strip=True)
                                break
                        
                        # Fallback to body content
                        if not main_content and soup.body:
                            main_content = soup.body.get_text(separator='\n', strip=True)
                        
                        # Clean up content
                        import re
                        main_content = re.sub(r'\n+', '\n', main_content)  # Remove multiple newlines
                        main_content = re.sub(r'\s+', ' ', main_content)   # Normalize whitespace
                        main_content = main_content.strip()
                        
                        # Ensure we have meaningful content
                        if len(main_content) < 100:
                            main_content = f"This is the homepage of {domain}. The website contains information and services related to this domain."
                        
                        # Limit content length for demo (first 2000 characters)
                        if len(main_content) > 2000:
                            main_content = main_content[:2000] + "..."
                        
                        logger.info(f"Extracted {len(main_content)} characters of content from {url}")
                        
                        # Create knowledge item with REAL content
                        item_repo = KnowledgeItemRepository()
                        knowledge_item = item_repo.create(db, obj_in={
                            "collection_id": demo_collection.collection_id,
                            "title": title,
                            "content": main_content,  # ✅ REAL website content
                            "item_metadata": {
                                "source_url": url,
                                "crawled_at": datetime.utcnow().isoformat(),
                                "demo_crawl": True,
                                "content_length": len(main_content)
                            }
                        })
                        
                        # 🧠 GENERATE EMBEDDINGS FOR RAG
                        try:
                            from app.services.llm.llm_factory import LLMFactory
                            from app.services.knowledge.embedding_service import EmbeddingService
                            
                            llm_service = LLMFactory.create_llm_service(db, client_id)
                            embedding_service = EmbeddingService(llm_service)
                            
                            # Generate embeddings for the knowledge item
                            await embedding_service.create_embeddings_for_item(db, knowledge_item.item_id)
                            logger.info(f"✅ Generated embeddings for demo knowledge item")
                            
                        except Exception as embedding_error:
                            logger.error(f"Failed to generate embeddings: {embedding_error}")
                            # Continue without embeddings - fallback to keyword search
                        
                    else:
                        logger.error(f"Failed to fetch {url}: HTTP {response.status}")
                        # Create fallback content
                        main_content = f"This is {domain}, a website that couldn't be fully crawled due to access restrictions."
                        
                        item_repo = KnowledgeItemRepository()
                        item_repo.create(db, obj_in={
                            "collection_id": demo_collection.collection_id,
                            "title": f"About {domain}",
                            "content": main_content,
                            "item_metadata": {"source_url": url, "crawl_error": f"HTTP {response.status}"}
                        })
                        
        except Exception as crawl_error:
            logger.error(f"Crawling error: {crawl_error}")
            # Create fallback content on crawl failure
            main_content = f"This is {domain}. The demo crawler encountered an issue accessing this website, but in a full implementation, it would extract and analyze all the content to provide detailed answers about this site."
            
            item_repo = KnowledgeItemRepository()
            item_repo.create(db, obj_in={
                "collection_id": demo_collection.collection_id,
                "title": f"About {domain}",
                "content": main_content,
                "item_metadata": {"source_url": url, "crawl_error": str(crawl_error)}
            })
        
        # Update demo session
        if demo_id in demo_sessions:
            demo_sessions[demo_id]["knowledge_collection_id"] = demo_collection.collection_id
            demo_sessions[demo_id]["client_id"] = client_id
            demo_sessions[demo_id]["status"] = "ready"
            logger.info(f"🎉 Demo ready with REAL content: {demo_id}")
            
    except Exception as e:
        logger.error(f"Demo error: {str(e)}")
        if demo_id in demo_sessions:
            demo_sessions[demo_id]["status"] = "failed"
    finally:
        db.close()
            

# Add cleanup endpoint for demo sessions (optional)
@router.delete("/cleanup/{demo_id}")
async def cleanup_demo_session(demo_id: str):
    """Simple cleanup of demo session from memory"""
    try:
        if demo_id in demo_sessions:
            del demo_sessions[demo_id]
            logger.info(f"🗑️ Cleaned up demo session: {demo_id}")
            return {"status": "cleaned_up", "demo_id": demo_id}
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