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
    
    This endpoint receives real-time notifications when emails arrive
    and triggers the AI response processing.
    """
    try:
        # Log request details for debugging
        headers = dict(request.headers)
        logger.info(f"Gmail Pub/Sub webhook received - Headers: {headers}")
        
        # Get request body
        body = await request.body()
        logger.info(f"Gmail Pub/Sub webhook body length: {len(body)} bytes")
        
        # Parse JSON
        try:
            payload = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in Pub/Sub webhook: {e}")
            logger.error(f"Raw body: {body[:500]}...")  # Log first 500 chars
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload"
            )
        
        logger.info(f"Received Gmail Pub/Sub notification: {payload}")
        
        # Process the notification
        pubsub_service = GmailPubSubService(db)
        result = await pubsub_service.process_pubsub_notification(payload)
        
        if result.get("status") == "success":
            logger.info(f"Successfully processed Gmail notification: {result}")
            return {"status": "success", "processed": True}
            
        elif result.get("status") == "no_data":
            # This is normal - sometimes we get empty notifications
            logger.debug("Received empty Pub/Sub notification")
            return {"status": "success", "processed": False}
            
        else:
            # Log the issue but still return 200 to avoid Pub/Sub retries
            logger.warning(f"Gmail notification processing issue: {result}")
            return {"status": "warning", "result": result}
    
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Error processing Gmail Pub/Sub webhook: {e}")
        # Return 200 to avoid Pub/Sub retries for application errors
        return {"status": "error", "error": str(e)}

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