# backend/app/services/telephony/telephony_service_factory.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.telephony.enhanced_telephony_service import EnhancedTelephonyService
from app.services.telephony.twilio_provider_service import TwilioProviderService
from app.services.voice.voice_service_factory import VoiceServiceFactory
from app.services.voice.voice_chat_bridge import VoiceChatBridge
from app.repositories.telephony_repository import (
    CallRepository, 
    PhoneNumberRepository,
    VoiceSessionRepository,
    CallEventRepository
)
from app.repositories.telephony_analytics import TelephonyAnalyticsRepository
from app.core.config.settings import settings
from app.core import logger

class TelephonyServiceFactory:
    """Factory class for creating telephony service instances - follows LLMFactory pattern."""
    
    @staticmethod
    def create_telephony_service(
        db: Session,
        client_id: str,
        provider: str = "twilio",
        override_settings: Optional[Dict[str, Any]] = None
    ) -> EnhancedTelephonyService:
        """
        Create a telephony service instance.
        
        Args:
            db: Database session
            client_id: Client ID for multi-tenant isolation
            provider: Telephony provider (currently only "twilio" supported)  
            override_settings: Optional settings overrides
            
        Returns:
            Configured EnhancedTelephonyService instance
            
        Raises:
            ValueError: If required configuration is missing or invalid provider
        """
        if provider != "twilio":
            raise ValueError(f"Unsupported telephony provider: {provider}. Only 'twilio' is currently supported.")
        
        # Validate required configuration
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.error("Twilio credentials not configured!")
            raise ValueError("Twilio Account SID and Auth Token are required but not configured")
        
        if not settings.OPENAI_API_KEY:
            logger.error("OpenAI API key not configured for voice processing!")
            raise ValueError("OpenAI API key is required for voice processing but not configured")
        
        try:
            # Initialize repositories (dependency injection)
            call_repo = CallRepository()
            phone_repo = PhoneNumberRepository()
            voice_session_repo = VoiceSessionRepository()
            event_repo = CallEventRepository()
            analytics_repo = TelephonyAnalyticsRepository()
            
            # Initialize provider service
            twilio_service = TwilioProviderService(
                client_id=client_id,
                override_settings=override_settings
            )
            
            # Initialize voice services
            voice_service = VoiceServiceFactory.create_voice_service(
                client_id=client_id,
                override_settings=override_settings
            )
            
            # Initialize voice chat bridge
            voice_chat_bridge = VoiceChatBridge(
                db=db,
                client_id=client_id,
                voice_session_repo=voice_session_repo,
                call_repo=call_repo
            )
            
            # Create main telephony service
            telephony_service = EnhancedTelephonyService(
                db=db,
                client_id=client_id,
                call_repo=call_repo,
                phone_repo=phone_repo,
                voice_session_repo=voice_session_repo,
                event_repo=event_repo,
                analytics_repo=analytics_repo,
                twilio_service=twilio_service,
                voice_service=voice_service,
                voice_chat_bridge=voice_chat_bridge
            )
            
            logger.info(f"Created EnhancedTelephonyService for client {client_id} with provider {provider}")
            return telephony_service
            
        except Exception as e:
            logger.error(f"Failed to create telephony service for client {client_id}: {str(e)}")
            raise ValueError(f"Telephony service initialization failed: {str(e)}")
    
    @staticmethod
    def create_provider_service(
        client_id: str,
        provider: str = "twilio",
        override_settings: Optional[Dict[str, Any]] = None
    ) -> TwilioProviderService:
        """
        Create a telephony provider service only.
        
        Args:
            client_id: Client ID for logging
            provider: Provider name
            override_settings: Optional settings overrides
            
        Returns:
            Provider service instance
        """
        if provider != "twilio":
            raise ValueError(f"Unsupported provider: {provider}")
        
        logger.info(f"Creating Twilio provider service for client {client_id}")
        return TwilioProviderService(
            client_id=client_id,
            override_settings=override_settings
        )
    
    @staticmethod
    def create_voice_pipeline_service(
        db: Session,
        client_id: str,
        call_id: str,
        override_settings: Optional[Dict[str, Any]] = None
    ):
        """
        Create a voice pipeline service for call processing.
        
        Args:
            db: Database session
            client_id: Client ID
            call_id: Call ID for processing
            override_settings: Optional settings overrides
            
        Returns:
            VoicePipelineService instance
        """
        from app.services.voice.voice_pipeline_service import VoicePipelineService
        
        # Initialize required services
        voice_service = VoiceServiceFactory.create_voice_service(
            client_id=client_id,
            override_settings=override_settings
        )
        
        voice_chat_bridge = VoiceChatBridge(db=db, client_id=client_id)
        event_repo = CallEventRepository()
        
        pipeline_service = VoicePipelineService(
            db=db,
            client_id=client_id,
            call_id=call_id,
            voice_service=voice_service,
            voice_chat_bridge=voice_chat_bridge,
            event_repo=event_repo
        )
        
        logger.info(f"Created VoicePipelineService for client {client_id}, call {call_id}")
        return pipeline_service
    
    @staticmethod
    def get_provider_capabilities(provider: str = "twilio") -> Dict[str, Any]:
        """
        Get capabilities and configuration options for a provider.
        
        Args:
            provider: Provider name
            
        Returns:
            Provider capabilities and options
        """
        if provider == "twilio":
            return {
                "provider": "twilio",
                "features": [
                    "phone_number_provisioning",
                    "inbound_calls",
                    "outbound_calls", 
                    "call_recording",
                    "webhooks",
                    "sms_support"
                ],
                "supported_countries": ["US", "CA", "UK", "AU"],  # Common ones
                "voice_formats": ["wav", "mp3", "mulaw"],
                "webhook_events": [
                    "call-started",
                    "call-answered", 
                    "call-completed",
                    "speech-detected",
                    "speech-timeout"
                ],
                "configuration_required": [
                    "TWILIO_ACCOUNT_SID",
                    "TWILIO_AUTH_TOKEN",
                    "TWILIO_WEBHOOK_URL"
                ]
            }
        else:
            return {"provider": provider, "supported": False}
    
    @staticmethod
    def validate_configuration(provider: str = "twilio") -> Dict[str, Any]:
        """
        Validate configuration for a provider.
        
        Args:
            provider: Provider name
            
        Returns:
            Validation results
        """
        if provider == "twilio":
            issues = []
            
            if not settings.TWILIO_ACCOUNT_SID:
                issues.append("TWILIO_ACCOUNT_SID not configured")
            
            if not settings.TWILIO_AUTH_TOKEN:
                issues.append("TWILIO_AUTH_TOKEN not configured")
            
            if not settings.OPENAI_API_KEY:
                issues.append("OPENAI_API_KEY not configured (required for voice)")
            
            # Check webhook URL if configured
            webhook_url = getattr(settings, "TWILIO_WEBHOOK_URL", None)
            if webhook_url and not webhook_url.startswith("https://"):
                issues.append("TWILIO_WEBHOOK_URL should use HTTPS")
            
            return {
                "provider": provider,
                "valid": len(issues) == 0,
                "issues": issues,
                "configured_items": {
                    "account_sid": bool(settings.TWILIO_ACCOUNT_SID),
                    "auth_token": bool(settings.TWILIO_AUTH_TOKEN),
                    "webhook_url": bool(webhook_url),
                    "openai_api_key": bool(settings.OPENAI_API_KEY)
                }
            }
        else:
            return {
                "provider": provider,
                "valid": False,
                "issues": [f"Provider '{provider}' not supported"]
            }
    
    @staticmethod
    def estimate_costs(
        call_minutes: float = 0,
        stt_minutes: float = 0,
        tts_characters: int = 0,
        phone_numbers: int = 0,
        provider: str = "twilio"
    ) -> Dict[str, float]:
        """
        Estimate telephony and voice processing costs.
        
        Args:
            call_minutes: Minutes of phone calls
            stt_minutes: Minutes of speech-to-text processing
            tts_characters: Characters for text-to-speech
            phone_numbers: Number of phone numbers provisioned
            provider: Provider for cost calculation
            
        Returns:
            Cost breakdown in USD
        """
        if provider == "twilio":
            # Twilio pricing (approximate, varies by region)
            call_cost_per_minute = 0.0130  # US inbound
            phone_number_cost_per_month = 1.15  # US phone number
            
            # OpenAI voice pricing
            stt_cost_per_minute = 0.006  # Whisper
            tts_cost_per_1k_chars = 0.015  # TTS-1
            
            call_cost = call_minutes * call_cost_per_minute
            phone_cost = phone_numbers * phone_number_cost_per_month
            stt_cost = stt_minutes * stt_cost_per_minute
            tts_cost = (tts_characters / 1000) * tts_cost_per_1k_chars
            
            total_cost = call_cost + phone_cost + stt_cost + tts_cost
            
            return {
                "call_cost_usd": round(call_cost, 4),
                "phone_number_cost_usd": round(phone_cost, 4),
                "stt_cost_usd": round(stt_cost, 4),
                "tts_cost_usd": round(tts_cost, 4),
                "total_cost_usd": round(total_cost, 4),
                "provider": provider
            }
        else:
            return {"error": f"Cost estimation not available for provider '{provider}'"}