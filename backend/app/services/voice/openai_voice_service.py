# backend/app/services/voice/openai_voice_service.py
from typing import Dict, Any, Optional, List
import httpx
import io
import tempfile
import os
from datetime import datetime

from app.core.config.settings import settings
from app.core import logger

class OpenAIVoiceService:
    """OpenAI voice processing service - follows OpenAIService pattern."""
    
    def __init__(
        self,
        client_id: str,
        stt_model: str = "whisper-1",
        tts_model: str = "tts-1"
    ):
        self.client_id = client_id
        self.api_key = settings.OPENAI_API_KEY
        self.api_base_url = "https://api.openai.com/v1"
        self.stt_model = stt_model
        self.tts_model = tts_model
        
        # Voice settings
        self.default_voice = "alloy"
        self.default_language = None  # Auto-detect
        self.audio_format = "mp3"
        
        # Verify API key is set
        if not self.api_key:
            logger.error("OpenAI API key not configured for voice service")
            raise ValueError("OpenAI API key is required for voice processing")
        
        logger.info(f"OpenAI voice service initialized for client {client_id}: STT={stt_model}, TTS={tts_model}")
    
    async def transcribe_audio(
        self,
        audio_data: bytes,
        audio_format: str = "wav",
        language: Optional[str] = None,
        prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio to text using OpenAI Whisper.
        
        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (wav, mp3, m4a, etc.)
            language: Expected language (None for auto-detect)
            prompt: Optional prompt to guide transcription
            
        Returns:
            Dict with transcription text and metadata
        """
        start_time = datetime.utcnow()
        
        try:
            # Prepare multipart form data
            files = {
                "file": (f"audio.{audio_format}", audio_data, f"audio/{audio_format}"),
                "model": (None, self.stt_model),
                "response_format": (None, "verbose_json"),
            }
            
            # Add optional parameters
            if language or self.default_language:
                files["language"] = (None, language or self.default_language)
            
            if prompt:
                files["prompt"] = (None, prompt)
            
            # Make API request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_base_url}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    processing_time = (datetime.utcnow() - start_time).total_seconds()
                    
                    logger.info(f"STT successful for client {self.client_id}: {len(result.get('text', ''))} chars in {processing_time:.2f}s")
                    
                    return {
                        "success": True,
                        "text": result.get("text", ""),
                        "language": result.get("language"),
                        "duration": result.get("duration"),
                        "confidence": self._extract_confidence(result),
                        "processing_time_seconds": processing_time,
                        "model_used": self.stt_model,
                        "client_id": self.client_id
                    }
                else:
                    error_msg = f"STT API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "text": "",
                        "client_id": self.client_id
                    }
                    
        except Exception as e:
            error_msg = f"STT processing failed: {str(e)}"
            logger.error(f"STT error for client {self.client_id}: {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "text": "",
                "client_id": self.client_id
            }
    
    async def generate_speech(
        self,
        text: str,
        voice: Optional[str] = None,
        speed: float = 1.0,
        response_format: str = "mp3"
    ) -> Dict[str, Any]:
        """
        Generate speech from text using OpenAI TTS.
        
        Args:
            text: Text to convert to speech
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
            speed: Speech speed (0.25 to 4.0)
            response_format: Audio format (mp3, opus, aac, flac)
            
        Returns:
            Dict with audio data and metadata
        """
        start_time = datetime.utcnow()
        
        # Validate inputs
        if not text or not text.strip():
            return {
                "success": False,
                "error": "Text cannot be empty",
                "audio_data": None,
                "client_id": self.client_id
            }
        
        # Limit text length (OpenAI has 4096 character limit)
        if len(text) > 4000:
            logger.warning(f"Text truncated from {len(text)} to 4000 characters for client {self.client_id}")
            text = text[:4000]
        
        # Validate speed
        speed = max(0.25, min(4.0, speed))
        
        try:
            # Prepare request data
            request_data = {
                "model": self.tts_model,
                "input": text,
                "voice": voice or self.default_voice,
                "response_format": response_format,
                "speed": speed
            }
            
            # Make API request
            async with httpx.AsyncClient(timeout=60.0) as client:  # Longer timeout for TTS
                response = await client.post(
                    f"{self.api_base_url}/audio/speech",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_data
                )
                
                if response.status_code == 200:
                    audio_data = response.content
                    processing_time = (datetime.utcnow() - start_time).total_seconds()
                    
                    logger.info(f"TTS successful for client {self.client_id}: {len(text)} chars -> {len(audio_data)} bytes in {processing_time:.2f}s")
                    
                    return {
                        "success": True,
                        "audio_data": audio_data,
                        "audio_format": response_format,
                        "text_length": len(text),
                        "audio_size_bytes": len(audio_data),
                        "processing_time_seconds": processing_time,
                        "voice_used": voice or self.default_voice,
                        "model_used": self.tts_model,
                        "client_id": self.client_id
                    }
                else:
                    error_msg = f"TTS API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "audio_data": None,
                        "client_id": self.client_id
                    }
                    
        except Exception as e:
            error_msg = f"TTS processing failed: {str(e)}"
            logger.error(f"TTS error for client {self.client_id}: {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "audio_data": None,
                "client_id": self.client_id
            }
    
    async def process_voice_message(
        self,
        audio_data: bytes,
        audio_format: str = "wav",
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete voice message processing: STT only (TTS handled separately).
        
        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format
            language: Expected language
            
        Returns:
            Dict with transcription results
        """
        logger.info(f"Processing voice message for client {self.client_id}")
        
        # Step 1: Speech to Text
        stt_result = await self.transcribe_audio(
            audio_data=audio_data,
            audio_format=audio_format,
            language=language
        )
        
        if not stt_result["success"]:
            return {
                "success": False,
                "error": f"Speech recognition failed: {stt_result.get('error')}",
                "transcription": "",
                "client_id": self.client_id
            }
        
        return {
            "success": True,
            "transcription": stt_result["text"],
            "language_detected": stt_result.get("language"),
            "confidence": stt_result.get("confidence"),
            "processing_time_seconds": stt_result.get("processing_time_seconds"),
            "client_id": self.client_id
        }
    
    # Configuration methods
    def set_default_voice(self, voice: str) -> None:
        """Set default TTS voice."""
        supported_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        if voice in supported_voices:
            self.default_voice = voice
            logger.info(f"Default voice set to {voice} for client {self.client_id}")
        else:
            logger.warning(f"Unknown voice {voice}, keeping current default: {self.default_voice}")
    
    def set_default_language(self, language: str) -> None:
        """Set default language for STT."""
        self.default_language = language
        logger.info(f"Default language set to {language} for client {self.client_id}")
    
    def get_configuration(self) -> Dict[str, Any]:
        """Get current service configuration."""
        return {
            "client_id": self.client_id,
            "stt_model": self.stt_model,
            "tts_model": self.tts_model,
            "default_voice": self.default_voice,
            "default_language": self.default_language,
            "audio_format": self.audio_format
        }
    
    # Helper methods
    def _extract_confidence(self, whisper_result: Dict[str, Any]) -> Optional[float]:
        """Extract confidence score from Whisper result."""
        # Whisper doesn't directly return confidence, but we can estimate from segments
        segments = whisper_result.get("segments", [])
        if segments:
            # Average confidence from all segments (if available)
            confidences = []
            for segment in segments:
                if "avg_logprob" in segment:
                    # Convert log probability to confidence (rough approximation)
                    confidence = min(1.0, max(0.0, (segment["avg_logprob"] + 2.0) / 2.0))
                    confidences.append(confidence)
            
            if confidences:
                return sum(confidences) / len(confidences)
        
        return None
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if voice service is operational."""
        try:
            # Test with minimal request
            test_result = await self.generate_speech(
                text="Health check",
                voice="alloy"
            )
            
            return {
                "healthy": test_result["success"],
                "service": "OpenAI Voice",
                "client_id": self.client_id,
                "models": {
                    "stt": self.stt_model,
                    "tts": self.tts_model
                },
                "error": test_result.get("error") if not test_result["success"] else None
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "service": "OpenAI Voice", 
                "client_id": self.client_id,
                "error": str(e)
            }