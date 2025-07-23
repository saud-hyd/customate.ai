# backend/app/api/telephony/webhook_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging

from app.core.database.dependencies import get_db
from app.services.telephony.telephony_service_factory import TelephonyServiceFactory
from app.repositories.telephony_repository import PhoneNumberRepository
from app.core import logger

router = APIRouter(prefix="/webhooks/twilio", tags=["twilio-webhooks"])

async def validate_twilio_signature(
    request: Request,
    x_twilio_signature: Optional[str] = Header(None)
) -> bool:
    """
    Validate Twilio webhook signature for security.
    This is a dependency that can be used to secure webhook endpoints.
    """
    if not x_twilio_signature:
        logger.warning("Missing Twilio signature header")
        return False
    
    try:
        # Get request URL and form data
        url = str(request.url)
        form_data = await request.form()
        post_vars = dict(form_data)
        
        # For now, we'll create a basic service to validate
        # In production, this would use the actual client's Twilio service
        from app.services.telephony.twilio_provider_service import TwilioProviderService
        twilio_service = TwilioProviderService(client_id="system")
        
        # Validate signature
        is_valid = await twilio_service.validate_webhook_signature(
            url=url,
            post_vars=post_vars,
            signature=x_twilio_signature
        )
        
        if not is_valid:
            logger.warning(f"Invalid Twilio signature for URL: {url}")
        
        return is_valid
        
    except Exception as e:
        logger.error(f"Error validating Twilio signature: {str(e)}")
        return False

@router.post("/voice")
async def handle_voice_webhook(
    request: Request,
    db: Session = Depends(get_db),
    # Note: Webhook validation disabled for development, enable in production
    # signature_valid: bool = Depends(validate_twilio_signature)
):
    """
    Handle incoming voice calls from Twilio.
    
    This endpoint receives Twilio voice webhooks when calls are initiated.
    """
    try:
        # Parse Twilio webhook data
        form_data = await request.form()
        call_data = dict(form_data)
        
        logger.info(f"Received Twilio voice webhook: {call_data.get('CallSid', 'unknown')}")
        
        # Extract call information
        to_number = call_data.get("To", "").replace("+", "")
        from_number = call_data.get("From", "")
        call_sid = call_data.get("CallSid", "")
        call_status = call_data.get("CallStatus", "")
        
        if not to_number or not from_number or not call_sid:
            logger.error("Missing required Twilio webhook parameters")
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>Service unavailable</Say></Response>',
                media_type="application/xml"
            )
        
        # Find the client who owns this phone number
        phone_repo = PhoneNumberRepository()
        phone_record = phone_repo.get_by_phone_number(db, f"+{to_number}")
        
        if not phone_record:
            logger.warning(f"Received call to unknown phone number: +{to_number}")
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not in service</Say></Response>',
                media_type="application/xml"
            )
        
        # Create telephony service for the client
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=phone_record.client_id
        )
        
        # Process the inbound call
        result = await telephony_service.process_inbound_call(
            phone_number=f"+{to_number}",
            caller_number=from_number,
            twilio_call_sid=call_sid,
            call_data=call_data
        )
        
        if result["success"]:
            logger.info(f"Inbound call processed successfully: {result['call_id']}")
            return Response(
                content=result["twiml_response"],
                media_type="application/xml"
            )
        else:
            logger.error(f"Failed to process inbound call: {result.get('error')}")
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are experiencing technical difficulties. Please try again later.</Say></Response>',
                media_type="application/xml"
            )
            
    except Exception as e:
        logger.error(f"Error handling voice webhook: {str(e)}")
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>System error occurred</Say></Response>',
            media_type="application/xml"
        )

@router.post("/voice/{call_id}/process")
async def process_voice_input(
    call_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Process voice input from caller during an active call.
    
    This endpoint receives speech input from Twilio and processes it through
    the voice pipeline (STT → Chat → TTS).
    """
    try:
        # Parse Twilio webhook data
        form_data = await request.form()
        webhook_data = dict(form_data)
        
        logger.info(f"Processing voice input for call {call_id}")
        
        # Extract speech data
        speech_result = webhook_data.get("SpeechResult", "")
        confidence = webhook_data.get("Confidence", "0")
        
        if not speech_result:
            logger.info(f"No speech detected for call {call_id}")
            # Return TwiML to ask user to speak again
            return Response(
                content='''<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say>I didn't hear anything. Please speak clearly.</Say>
                    <Gather input="speech" timeout="10" speechTimeout="auto" action="/api/telephony/webhooks/twilio/voice/{}/process">
                        <Say>How can I help you?</Say>
                    </Gather>
                </Response>'''.format(call_id),
                media_type="application/xml"
            )
        
        # Get call information to find the client
        from app.repositories.telephony_repository import CallRepository
        call_repo = CallRepository()
        call_record = call_repo.get_by_call_id(db, call_id)
        
        if not call_record:
            logger.error(f"Call {call_id} not found")
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>Call session expired</Say></Response>',
                media_type="application/xml"
            )
        
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=call_record.client_id
        )
        
        # Process the voice input through pipeline
        # Note: For Twilio integration, we work with transcribed text directly
        # since Twilio handles the STT for us through their speech recognition
        
        # Create voice pipeline for processing
        from app.services.telephony.telephony_service_factory import TelephonyServiceFactory
        pipeline_service = TelephonyServiceFactory.create_voice_pipeline_service(
            db=db,
            client_id=call_record.client_id,
            call_id=call_id
        )
        
        # Process voice message (we already have the transcribed text)
        # For Twilio integration, we'll process the text directly through chat
        voice_bridge = pipeline_service.voice_chat_bridge
        
        caller_info = {
            "caller_number": call_record.caller_number,
            "phone_number": call_record.phone_number,
            "direction": call_record.direction
        }
        
        voice_metadata = {
            "confidence": float(confidence),
            "twilio_speech_result": True
        }
        
        # Process through chat bridge
        chat_result = await voice_bridge.process_voice_message(
            call_id=call_id,
            transcribed_text=speech_result,
            user_info=caller_info,
            voice_metadata=voice_metadata
        )
        
        if not chat_result["success"]:
            logger.error(f"Chat processing failed for call {call_id}: {chat_result.get('error')}")
            return Response(
                content='''<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say>I'm sorry, I'm having trouble understanding. Could you please repeat that?</Say>
                    <Gather input="speech" timeout="10" speechTimeout="auto" action="/api/telephony/webhooks/twilio/voice/{}/process">
                        <Say>How can I help you?</Say>
                    </Gather>
                </Response>'''.format(call_id),
                media_type="application/xml"
            )
        
        # Generate TwiML response with the chat response
        response_text = chat_result["response_text"]
        
        # For better user experience, we'll use Twilio's TTS instead of OpenAI for response
        # This reduces latency and complexity
        twiml_response = f'''<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="alice">{response_text}</Say>
            <Gather input="speech" timeout="10" speechTimeout="auto" action="/api/telephony/webhooks/twilio/voice/{call_id}/process">
                <Say voice="alice">Is there anything else I can help you with?</Say>
            </Gather>
        </Response>'''
        
        logger.info(f"Voice input processed successfully for call {call_id}")
        
        return Response(
            content=twiml_response,
            media_type="application/xml"
        )
        
    except Exception as e:
        logger.error(f"Error processing voice input for call {call_id}: {str(e)}")
        return Response(
            content=f'''<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>I'm having technical difficulties. Please try again later.</Say>
            </Response>''',
            media_type="application/xml"
        )

@router.post("/status")
async def handle_status_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Twilio call status callbacks.
    
    This endpoint receives call status updates (completed, failed, etc.)
    from Twilio throughout the call lifecycle.
    """
    try:
        # Parse Twilio webhook data
        form_data = await request.form()
        status_data = dict(form_data)
        
        call_sid = status_data.get("CallSid", "")
        call_status = status_data.get("CallStatus", "")
        call_duration = status_data.get("CallDuration", "0")
        
        logger.info(f"Received status callback for call {call_sid}: {call_status}")
        
        if not call_sid:
            logger.warning("Status callback missing CallSid")
            return {"status": "error", "message": "Missing CallSid"}
        
        # Find the call record
        from app.repositories.telephony_repository import CallRepository
        call_repo = CallRepository()
        call_record = call_repo.get_by_twilio_call_sid(db, call_sid)
        
        if not call_record:
            logger.warning(f"Call not found for Twilio SID: {call_sid}")
            return {"status": "not_found"}
        
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=call_record.client_id
        )
        
        # Handle different call statuses
        if call_status in ["completed", "failed", "canceled", "busy", "no-answer"]:
            # End the call
            end_reason = "completed" if call_status == "completed" else call_status
            duration_seconds = int(call_duration) if call_duration.isdigit() else None
            
            result = await telephony_service.end_call(
                call_id=call_record.call_id,
                end_reason=end_reason
            )
            
            # Update call record with final details
            if duration_seconds is not None:
                call_record.duration_seconds = duration_seconds
                call_record.status = "completed" if call_status == "completed" else "failed"
                db.add(call_record)
                db.commit()
            
            logger.info(f"Call {call_record.call_id} ended: {end_reason}, duration: {duration_seconds}s")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling status callback: {str(e)}")
        return {"status": "error", "message": "Internal server error"}

@router.post("/recording")
async def handle_recording_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Twilio recording callbacks.
    
    This endpoint receives recording URLs when call recordings are available.
    """
    try:
        # Parse Twilio webhook data
        form_data = await request.form()
        recording_data = dict(form_data)
        
        call_sid = recording_data.get("CallSid", "")
        recording_url = recording_data.get("RecordingUrl", "")
        recording_duration = recording_data.get("RecordingDuration", "0")
        
        logger.info(f"Received recording callback for call {call_sid}")
        
        if not call_sid or not recording_url:
            logger.warning("Recording callback missing required data")
            return {"status": "error", "message": "Missing required data"}
        
        # Find the call record
        from app.repositories.telephony_repository import CallRepository
        call_repo = CallRepository()
        call_record = call_repo.get_by_twilio_call_sid(db, call_sid)
        
        if call_record:
            # Update call record with recording URL
            call_record.recording_url = recording_url
            db.add(call_record)
            db.commit()
            
            logger.info(f"Recording URL saved for call {call_record.call_id}")
        else:
            logger.warning(f"Call not found for recording callback: {call_sid}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling recording callback: {str(e)}")
        return {"status": "error", "message": "Internal server error"}

@router.get("/health")
async def webhook_health_check():
    """Health check endpoint for Twilio webhooks."""
    return {
        "status": "healthy",
        "service": "Twilio Webhooks",
        "endpoints": [
            "/voice - Handle incoming calls",
            "/voice/{call_id}/process - Process voice input",
            "/status - Handle call status updates", 
            "/recording - Handle recording callbacks"
        ]
    }

# Error handlers for webhook-specific errors
@router.exception_handler(Exception)
async def webhook_exception_handler(request: Request, exc: Exception):
    """Global exception handler for webhook routes."""
    logger.error(f"Webhook error for {request.url}: {str(exc)}")
    
    # Always return valid TwiML for voice webhooks to prevent call failures
    if "/voice" in str(request.url):
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>System error occurred</Say></Response>',
            media_type="application/xml",
            status_code=200  # Important: Return 200 so Twilio doesn't retry
        )
    else:
        # For status/recording callbacks, return JSON error
        return {"status": "error", "message": "Internal server error"}