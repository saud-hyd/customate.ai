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
    """Create demo with UNIQUE client and SHORTER identifiers"""
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
        
        # Parse URL and ensure proper format
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        domain = urlparse(url).netloc
        
        # ✅ Create collection under the UNIQUE client
        collection_repo = KnowledgeCollectionRepository()
        demo_collection = collection_repo.create(db, obj_in={
            "client_id": demo_client_id,  # Now unique per demo!
            "name": f"Demo: {domain}",
            "description": f"Demo content from {url}",
            "type": "demo_website"
        })
        
        # 🚀 REAL WEB CRAWLING (Same as before)
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
                        soup = BeautifulSoup(html_content, 'html.parser')
                        
                        # Extract main content
                        for tag in soup(["script", "style", "nav", "footer", "header"]):
                            tag.decompose()
                        
                        main_content = soup.get_text(separator=' ', strip=True)[:5000]
                        
                        if len(main_content) < 100:
                            main_content = f"Content from {domain}. This demo shows how AI can understand and chat about website content."
                    else:
                        main_content = f"Demo content for {domain}. AI assistant ready to answer questions about this website."
                        
        except Exception as crawl_error:
            logger.error(f"Crawling error: {crawl_error}")
            main_content = f"Demo content for {domain}. This demo shows how the AI assistant would work with your website content."
        
        # ✅ Store content under unique client
        item_repo = KnowledgeItemRepository()
        item_repo.create(db, obj_in={
            "collection_id": demo_collection.collection_id,
            "title": f"About {domain}",
            "content": main_content,
            "item_metadata": {"source_url": url, "demo_session": demo_id}
        })
        
        # ✅ Update demo session with unique client info
        if demo_id in demo_sessions:
            demo_sessions[demo_id]["knowledge_collection_id"] = demo_collection.collection_id
            demo_sessions[demo_id]["client_id"] = demo_client_id  # Store unique client
            demo_sessions[demo_id]["status"] = "ready"
            logger.info(f"🎉 Demo ready with ISOLATED content: {demo_id} | Client: {demo_client_id}")
            
    except Exception as e:
        logger.error(f"❌ Demo creation error: {str(e)}")
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