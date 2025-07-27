# backend/app/api/demo/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid
from datetime import datetime, timedelta
import asyncio

from app.core.database.dependencies import get_db
from app.core import logger

router = APIRouter()

# In-memory store for demo sessions (you could use Redis in production)
demo_sessions = {}

async def ensure_demo_client_exists(db: Session):
    """Ensure demo client exists in database"""
    try:
        from app.repositories.client_repository import ClientRepository
        client_repo = ClientRepository()
        
        # Check if demo client exists
        demo_client = client_repo.get_by_client_id(db, "demo")
        
        if not demo_client:
            # Create demo client
            demo_client_data = {
                "client_id": "demo",
                "name": "Demo Client",
                "email": "demo@customate.ai",
                "api_key": "demo_client_key",
                "active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            demo_client = client_repo.create(db, obj_in=demo_client_data)
            logger.info("✅ Demo client created in database")
        
        return demo_client
        
    except Exception as e:
        logger.error(f"Failed to create demo client: {e}")
        return None
    
async def quick_demo_crawl(demo_id: str, url: str, db: Session):
    """Perform quick crawl for demo with real knowledge creation"""
    try:
        logger.info(f"Starting real crawl for demo {demo_id}: {url}")
        
        # Use your existing crawl system
        from app.services.knowledge.website_analyzer import WebsiteAnalyzer
        from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository
        
        # Create a temporary knowledge collection for demo
        collection_repo = KnowledgeCollectionRepository()
        collection_data = {
            "name": f"Demo: {url}",
            "description": f"Demo crawl of {url}",
            "client_id": "demo",
            "is_demo": True
        }
        collection = collection_repo.create(db, obj_in=collection_data)
        
        # Analyze website and get top pages
        analyzer = WebsiteAnalyzer()
        analysis = await analyzer.analyze_website(url, max_pages=5)
        
        # Create knowledge items from discovered pages
        item_repo = KnowledgeItemRepository()
        for page in analysis.get("discovered_pages", [])[:5]:
            try:
                # Simple content extraction for demo
                import requests
                response = requests.get(page["url"], timeout=10)
                if response.status_code == 200:
                    # Basic text extraction (you can improve this)
                    content = response.text
                    # Remove HTML tags (basic)
                    import re
                    clean_content = re.sub('<[^<]+?>', '', content)
                    clean_content = clean_content[:2000]  # Limit for demo
                    
                    # Create knowledge item
                    item_data = {
                        "title": page.get("title", page["url"]),
                        "content": clean_content,
                        "source_url": page["url"],
                        "collection_id": collection.collection_id,
                        "client_id": "demo",
                        "item_type": "webpage"
                    }
                    item_repo.create(db, obj_in=item_data)
                    
            except Exception as e:
                logger.error(f"Failed to crawl page {page.get('url')}: {e}")
                continue
        
        # Update demo session
        demo_sessions[demo_id]["status"] = "ready"
        demo_sessions[demo_id]["knowledge_collection_id"] = collection.collection_id
        
        logger.info(f"Demo crawl completed for {demo_id} with real knowledge")
        
    except Exception as e:
        logger.error(f"Demo crawl failed for {demo_id}: {str(e)}")
        demo_sessions[demo_id]["status"] = "failed"
            

@router.post("/create")
async def create_demo_session(
    request: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a temporary demo session with quick website crawl"""
    try:
        await ensure_demo_client_exists(db)
        url = request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Generate demo session
        demo_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(minutes=30)
        temp_api_key = f"demo_{demo_id}"
        
        logger.info(f"Creating demo session {demo_id} for URL: {url}")
        
        # Quick crawl in background (we'll implement this step by step)
        background_tasks.add_task(quick_demo_crawl, demo_id, url, db)
        
        # Store demo session
        demo_sessions[demo_id] = {
            "demo_id": demo_id,
            "api_key": temp_api_key,
            "target_url": url,
            "expires_at": expires_at,
            "status": "crawling",
            "knowledge_collection_id": None
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


        