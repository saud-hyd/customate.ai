# backend/app/services/voice/voice_worker.py
"""
Simple Voice Worker - Clean and Maintainable
"""
import os
from livekit.agents import JobContext, WorkerOptions, cli
from sqlalchemy.orm import Session

from app.core.database.dependencies import get_db
from app.services.voice.livekit_voice_service import VoiceAgent
from app.core import logger


async def entrypoint(ctx: JobContext):
    """Simple worker entrypoint"""
    # Extract client_id from room name
    room_name = ctx.room.name
    client_id = "default_client"
    
    if room_name and room_name.startswith("voice_room_"):
        try:
            parts = room_name.split("_")
            if len(parts) >= 3:
                client_id = "_".join(parts[2:-1])
        except Exception as e:
            logger.error(f"Failed to extract client_id from {room_name}: {e}")
    
    logger.info(f"Starting voice agent for {client_id}")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Create and run simple agent
        agent = VoiceAgent(client_id, db)
        await agent.entrypoint(ctx)
    finally:
        db.close()


if __name__ == "__main__":
    # Simple worker startup
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=os.environ.get("LIVEKIT_API_KEY"),
            api_secret=os.environ.get("LIVEKIT_API_SECRET"),
            ws_url=os.environ.get("LIVEKIT_URL", "ws://localhost:7880")
        )
    )