# backend/app/services/voice/voice_pipeline_service.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import time

from app.services.voice.openai_voice_service import OpenAIVoiceService
from app.services.voice.voice_chat_bridge import VoiceChatBridge
from app.services.voice.voice_service_factory import VoiceServiceFactory
from app.repositories.telephony_repository import CallEventRepository
from app.core import logger

class VoicePipelineService:
    """
    Orchestrates the complete voice processing pipeline.
    
    Pipeline: Audio Input → STT → Chat Processing → TTS → Audio Output
    
    This service coordinates all voice processing steps and handles
    error recovery, performance tracking, and event logging.
    """
    
    def __init__(
        self,
        db: Session,
        client_id: str,
        call_id: str,
        voice_service: Optional[OpenAIVoiceService] = None,
        voice_chat_bridge: Optional[VoiceChatBridge] = None,
        event_repo: Optional[CallEventRepository] = None
    ):
        self.db = db
        self.client_id = client_id
        self.call_id = call_id
        
        # Initialize services
        self.voice_service = voice_service or VoiceServiceFactory.create_voice_service(client_id)
        self.voice_chat_bridge = voice_chat_bridge or VoiceChatBridge(db, client_id)
        self.event_repo = event_repo or CallEventRepository()
        
        # Pipeline configuration
        self.max_retries = 2
        self.timeout_seconds = 30
        self.pipeline_stats = {
            "started_at": datetime.utcnow(),
            "stt_time": 0,
            "chat_time": 0,
            "tts_time": 0,
            "total_time": 0,
            "retries": 0,
            "errors": []
        }
        
        logger.info(f"Voice pipeline initialized for client {client_id}, call {call_id}")
    
    async def process_voice_message(
        self,
        audio_data: bytes,
        audio_format: str = "wav",
        caller_info: Optional[Dict[str, Any]] = None,
        voice_settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process complete voice message through the pipeline.
        
        Args:
            audio_data: Raw audio bytes from caller
            audio_format: Audio format (wav, mp3, etc.)
            caller_info: Information about the caller
            voice_settings: Voice processing settings (language, voice, etc.)
            
        Returns:
            Dict with response audio and processing metadata
        """
        pipeline_start = time.time()
        
        try:
            # Log pipeline start
            await self._log_pipeline_event("pipeline_started", {
                "audio_size_bytes": len(audio_data),
                "audio_format": audio_format,
                "caller_number": caller_info.get("caller_number") if caller_info else None
            })
            
            # Step 1: Speech to Text
            logger.info(f"Starting STT for call {self.call_id}")
            stt_result = await self._process_stt(audio_data, audio_format, voice_settings)
            
            if not stt_result["success"]:
                return await self._handle_pipeline_error("STT failed", stt_result.get("error"))
            
            transcribed_text = stt_result["transcription"]
            if not transcribed_text.strip():
                return await self._handle_empty_transcription()
            
            # Step 2: Chat Processing
            logger.info(f"Starting chat processing for call {self.call_id}: '{transcribed_text[:100]}...'")
            chat_result = await self._process_chat(transcribed_text, caller_info, stt_result)
            
            if not chat_result["success"]:
                return await self._handle_pipeline_error("Chat processing failed", chat_result.get("error"))
            
            response_text = chat_result["response_text"]
            if not response_text.strip():
                response_text = "I'm sorry, I didn't understand that. Could you please repeat?"
            
            # Step 3: Text to Speech
            logger.info(f"Starting TTS for call {self.call_id}: '{response_text[:100]}...'")
            tts_result = await self._process_tts(response_text, voice_settings)
            
            if not tts_result["success"]:
                return await self._handle_pipeline_error("TTS failed", tts_result.get("error"))
            
            # Pipeline completed successfully
            total_time = time.time() - pipeline_start
            self.pipeline_stats["total_time"] = total_time
            
            await self._log_pipeline_event("pipeline_completed", {
                "total_time_seconds": total_time,
                "transcribed_text": transcribed_text,
                "response_text": response_text,
                "audio_response_size": len(tts_result["audio_data"]),
                "knowledge_used": chat_result.get("knowledge_used", False)
            })
            
            logger.info(f"Voice pipeline completed for call {self.call_id} in {total_time:.2f}s")
            
            return {
                "success": True,
                "audio_response": tts_result["audio_data"],
                "audio_format": tts_result["audio_format"],
                "transcribed_text": transcribed_text,
                "response_text": response_text,
                "pipeline_stats": self._get_pipeline_stats(),
                "chat_metadata": {
                    "session_id": chat_result.get("chat_session_id"),
                    "knowledge_used": chat_result.get("knowledge_used", False),
                    "processing_time_ms": chat_result.get("processing_time", 0)
                }
            }
            
        except Exception as e:
            return await self._handle_pipeline_error("Pipeline exception", str(e))
    
    async def _process_stt(
        self,
        audio_data: bytes,
        audio_format: str,
        voice_settings: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process Speech-to-Text step."""
        stt_start = time.time()
        
        try:
            # Extract language setting if provided
            language = None
            if voice_settings:
                language = voice_settings.get("language") or voice_settings.get("language_hint")
            
            # Process STT
            result = await self.voice_service.transcribe_audio(
                audio_data=audio_data,
                audio_format=audio_format,
                language=language
            )
            
            stt_time = time.time() - stt_start
            self.pipeline_stats["stt_time"] = stt_time
            
            if result["success"]:
                await self._log_pipeline_event("stt_completed", {
                    "processing_time_seconds": stt_time,
                    "text_length": len(result["text"]),
                    "language_detected": result.get("language"),
                    "confidence": result.get("confidence")
                })
            
            return result
            
        except Exception as e:
            logger.error(f"STT processing error for call {self.call_id}: {str(e)}")
            return {"success": False, "error": str(e), "transcription": ""}
    
    async def _process_chat(
        self,
        transcribed_text: str,
        caller_info: Optional[Dict[str, Any]],
        stt_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process chat response step."""
        chat_start = time.time()
        
        try:
            # Prepare user info
            user_info = {
                "caller_number": caller_info.get("caller_number") if caller_info else None,
                "phone_number": caller_info.get("phone_number") if caller_info else None,
                "direction": caller_info.get("direction") if caller_info else "inbound"
            }
            
            # Prepare voice metadata
            voice_metadata = {
                "language_detected": stt_result.get("language"),
                "confidence": stt_result.get("confidence"),
                "processing_time_seconds": stt_result.get("processing_time_seconds")
            }
            
            # Process through chat bridge
            result = await self.voice_chat_bridge.process_voice_message(
                call_id=self.call_id,
                transcribed_text=transcribed_text,
                user_info=user_info,
                voice_metadata=voice_metadata
            )
            
            chat_time = time.time() - chat_start
            self.pipeline_stats["chat_time"] = chat_time
            
            if result["success"]:
                await self._log_pipeline_event("chat_completed", {
                    "processing_time_seconds": chat_time,
                    "response_length": len(result.get("response_text", "")),
                    "knowledge_used": result.get("knowledge_used", False),
                    "chat_session_id": result.get("chat_session_id")
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Chat processing error for call {self.call_id}: {str(e)}")
            return {"success": False, "error": str(e), "response_text": ""}
    
    async def _process_tts(
        self,
        response_text: str,
        voice_settings: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process Text-to-Speech step."""
        tts_start = time.time()
        
        try:
            # Extract voice settings
            voice = "alloy"  # Default
            speed = 1.0
            
            if voice_settings:
                voice = voice_settings.get("voice", "alloy")
                speed = voice_settings.get("speed", 1.0)
            
            # Process TTS
            result = await self.voice_service.generate_speech(
                text=response_text,
                voice=voice,
                speed=speed,
                response_format="mp3"  # Optimal for telephony
            )
            
            tts_time = time.time() - tts_start
            self.pipeline_stats["tts_time"] = tts_time
            
            if result["success"]:
                await self._log_pipeline_event("tts_completed", {
                    "processing_time_seconds": tts_time,
                    "text_length": len(response_text),
                    "audio_size_bytes": len(result["audio_data"]),
                    "voice_used": voice
                })
            
            return result
            
        except Exception as e:
            logger.error(f"TTS processing error for call {self.call_id}: {str(e)}")
            return {"success": False, "error": str(e), "audio_data": None}
    
    async def _handle_pipeline_error(self, stage: str, error_message: str) -> Dict[str, Any]:
        """Handle pipeline errors with fallback responses."""
        logger.error(f"Pipeline error in {stage} for call {self.call_id}: {error_message}")
        
        self.pipeline_stats["errors"].append({
            "stage": stage,
            "error": error_message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        await self._log_pipeline_event("pipeline_error", {
            "stage": stage,
            "error": error_message,
            "total_time_seconds": time.time() - self.pipeline_stats["started_at"].timestamp()
        })
        
        # Generate fallback audio response
        fallback_text = "I'm sorry, I'm having technical difficulties. Please try again or contact support."
        
        try:
            fallback_tts = await self.voice_service.generate_speech(
                text=fallback_text,
                voice="alloy",
                response_format="mp3"
            )
            
            if fallback_tts["success"]:
                return {
                    "success": False,
                    "error": f"{stage}: {error_message}",
                    "audio_response": fallback_tts["audio_data"],
                    "audio_format": "mp3",
                    "fallback_used": True,
                    "response_text": fallback_text,
                    "pipeline_stats": self._get_pipeline_stats()
                }
        except:
            pass  # Fallback TTS failed too
        
        return {
            "success": False,
            "error": f"{stage}: {error_message}",
            "audio_response": None,
            "fallback_used": False,
            "pipeline_stats": self._get_pipeline_stats()
        }
    
    async def _handle_empty_transcription(self) -> Dict[str, Any]:
        """Handle empty or silent audio input."""
        logger.info(f"Empty transcription for call {self.call_id}")
        
        await self._log_pipeline_event("empty_transcription", {})
        
        # Generate "please speak" response
        prompt_text = "I didn't hear anything. Could you please speak clearly?"
        
        tts_result = await self.voice_service.generate_speech(
            text=prompt_text,
            voice="alloy",
            response_format="mp3"
        )
        
        return {
            "success": True,
            "audio_response": tts_result["audio_data"] if tts_result["success"] else None,
            "audio_format": "mp3",
            "transcribed_text": "",
            "response_text": prompt_text,
            "empty_input": True,
            "pipeline_stats": self._get_pipeline_stats()
        }
    
    async def _log_pipeline_event(self, event_type: str, event_data: Dict[str, Any] = None):
        """Log pipeline events for monitoring."""
        try:
            self.event_repo.create_event(
                db=self.db,
                call_id=self.call_id,
                event_type=f"voice_pipeline_{event_type}",
                event_data=event_data or {}
            )
        except Exception as e:
            logger.warning(f"Failed to log pipeline event {event_type}: {str(e)}")
    
    def _get_pipeline_stats(self) -> Dict[str, Any]:
        """Get current pipeline performance statistics."""
        return {
            "stt_time_seconds": self.pipeline_stats["stt_time"],
            "chat_time_seconds": self.pipeline_stats["chat_time"],
            "tts_time_seconds": self.pipeline_stats["tts_time"],
            "total_time_seconds": self.pipeline_stats["total_time"],
            "retries": self.pipeline_stats["retries"],
            "error_count": len(self.pipeline_stats["errors"]),
            "started_at": self.pipeline_stats["started_at"].isoformat()
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if voice pipeline is operational."""
        try:
            # Check voice service
            voice_health = await self.voice_service.health_check()
            
            # Check chat bridge
            bridge_health = await self.voice_chat_bridge.health_check()
            
            overall_healthy = voice_health["healthy"] and bridge_health["healthy"]
            
            return {
                "healthy": overall_healthy,
                "service": "Voice Pipeline",
                "client_id": self.client_id,
                "call_id": self.call_id,
                "components": {
                    "voice_service": voice_health,
                    "chat_bridge": bridge_health
                }
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "service": "Voice Pipeline",
                "client_id": self.client_id,
                "error": str(e)
            }