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
from app.domain.knowledge.entities import VectorEmbedding, KnowledgeItem, KnowledgeCollection


from app.core.database.dependencies import get_db
from app.core.database.session import SessionLocal
from app.core import logger
from app.services.knowledge.web_crawler_service import WebCrawlerService
from app.services.knowledge.embedding_service import EmbeddingService
from app.repositories.knowledge_repository import KnowledgeCollectionRepository
from app.repositories.knowledge_repository import KnowledgeItemRepository
from app.repositories.client_repository import ClientRepository
from app.domain.client.entities import Client

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
        created_item = item_repo.create(db, obj_in={
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

        # 🔥 CRITICAL: Generate embeddings (what normal crawler does automatically)
        try:
            from app.services.llm.llm_factory import LLMFactory
            
            llm_service = LLMFactory.create_llm_service(db, demo_client_id)
            embedding_service = EmbeddingService(llm_service)
            
            success = await embedding_service.create_embeddings_for_item(db, created_item.item_id)
            if success:
                logger.info(f"✅ Generated embeddings for demo content: {demo_id}")
            else:
                logger.error(f"❌ Failed to generate embeddings for demo: {demo_id}")
                
        except Exception as embedding_error:
            logger.error(f"❌ Demo embedding error: {str(embedding_error)}")
        
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
    """Demo message stream - uses SAME logic as normal widget"""
    try:
        logger.info("🎯 Demo message stream request received")
        
        # Get API key from headers
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key or not api_key.startswith("demo_"):
            raise HTTPException(status_code=401, detail="Invalid demo API key")
        
        # Extract demo_id from API key
        demo_id = api_key[5:]  # Remove "demo_" prefix
        
        # Check if demo session exists and is ready
        if demo_id not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session = demo_sessions[demo_id]
        
        if datetime.utcnow() > demo_session["expires_at"]:
            raise HTTPException(status_code=410, detail="Demo session expired")
        
        if demo_session["status"] != "ready":
            raise HTTPException(status_code=400, detail="Demo not ready")
        
        # Check 15-message limit
        if demo_session["message_count"] >= 15:
            raise HTTPException(status_code=429, detail="Demo message limit reached (15 messages)")
        
        # Increment message count
        demo_sessions[demo_id]["message_count"] += 1
        
        # Get request body
        body = await request.json()
        message = body.get("message", "")
        session_id = body.get("session_id", f"demo_session_{demo_id}")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        logger.info(f"📨 Processing demo message #{demo_session['message_count']}: {message[:100]}...")
        
        # 🔥 USE EXACT SAME LOGIC AS NORMAL WIDGET
        # Get client using the same function as widget
        from app.api.widget.routes import get_widget_client_by_api_key
        client = get_widget_client_by_api_key(api_key, db)
        
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Collect user info
        user_info = {
            "user_id": body.get("user_id"),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "referrer": request.headers.get("referer"),
        }
        
        async def generate_stream_response():
            """Generate streaming response using SAME EnhancedChatService as normal widget."""
            try:
                # Initialize services EXACTLY like normal widget
                from app.services.llm.llm_factory import LLMFactory
                from app.services.knowledge.enhanced_search_service import EnhancedSearchService
                from app.services.chat.enhanced_chat_service import EnhancedChatService
                from app.services.chat.context_manager import ContextManager
                
                llm_service = LLMFactory.create_llm_service(db, client.client_id)
                search_service = EnhancedSearchService(llm_service)
                context_manager = ContextManager()
                
                # Create enhanced chat service (SAME as normal widget)
                chat_service = EnhancedChatService(
                    db=db,
                    search_service=search_service,
                    llm_service=llm_service,
                    context_manager=context_manager,
                )
                
                # Process message using SAME pipeline as normal widget
                async for chunk in chat_service.process_message_stream(
                    client_id=client.client_id,
                    user_message=message,
                    session_id=session_id,
                    user_info=user_info
                ):
                    # Add demo metadata to response
                    if isinstance(chunk, dict):
                        chunk["demo_mode"] = True
                        chunk["message_count"] = demo_session["message_count"]
                        chunk["remaining_messages"] = 15 - demo_session["message_count"]
                    
                    yield f"data: {json.dumps(chunk)}\n\n"
                
                logger.info(f"✅ Demo message processed using EnhancedChatService - {demo_session['message_count']}/15 messages used")
                
            except Exception as stream_error:
                logger.error(f"❌ Demo stream error: {str(stream_error)}")
                error_data = {
                    'type': 'error',
                    'error': f"Demo processing failed: {str(stream_error)}",
                    'demo_mode': True
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(
            generate_stream_response(),
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
    
# Add this search debug endpoint to backend/app/api/demo/routes.py

@router.post("/debug-search/{demo_id}")
async def debug_demo_search(demo_id: str, request: Request, db: Session = Depends(get_db)):
    """🔍 Debug the actual search process for a demo"""
    try:
        if demo_id not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session = demo_sessions[demo_id]
        stored_client_id = demo_session.get("client_id")
        collection_id = demo_session.get("knowledge_collection_id")
        
        # Get search query
        body = await request.json()
        message = body.get("message", "hello")
        
        debug_info = {
            "query": message,
            "demo_client_id": stored_client_id,
            "collection_id": collection_id,
            "search_steps": {}
        }
        
        if not stored_client_id or not collection_id:
            debug_info["error"] = "Missing client_id or collection_id"
            return debug_info
        
        # Step 1: Test LLM service creation
        try:
            from app.services.llm.llm_factory import LLMFactory
            llm_service = LLMFactory.create_llm_service(db, stored_client_id)
            debug_info["search_steps"]["llm_service_created"] = True
        except Exception as e:
            debug_info["search_steps"]["llm_service_error"] = str(e)
            return debug_info
        
        # Step 2: Test query embedding generation
        try:
            query_embedding = await llm_service.generate_embeddings(message)
            debug_info["search_steps"]["query_embedding"] = {
                "success": True,
                "dimensions": len(query_embedding) if query_embedding else 0,
                "first_few_values": query_embedding[:5] if query_embedding else None
            }
        except Exception as e:
            debug_info["search_steps"]["query_embedding_error"] = str(e)
            return debug_info
        
        # Step 3: Test search service creation
        try:
            from app.services.knowledge.enhanced_search_service import EnhancedSearchService
            search_service = EnhancedSearchService(llm_service)
            debug_info["search_steps"]["search_service_created"] = True
        except Exception as e:
            debug_info["search_steps"]["search_service_error"] = str(e)
            return debug_info
        
        # Step 4: Test hybrid search with different thresholds  
        debug_info["search_steps"]["search_test"] = {}
        
        try:
            search_results = await search_service.hybrid_search(
                client_id=stored_client_id,
                query_text=message,
                limit=5,
                collection_id=collection_id
            )
            
            debug_info["search_steps"]["search_test"] = {
                "results_count": len(search_results.get("results", [])),
                "metadata": search_results.get("metadata", {}),
                "results": search_results.get("results", [])[:2] if search_results.get("results") else []
            }
        except Exception as e:
            debug_info["search_steps"]["search_test"] = {
                "error": str(e)
            }
        
        # Step 5: Test direct vector repository search (bypassing EnhancedSearchService)
        try:
            from app.repositories.vector_repository import VectorRepository
            vector_repo = VectorRepository()
            
            direct_results = vector_repo.find_similar_items(
                db=db,
                query_vector=query_embedding,
                client_id=stored_client_id,
                limit=5,
                threshold=0.1,  # Very low threshold
                collection_id=collection_id
            )
            
            debug_info["search_steps"]["direct_vector_search"] = {
                "results_count": len(direct_results),
                "results": direct_results[:2] if direct_results else []  # First 2 results
            }
        except Exception as e:
            debug_info["search_steps"]["direct_vector_search_error"] = str(e)
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Search debug error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Add this endpoint to test with very low threshold
# backend/app/api/demo/routes.py

@router.post("/debug-search-low-threshold/{demo_id}")
async def debug_demo_search_low_threshold(demo_id: str, request: Request, db: Session = Depends(get_db)):
    """🔍 Debug search with very low threshold to see if any matches exist"""
    try:
        if demo_id not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session = demo_sessions[demo_id]
        stored_client_id = demo_session.get("client_id")
        collection_id = demo_session.get("knowledge_collection_id")
        
        body = await request.json()
        message = body.get("message", "hello")
        
        if not stored_client_id or not collection_id:
            return {"error": "Missing client_id or collection_id"}
        
        # Test with different thresholds
        from app.services.llm.llm_factory import LLMFactory
        from app.repositories.vector_repository import VectorRepository
        
        llm_service = LLMFactory.create_llm_service(db, stored_client_id)
        query_embedding = await llm_service.generate_embeddings(message)
        
        vector_repo = VectorRepository()
        
        thresholds = [0.0, 0.1, 0.3, 0.5, 0.7, 0.9]
        results_by_threshold = {}
        
        for threshold in thresholds:
            try:
                results = vector_repo.find_similar_items(
                    db=db,
                    query_vector=query_embedding,
                    client_id=stored_client_id,
                    limit=5,
                    threshold=threshold,
                    collection_id=collection_id
                )
                
                results_by_threshold[f"threshold_{threshold}"] = {
                    "count": len(results),
                    "results": results[:1] if results else []  # First result only
                }
            except Exception as e:
                results_by_threshold[f"threshold_{threshold}"] = {"error": str(e)}
        
        return {
            "query": message,
            "query_dimensions": len(query_embedding),
            "client_id": stored_client_id,
            "collection_id": collection_id,
            "threshold_test": results_by_threshold
        }
        
    except Exception as e:
        return {"error": str(e)}   
    
@router.get("/debug/{demo_id}")
async def debug_demo_session(demo_id: str, db: Session = Depends(get_db)):
    """🔍 Debug endpoint - Check what's actually stored for a demo"""
    try:
        if demo_id not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session = demo_sessions[demo_id]
        stored_client_id = demo_session.get("client_id")
        collection_id = demo_session.get("knowledge_collection_id")
        
        debug_info = {
            "demo_session": demo_session,
            "stored_client_id": stored_client_id,
            "collection_id": collection_id,
            "database_check": {}
        }
        
        if stored_client_id:
            # Check if client exists in database
            client_repo = ClientRepository()
            client = client_repo.get_by_client_id(db, stored_client_id)
            debug_info["database_check"]["client_exists"] = client is not None
            if client:
                debug_info["database_check"]["client_name"] = client.name
                debug_info["database_check"]["client_email"] = client.email
        
        if collection_id:
            # Check if collection exists
            collection_repo = KnowledgeCollectionRepository()
            collection = collection_repo.get_by_collection_id(db, collection_id)
            debug_info["database_check"]["collection_exists"] = collection is not None
            
            if collection:
                # Check knowledge items
                item_repo = KnowledgeItemRepository()
                items = item_repo.get_by_collection_id(db, collection_id)
                debug_info["database_check"]["knowledge_items_count"] = len(items)
                debug_info["database_check"]["knowledge_items"] = []
                
                for item in items:
                    item_info = {
                        "item_id": item.item_id,
                        "title": item.title,
                        "content_length": len(item.content),
                        "content_preview": item.content[:200] + "..." if len(item.content) > 200 else item.content
                    }
                    debug_info["database_check"]["knowledge_items"].append(item_info)
                    
                    # Check if embeddings exist for this item
                    embeddings = db.query(VectorEmbedding).filter(
                        VectorEmbedding.item_id == item.item_id
                    ).all()
                    item_info["embeddings_count"] = len(embeddings)
                    if embeddings:
                        # Check embedding format
                        first_embedding = embeddings[0]
                        try:
                            import json
                            parsed_vector = json.loads(first_embedding.vector)
                            item_info["embedding_dimensions"] = len(parsed_vector) if isinstance(parsed_vector, list) else "invalid"
                            item_info["embedding_type"] = type(parsed_vector).__name__
                        except:
                            item_info["embedding_format"] = "parse_error"
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Debug error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 
    
# Add this simple recovery endpoint to backend/app/api/demo/routes.py

@router.post("/recover/{demo_id}")
async def recover_demo_session(demo_id: str, db: Session = Depends(get_db)):
    """🔄 Manually recover a demo session from database after server restart"""
    try:
        # Construct expected client ID
        demo_client_id = f"demo_{demo_id[:8]}"
        
        # Check if demo client exists in database
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, demo_client_id)
        
        if not client:
            raise HTTPException(status_code=404, detail=f"Demo client {demo_client_id} not found in database")
        
        # Find collection for this client
        collection_repo = KnowledgeCollectionRepository()
        collections = collection_repo.get_by_client_id(db, client.client_id)
        collection_id = collections[0].collection_id if collections else None
        
        if not collection_id:
            raise HTTPException(status_code=404, detail="No collection found for demo client")
        
        # Recover demo session
        demo_sessions[demo_id] = {
            "demo_id": demo_id,
            "api_key": f"demo_{demo_id}",
            "target_url": "https://recovered-demo.com",
            "expires_at": datetime.utcnow() + timedelta(hours=24),
            "status": "ready",
            "knowledge_collection_id": collection_id,
            "message_count": 0,
            "crawl_job_id": None,
            "client_id": client.client_id
        }
        
        logger.info(f"🔄 Manually recovered demo session: {demo_id}")
        
        return {
            "status": "recovered",
            "demo_id": demo_id,
            "client_id": client.client_id,
            "collection_id": collection_id,
            "message": "Demo session recovered successfully"
        }
        
    except Exception as e:
        logger.error(f"Demo recovery error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recovery failed: {str(e)}")   
    
# Add this debug endpoint to backend/app/api/demo/routes.py

@router.post("/debug-search-detailed/{demo_id}")
async def debug_search_process_detailed(demo_id: str, request: Request, db: Session = Depends(get_db)):
    """🔍 Debug the search process step by step to find why embeddings aren't found"""
    try:
        if demo_id not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session = demo_sessions[demo_id]
        stored_client_id = demo_session.get("client_id")
        collection_id = demo_session.get("knowledge_collection_id")
        
        body = await request.json()
        message = body.get("message", "hello")
        
        debug_info = {
            "query": message,
            "demo_client_id": stored_client_id,
            "collection_id": collection_id,
            "search_debug": {}
        }
        
        # Step 1: Get query embedding
        from app.services.llm.llm_factory import LLMFactory
        llm_service = LLMFactory.create_llm_service(db, stored_client_id)
        query_embedding = await llm_service.generate_embeddings(message)
        
        debug_info["search_debug"]["query_embedding"] = {
            "dimensions": len(query_embedding),
            "first_values": query_embedding[:3]
        }
        
        # Step 2: Check what's in the database for this collection
        embeddings_query = db.query(VectorEmbedding, KnowledgeItem).join(
            KnowledgeItem, VectorEmbedding.item_id == KnowledgeItem.item_id
        ).filter(
            KnowledgeItem.collection_id == collection_id
        ).all()
        
        debug_info["search_debug"]["database_embeddings"] = {
            "total_found": len(embeddings_query),
            "embeddings": []
        }
        
        # Step 3: Check each stored embedding
        for embedding, item in embeddings_query:
            try:
                import json
                stored_vector = json.loads(embedding.vector)
                
                embedding_info = {
                    "item_id": item.item_id,
                    "title": item.title,
                    "embedding_id": embedding.embedding_id,
                    "stored_dimensions": len(stored_vector) if isinstance(stored_vector, list) else "invalid",
                    "stored_type": type(stored_vector).__name__,
                    "first_values": stored_vector[:3] if isinstance(stored_vector, list) else None
                }
                
                # Calculate similarity manually
                if isinstance(stored_vector, list) and len(stored_vector) == len(query_embedding):
                    import numpy as np
                    a = np.array(query_embedding)
                    b = np.array(stored_vector)
                    
                    norm_a = np.linalg.norm(a)
                    norm_b = np.linalg.norm(b)
                    
                    if norm_a > 0 and norm_b > 0:
                        similarity = np.dot(a, b) / (norm_a * norm_b)
                        embedding_info["manual_similarity"] = float(similarity)
                    else:
                        embedding_info["manual_similarity"] = "zero_norm"
                else:
                    embedding_info["manual_similarity"] = "dimension_mismatch"
                
                debug_info["search_debug"]["database_embeddings"]["embeddings"].append(embedding_info)
                
            except Exception as e:
                debug_info["search_debug"]["database_embeddings"]["embeddings"].append({
                    "item_id": item.item_id,
                    "error": str(e)
                })
        
        # Step 4: Test vector repository directly with exact parameters
        from app.repositories.vector_repository import VectorRepository
        vector_repo = VectorRepository()
        
        # Test the exact query used by the search
        try:
            direct_results = vector_repo.find_similar_items(
                db=db,
                query_vector=query_embedding,
                client_id=stored_client_id,
                limit=5,
                threshold=0.0,
                collection_id=collection_id
            )
            
            debug_info["search_debug"]["direct_vector_search"] = {
                "results_count": len(direct_results),
                "results": direct_results[:2] if direct_results else []
            }
        except Exception as e:
            debug_info["search_debug"]["direct_vector_search"] = {"error": str(e)}
        
        # Step 5: Test collection repository
        from app.repositories.knowledge_repository import KnowledgeCollectionRepository
        collection_repo = KnowledgeCollectionRepository()
        
        try:
            # Check if collection belongs to client
            collection = collection_repo.get_by_collection_id(db, collection_id)
            debug_info["search_debug"]["collection_check"] = {
                "collection_exists": collection is not None,
                "collection_client_id": collection.client_id if collection else None,
                "client_ids_match": collection.client_id == stored_client_id if collection else False
            }
            
            # Get all collections for this client
            client_collections = collection_repo.get_by_client_id(db, stored_client_id)
            debug_info["search_debug"]["client_collections"] = {
                "count": len(client_collections),
                "collection_ids": [c.collection_id for c in client_collections]
            }
            
        except Exception as e:
            debug_info["search_debug"]["collection_check"] = {"error": str(e)}
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Detailed search debug error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))        
    
# Add this debug endpoint to backend/app/api/demo/routes.py

@router.post("/debug-vector-repository/{demo_id}")
async def debug_vector_repository_method(demo_id: str, request: Request, db: Session = Depends(get_db)):
    """🐛 Debug the exact VectorRepository.find_similar_items process"""
    try:
        if demo_id not in demo_sessions:
            raise HTTPException(status_code=404, detail="Demo session not found")
        
        demo_session = demo_sessions[demo_id]
        stored_client_id = demo_session.get("client_id")
        collection_id = demo_session.get("knowledge_collection_id")
        
        body = await request.json()
        message = body.get("message", "hello")
        
        # Get query embedding
        from app.services.llm.llm_factory import LLMFactory
        llm_service = LLMFactory.create_llm_service(db, stored_client_id)
        query_embedding = await llm_service.generate_embeddings(message)
        
        debug_info = {
            "query": message,
            "client_id": stored_client_id,
            "collection_id": collection_id,
            "vector_repo_debug": {}
        }
        
        # Manually execute the EXACT query that find_similar_items does
        from app.repositories.knowledge_repository import KnowledgeCollectionRepository
        collection_repo = KnowledgeCollectionRepository()
        
        # Step 1: Get collection IDs (same logic as find_similar_items)
        if collection_id:
            collection = collection_repo.get_by_collection_id(db, collection_id)
            if not collection or collection.client_id != stored_client_id:
                debug_info["vector_repo_debug"]["collection_check"] = "FAILED - collection not found or wrong client"
                return debug_info
            collection_ids = [collection_id]
        else:
            client_collections = collection_repo.get_by_client_id(db, stored_client_id)
            collection_ids = [collection.collection_id for collection in client_collections]
        
        debug_info["vector_repo_debug"]["collection_ids"] = collection_ids
        
        if not collection_ids:
            debug_info["vector_repo_debug"]["error"] = "No collection IDs found"
            return debug_info
        
        # Step 2: Execute the EXACT database query from find_similar_items
        query = db.query(
            VectorEmbedding, KnowledgeItem, KnowledgeCollection
        ).join(
            KnowledgeItem, VectorEmbedding.item_id == KnowledgeItem.item_id
        ).join(
            KnowledgeCollection, KnowledgeItem.collection_id == KnowledgeCollection.collection_id
        ).filter(
            KnowledgeItem.collection_id.in_(collection_ids)
        )
        
        # Execute query and get results
        query_results = query.all()
        debug_info["vector_repo_debug"]["query_results_count"] = len(query_results)
        
        # Step 3: Process each result exactly like find_similar_items does
        results = []
        for embedding, item, collection in query_results:
            try:
                # Parse vector exactly like the VectorRepository does
                item_vector = embedding.vector
                
                debug_info["vector_repo_debug"]["raw_vector_type"] = type(item_vector).__name__
                debug_info["vector_repo_debug"]["raw_vector_value"] = str(item_vector)[:100] + "..."
                
                # Check if it's a string (should be)
                if isinstance(item_vector, str):
                    try:
                        import json
                        parsed_vector = json.loads(item_vector)
                        debug_info["vector_repo_debug"]["parsed_vector_type"] = type(parsed_vector).__name__
                        debug_info["vector_repo_debug"]["parsed_vector_length"] = len(parsed_vector) if isinstance(parsed_vector, list) else "not_list"
                        
                        if isinstance(parsed_vector, list):
                            item_vector = parsed_vector
                        else:
                            debug_info["vector_repo_debug"]["parse_error"] = f"Parsed to {type(parsed_vector)}, not list"
                            continue
                    except Exception as parse_error:
                        debug_info["vector_repo_debug"]["json_parse_error"] = str(parse_error)
                        continue
                
                # Validate dimensions
                if not isinstance(item_vector, list) or len(item_vector) != len(query_embedding):
                    debug_info["vector_repo_debug"]["dimension_check"] = f"FAILED - item:{len(item_vector) if isinstance(item_vector, list) else 'not_list'} vs query:{len(query_embedding)}"
                    continue
                
                # Calculate similarity (same method as VectorRepository)
                import numpy as np
                a = np.array(query_embedding)
                b = np.array(item_vector)
                
                norm_a = np.linalg.norm(a)
                norm_b = np.linalg.norm(b)
                if norm_a == 0 or norm_b == 0:
                    similarity = 0
                else:
                    similarity = np.dot(a, b) / (norm_a * norm_b)
                
                debug_info["vector_repo_debug"]["similarity_calculated"] = float(similarity)
                
                # Check threshold (testing with 0.0)
                threshold = 0.0
                if similarity >= threshold:
                    results.append({
                        "item_id": item.item_id,
                        "title": item.title,
                        "similarity": float(similarity)
                    })
                    debug_info["vector_repo_debug"]["threshold_passed"] = True
                else:
                    debug_info["vector_repo_debug"]["threshold_failed"] = f"similarity {similarity} < threshold {threshold}"
                
            except Exception as process_error:
                debug_info["vector_repo_debug"]["processing_error"] = str(process_error)
                import traceback
                debug_info["vector_repo_debug"]["processing_traceback"] = traceback.format_exc()
        
        debug_info["vector_repo_debug"]["manual_results_count"] = len(results)
        debug_info["vector_repo_debug"]["manual_results"] = results
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Vector repository debug error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))     