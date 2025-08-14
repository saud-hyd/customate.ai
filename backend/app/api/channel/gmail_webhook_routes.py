# backend/app/api/channel/gmail_webhook_routes.py

from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import json
import base64

from app.core.database.dependencies import get_db
from app.services.channel.gmail_pubsub_service import GmailPubSubService
from app.core import logger

router = APIRouter(prefix="/channel/gmail/webhook", tags=["gmail-webhook"])

@router.post("/pubsub")
async def gmail_pubsub_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Gmail push notifications from Google Cloud Pub/Sub.
    
    CRITICAL: Immediately acknowledge to prevent Google's duplicate retries.
    Process emails in background to avoid timeout issues.
    """
    try:
        # Get request body
        body = await request.body()
        
        # Parse JSON quickly
        try:
            payload = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in Pub/Sub webhook: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload"
            )
        
        # IMMEDIATE ACKNOWLEDGMENT - Return 200 within seconds to prevent Google retries
        import asyncio
        
        # Extract message ID for deduplication
        message = payload.get('message', {})
        message_id = message.get('messageId', 'unknown')
        publish_time = message.get('publishTime', 'unknown')
        
        logger.info(f"📨 Gmail webhook received - MessageID: {message_id} PublishTime: {publish_time}")
        
        # Schedule background processing (fire-and-forget)
        asyncio.create_task(
            process_gmail_notification_background(payload, message_id, publish_time)
        )
        
        # IMMEDIATE RESPONSE to Google within 2-3 seconds
        return {
            "status": "acknowledged", 
            "message_id": message_id,
            "processing": "background"
        }
    
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Error in Gmail Pub/Sub webhook: {e}")
        # Always return 200 to avoid Google retries
        return {"status": "error", "error": str(e)}


# Global set to track processed message IDs and prevent duplicates
_processed_messages = set()
_processing_messages = set()

async def process_gmail_notification_background(
    payload: dict, 
    message_id: str, 
    publish_time: str
):
    """
    Background processing of Gmail notifications with duplicate prevention.
    """
    from app.core.database.dependencies import get_db_session
    
    # Prevent duplicate processing
    global _processed_messages, _processing_messages
    
    if message_id in _processed_messages:
        logger.info(f"⚠️ Skipping already processed message: {message_id}")
        return
    
    if message_id in _processing_messages:
        logger.info(f"⚠️ Message already being processed: {message_id}")
        return
    
    _processing_messages.add(message_id)
    
    try:
        logger.info(f"🔄 Background processing Gmail notification: {message_id}")
        
        # Get database session for background processing
        async with get_db_session() as db:
            pubsub_service = GmailPubSubService(db)
            result = await pubsub_service.process_pubsub_notification(payload)
            
            if result.get("status") == "success":
                logger.info(f"✅ Successfully processed Gmail notification: {message_id}")
                _processed_messages.add(message_id)
                
                # Cleanup old processed messages to prevent memory leak (keep last 1000)
                if len(_processed_messages) > 1000:
                    old_messages = list(_processed_messages)[:500]
                    for old_msg in old_messages:
                        _processed_messages.remove(old_msg)
                        
            elif result.get("status") == "no_data":
                logger.debug(f"📭 Empty Gmail notification: {message_id}")
                _processed_messages.add(message_id)
                
            else:
                logger.warning(f"⚠️ Gmail notification processing issue for {message_id}: {result}")
    
    except Exception as e:
        logger.error(f"❌ Error in background Gmail processing for {message_id}: {e}")
        
    finally:
        _processing_messages.discard(message_id)

@router.get("/pubsub")
async def gmail_pubsub_verification(request: Request):
    """
    Handle Pub/Sub webhook verification (if needed).
    Some setups require GET endpoint verification.
    """
    # Extract verification token or challenge if provided
    challenge = request.query_params.get('challenge')
    
    if challenge:
        logger.info(f"Gmail Pub/Sub webhook verification with challenge: {challenge}")
        return {"challenge": challenge}
    
    logger.info("Gmail Pub/Sub webhook verification - healthy")
    return {"status": "healthy", "webhook": "gmail-pubsub"}

@router.post("/test")
async def test_gmail_webhook(
    test_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Test endpoint for Gmail webhook processing.
    Useful for development and debugging.
    """
    try:
        logger.info(f"Gmail webhook test with data: {test_data}")
        
        # Create a mock Pub/Sub notification for testing
        mock_notification = {
            "message": {
                "data": base64.b64encode(json.dumps({
                    "emailAddress": test_data.get("email", "test@gmail.com"),
                    "historyId": test_data.get("historyId", "12345")
                }).encode()).decode(),
                "messageId": "test-message-id",
                "publishTime": "2025-08-09T16:00:00Z"
            }
        }
        
        # Process the test notification
        pubsub_service = GmailPubSubService(db)
        result = await pubsub_service.process_pubsub_notification(mock_notification)
        
        return {
            "status": "test_completed",
            "test_data": test_data,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error in Gmail webhook test: {e}")
        return {
            "status": "test_error",
            "error": str(e)
        }