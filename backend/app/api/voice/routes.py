# backend/app/api/voice/routes.py
import os
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from livekit.api import AccessToken, VideoGrants
from datetime import timedelta

from app.core.database.dependencies import get_db
from app.domain.client.entities import Client
from app.api.widget.routes import get_widget_client_by_api_key
from app.core import logger

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/session/create")
async def create_voice_session(
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new voice session for the client"""
    try:
        # Get API key from headers (same pattern as widget endpoints)
        api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate client using same function as widget endpoints
        client = get_widget_client_by_api_key(api_key, db)
        if not client:
            raise HTTPException(status_code=401, detail="Invalid API key")
            
        room_name = f"voice_room_{client.client_id}_{int(time.time())}"
        
        # Create access token for the client using proper LiveKit API
        grants = VideoGrants(
            room_join=True,
            can_publish=True,
            can_publish_data=True,
            can_subscribe=True,
            room=room_name
        )
        
        token = AccessToken(
            api_key=os.environ.get("LIVEKIT_API_KEY"),
            api_secret=os.environ.get("LIVEKIT_API_SECRET")
        ).with_grants(grants=grants) \
         .with_identity(identity=f"user_{client.client_id}") \
         .with_name(name=client.name or "User") \
         .with_ttl(ttl=timedelta(minutes=15))
        
        jwt_token = token.to_jwt()
        
        logger.info(f"Created voice session for client: {client.client_id}")
        
        return {
            "token": jwt_token,
            "url": os.environ.get("LIVEKIT_URL", "ws://localhost:7880"),
            "room_name": room_name
        }
        
    except Exception as e:
        logger.error(f"Failed to create voice session: {e}")
        raise HTTPException(status_code=500, detail=str(e))