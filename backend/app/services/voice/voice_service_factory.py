# backend/app/services/voice/voice_service_factory.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.voice.openai_voice_service import OpenAIVoiceService
from app.core.config.settings import settings
from app.core import logger

class VoiceServiceFactory:
    """Factory class for creating voice service instances - follows LLMFactory pattern."""
    
    @staticmethod
    def create_voice_service(
        client_id: str,
        provider: str = "openai",
        stt_model: str = "whisper-1", 
        tts_model: str = "tts-1",
        override_settings: Optional[Dict[str, Any]] = None
    ) -> OpenAIVoiceService:
        """
        Create a voice processing service instance.
        
        Args:
            client_id: Client ID for logging and analytics
            provider: Voice provider (currently only "openai" supported)
            stt_model: Speech-to-text model (whisper-1, whisper-1-hd)
            tts_model: Text-to-speech model (tts-1, tts-1-hd)
            override_settings: Optional settings overrides
            
        Returns:
            Configured OpenAI voice service instance
            
        Raises:
            ValueError: If OpenAI API key not configured or invalid provider
        """
        if provider != "openai":
            raise ValueError(f"Unsupported voice provider: {provider}. Only 'openai' is currently supported.")
        
        if not settings.OPENAI_API_KEY:
            logger.error("OpenAI API key not configured for voice services!")
            raise ValueError("OpenAI API key is required for voice services but not configured")
        
        # Apply override settings if provided
        final_stt_model = stt_model
        final_tts_model = tts_model
        
        if override_settings:
            final_stt_model = override_settings.get("stt_model", stt_model)
            final_tts_model = override_settings.get("tts_model", tts_model)
        
        # Validate model names
        supported_stt_models = ["whisper-1"]
        supported_tts_models = ["tts-1", "tts-1-hd"]
        
        if final_stt_model not in supported_stt_models:
            logger.warning(f"Unknown STT model {final_stt_model}, falling back to whisper-1")
            final_stt_model = "whisper-1"
        
        if final_tts_model not in supported_tts_models:
            logger.warning(f"Unknown TTS model {final_tts_model}, falling back to tts-1")
            final_tts_model = "tts-1"
        
        logger.info(f"Creating OpenAI voice service for client {client_id}: STT={final_stt_model}, TTS={final_tts_model}")
        
        return OpenAIVoiceService(
            client_id=client_id,
            stt_model=final_stt_model,
            tts_model=final_tts_model
        )
    
    @staticmethod
    def create_stt_service(
        client_id: str,
        model: str = "whisper-1",
        language: Optional[str] = None
    ) -> OpenAIVoiceService:
        """
        Create a service optimized for speech-to-text only.
        
        Args:
            client_id: Client ID for logging
            model: Whisper model to use
            language: Expected language (None for auto-detect)
            
        Returns:
            OpenAI voice service configured for STT
        """
        logger.info(f"Creating STT-only service for client {client_id}")
        
        service = VoiceServiceFactory.create_voice_service(
            client_id=client_id,
            stt_model=model
        )
        
        if language:
            service.set_default_language(language)
        
        return service
    
    @staticmethod  
    def create_tts_service(
        client_id: str,
        model: str = "tts-1",
        voice: str = "alloy"
    ) -> OpenAIVoiceService:
        """
        Create a service optimized for text-to-speech only.
        
        Args:
            client_id: Client ID for logging
            model: TTS model to use
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
            
        Returns:
            OpenAI voice service configured for TTS
        """
        supported_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        if voice not in supported_voices:
            logger.warning(f"Unknown voice {voice}, falling back to alloy")
            voice = "alloy"
        
        logger.info(f"Creating TTS-only service for client {client_id} with voice: {voice}")
        
        service = VoiceServiceFactory.create_voice_service(
            client_id=client_id,
            tts_model=model
        )
        
        service.set_default_voice(voice)
        return service
    
    @staticmethod
    def get_supported_models() -> Dict[str, Any]:
        """
        Get list of supported voice models and voices.
        
        Returns:
            Dictionary with supported models and configuration options
        """
        return {
            "stt_models": [
                {
                    "name": "whisper-1", 
                    "description": "OpenAI Whisper for speech recognition",
                    "languages": "Multilingual (auto-detect)",
                    "max_file_size": "25MB"
                }
            ],
            "tts_models": [
                {
                    "name": "tts-1",
                    "description": "Standard quality text-to-speech", 
                    "latency": "Low",
                    "cost": "Standard"
                },
                {
                    "name": "tts-1-hd",
                    "description": "High quality text-to-speech",
                    "latency": "Higher", 
                    "cost": "Premium"
                }
            ],
            "tts_voices": [
                {"name": "alloy", "description": "Neutral, balanced voice"},
                {"name": "echo", "description": "Male voice"},
                {"name": "fable", "description": "British accent"},
                {"name": "onyx", "description": "Deep male voice"},
                {"name": "nova", "description": "Female voice"},
                {"name": "shimmer", "description": "Soft female voice"}
            ]
        }
    
    @staticmethod
    def estimate_costs(
        stt_minutes: float = 0,
        tts_characters: int = 0,
        tts_model: str = "tts-1"
    ) -> Dict[str, float]:
        """
        Estimate voice processing costs.
        
        Args:
            stt_minutes: Minutes of audio for transcription
            tts_characters: Characters for speech synthesis
            tts_model: TTS model for cost calculation
            
        Returns:
            Cost breakdown in USD
        """
        # OpenAI pricing as of 2025 (approximate)
        stt_cost_per_minute = 0.006  # $0.006 per minute for Whisper
        tts_cost_per_1k_chars = 0.015 if tts_model == "tts-1" else 0.030  # Standard vs HD
        
        stt_cost = stt_minutes * stt_cost_per_minute
        tts_cost = (tts_characters / 1000) * tts_cost_per_1k_chars
        total_cost = stt_cost + tts_cost
        
        return {
            "stt_cost_usd": round(stt_cost, 4),
            "tts_cost_usd": round(tts_cost, 4), 
            "total_cost_usd": round(total_cost, 4),
            "stt_minutes": stt_minutes,
            "tts_characters": tts_characters
        }