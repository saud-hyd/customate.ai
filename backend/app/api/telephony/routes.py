# backend/app/api/telephony/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
import time

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.telephony.telephony_service_factory import TelephonyServiceFactory
from app.services.analytics.usage_tracker import UsageTracker
from app.core import logger

router = APIRouter(prefix="/telephony", tags=["telephony"])

@router.post("/numbers/provision", response_model=Dict[str, Any])
async def provision_phone_number(
    area_code: Optional[str] = None,
    country_code: str = "US",
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Provision a new phone number for the client.
    
    - **area_code**: Preferred area code (US only)
    - **country_code**: Country code (US, CA, UK, etc.)
    """
    start_time = time.time()
    
    try:
        logger.info(f"Provisioning phone number for client {current_client.client_id}: area_code={area_code}, country={country_code}")
        
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Provision phone number
        result = await telephony_service.provision_phone_number(
            area_code=area_code,
            country_code=country_code
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Track usage for analytics
        try:
            usage_tracker = UsageTracker()
            usage_tracker.track_telephony_action(
                db=db,
                client_id=current_client.client_id,
                action="phone_number_provisioned",
                metadata={
                    "phone_number": result["phone_number"],
                    "country_code": country_code,
                    "response_time_ms": int((time.time() - start_time) * 1000)
                }
            )
        except Exception as e:
            logger.warning(f"Failed to track phone number provisioning: {str(e)}")
        
        logger.info(f"Phone number {result['phone_number']} provisioned successfully for client {current_client.client_id}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to provision phone number for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to provision phone number. Please try again later."
        )

@router.get("/numbers", response_model=List[Dict[str, Any]])
async def get_phone_numbers(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all phone numbers for the authenticated client."""
    try:
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Get phone numbers
        phone_numbers = telephony_service.get_phone_numbers()
        
        return phone_numbers
        
    except Exception as e:
        logger.error(f"Failed to get phone numbers for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve phone numbers"
        )

@router.delete("/numbers/{number_id}", response_model=Dict[str, Any])
async def release_phone_number(
    number_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Release a phone number back to the provider.
    
    - **number_id**: The unique identifier for the phone number
    """
    try:
        logger.info(f"Releasing phone number {number_id} for client {current_client.client_id}")
        
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Release phone number
        result = await telephony_service.release_phone_number(number_id)
        
        if not result["success"]:
            if "not found" in result["error"].lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Phone number not found"
                )
            elif "access denied" in result["error"].lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result["error"]
                )
        
        logger.info(f"Phone number {number_id} released successfully for client {current_client.client_id}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to release phone number {number_id} for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to release phone number"
        )

@router.get("/analytics", response_model=Dict[str, Any])
async def get_call_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get call analytics for the client.
    
    - **start_date**: Start date for analytics (ISO format)
    - **end_date**: End date for analytics (ISO format)
    """
    try:
        # Parse dates if provided
        start_datetime = None
        end_datetime = None
        
        if start_date:
            try:
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
                )
        
        if end_date:
            try:
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
                )
        
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Get analytics
        analytics = telephony_service.get_call_analytics(
            start_date=start_datetime,
            end_date=end_datetime
        )
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call analytics for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call analytics"
        )

@router.get("/usage", response_model=Dict[str, Any])
async def get_monthly_usage(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get monthly usage statistics for subscription management."""
    try:
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Get monthly usage
        usage = telephony_service.get_monthly_usage()
        
        return usage
        
    except Exception as e:
        logger.error(f"Failed to get monthly usage for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage statistics"
        )

@router.get("/configuration", response_model=Dict[str, Any])
async def get_telephony_configuration(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get current telephony service configuration."""
    try:
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Get configuration
        config = telephony_service.get_service_configuration()
        
        return config
        
    except Exception as e:
        logger.error(f"Failed to get configuration for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve configuration"
        )

@router.get("/health", response_model=Dict[str, Any])
async def check_telephony_health(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Check telephony service health for the client."""
    try:
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Health check
        health = await telephony_service.health_check()
        
        # Return appropriate status code
        status_code = status.HTTP_200_OK if health["healthy"] else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return health
        
    except Exception as e:
        logger.error(f"Failed to check telephony health for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed"
        )

@router.get("/voice/models", response_model=Dict[str, Any])
async def get_supported_voice_models():
    """Get supported voice models and configuration options."""
    try:
        from app.services.voice.voice_service_factory import VoiceServiceFactory
        
        # Get supported models (doesn't require authentication)
        models = VoiceServiceFactory.get_supported_models()
        
        return models
        
    except Exception as e:
        logger.error(f"Failed to get supported voice models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve voice models"
        )

@router.post("/voice/test", response_model=Dict[str, Any])
async def test_voice_synthesis(
    text: str,
    voice: str = "alloy",
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Test voice synthesis with given text and voice.
    
    - **text**: Text to synthesize
    - **voice**: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
    """
    try:
        if not text or len(text.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        if len(text) > 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text must be 500 characters or less for testing"
            )
        
        from app.services.voice.voice_service_factory import VoiceServiceFactory
        
        # Create voice service
        voice_service = VoiceServiceFactory.create_voice_service(
            client_id=current_client.client_id
        )
        
        # Test voice synthesis
        result = await voice_service.generate_speech(
            text=text,
            voice=voice,
            response_format="mp3"
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Voice synthesis failed: {result.get('error')}"
            )
        
        # Return metadata (not the actual audio data for API response)
        return {
            "success": True,
            "text_length": result["text_length"],
            "audio_size_bytes": result["audio_size_bytes"],
            "processing_time_seconds": result["processing_time_seconds"],
            "voice_used": result["voice_used"],
            "model_used": result["model_used"],
            "message": "Voice synthesis test completed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice synthesis test failed for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Voice synthesis test failed"
        )

@router.get("/providers/capabilities", response_model=Dict[str, Any])
async def get_provider_capabilities(
    provider: str = "twilio"
):
    """Get capabilities and configuration options for a provider."""
    try:
        capabilities = TelephonyServiceFactory.get_provider_capabilities(provider)
        
        if not capabilities.get("supported", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Provider '{provider}' is not supported"
            )
        
        return capabilities
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get provider capabilities for {provider}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve provider capabilities"
        )

@router.post("/cost-estimate", response_model=Dict[str, Any])
async def estimate_telephony_costs(
    call_minutes: float = 0,
    stt_minutes: float = 0,
    tts_characters: int = 0,
    phone_numbers: int = 0,
    provider: str = "twilio"
):
    """
    Estimate telephony and voice processing costs.
    
    - **call_minutes**: Estimated call minutes per month
    - **stt_minutes**: Estimated STT processing minutes per month
    - **tts_characters**: Estimated TTS characters per month
    - **phone_numbers**: Number of phone numbers to provision
    - **provider**: Telephony provider (default: twilio)
    """
    try:
        # Validate inputs
        if call_minutes < 0 or stt_minutes < 0 or tts_characters < 0 or phone_numbers < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All values must be non-negative"
            )
        
        if call_minutes > 100000 or stt_minutes > 100000 or tts_characters > 10000000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Values exceed reasonable limits for cost estimation"
            )
        
        # Get cost estimate
        costs = TelephonyServiceFactory.estimate_costs(
            call_minutes=call_minutes,
            stt_minutes=stt_minutes,
            tts_characters=tts_characters,
            phone_numbers=phone_numbers,
            provider=provider
        )
        
        if "error" in costs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=costs["error"]
            )
        
        return costs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cost estimation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cost estimation failed"
        )