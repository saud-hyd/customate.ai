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

async def quick_demo_crawl(demo_id: str, url: str, db: Session):
    """Perform quick crawl for demo (simplified for now)"""
    try:
        # For now, just simulate the crawl and mark as ready
        await asyncio.sleep(3)  # Simulate crawl time
        
        # Update demo session to ready
        if demo_id in demo_sessions:
            demo_sessions[demo_id]["status"] = "ready"
            demo_sessions[demo_id]["knowledge_collection_id"] = f"demo_collection_{demo_id}"
        
        logger.info(f"Demo crawl completed for {demo_id}")
        
    except Exception as e:
        logger.error(f"Demo crawl failed for {demo_id}: {str(e)}")
        if demo_id in demo_sessions:
            demo_sessions[demo_id]["status"] = "failed"