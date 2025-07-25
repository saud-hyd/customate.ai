# backend/app/services/voice/voice_chat_bridge.py
from typing import Dict, Any, Optional, AsyncGenerator
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.services.chat.enhanced_chat_service import EnhancedChatService
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.chat.context_manager import ContextManager
from app.services.llm.llm_factory import LLMFactory
from app.repositories.telephony_repository import VoiceSessionRepository, CallRepository
from app.domain.telephony.entities import VoiceSession
from app.core import logger

class VoiceChatBridge:
    """
    Bridge between voice processing and existing chat system.
    
    This service converts voice sessions to chat sessions and handles
    the integration between telephony and your existing EnhancedChatService.
    Follows your existing service patterns.
    """
    
    def __init__(
        self,
        db: Session,
        client_id: str,
        voice_session_repo: Optional[VoiceSessionRepository] = None,
        call_repo: Optional[CallRepository] = None
    ):
        self.db = db
        self.client_id = client_id
        self.voice_session_repo = voice_session_repo or VoiceSessionRepository()
        self.call_repo = call_repo or CallRepository()
        
        # Initialize chat services (following your existing pattern)
        self.llm_service = None
        self.chat_service = None
        self._initialize_chat_services()
        
        logger.info(f"VoiceChatBridge initialized for client {client_id}")
    
    def _initialize_chat_services(self):
        """Initialize chat services following your existing pattern."""
        try:
            # Create LLM service (exactly like in your routes)
            self.llm_service = LLMFactory.create_llm_service(self.db, self.client_id)
            
            # Initialize other services
            search_service = EnhancedSearchService(self.llm_service)
            context_manager = ContextManager()
            
            # Create enhanced chat service (exactly like in your routes)
            self.chat_service = EnhancedChatService(
                db=self.db,
                search_service=search_service,
                llm_service=self.llm_service,
                context_manager=context_manager,
            )
            
            logger.info(f"Chat services initialized for voice bridge - client {self.client_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize chat services for voice bridge: {str(e)}")
            raise
    
    async def process_voice_message(
        self,
        call_id: str,
        transcribed_text: str,
        user_info: Optional[Dict[str, Any]] = None,
        voice_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a voice message through the existing chat system.
        
        Args:
            call_id: Call ID from telephony system
            transcribed_text: Text from STT processing
            user_info: User information (caller number, etc.)
            voice_metadata: Metadata from voice processing (language, confidence, etc.)
            
        Returns:
            Dict with chat response and voice session info
        """
        try:
            # Get or create voice session
            voice_session = await self._get_or_create_voice_session(call_id, voice_metadata)
            
            # Prepare user info for chat service (matching your existing pattern)
            chat_user_info = self._prepare_chat_user_info(user_info, voice_metadata)
            
            # Process through existing chat service (NON-STREAMING for voice)
            chat_response = await self.chat_service.process_message(
                client_id=self.client_id,
                user_message=transcribed_text,
                session_id=voice_session.chat_session_id,
                user_info=chat_user_info
            )
            
            # Update voice session with chat session ID if needed
            if not voice_session.chat_session_id and chat_response.get("session_id"):
                voice_session.chat_session_id = chat_response["session_id"]
                voice_session.updated_at = datetime.utcnow()
                self.db.add(voice_session)
                self.db.commit()
                logger.info(f"Linked voice session {voice_session.session_id} to chat session {chat_response['session_id']}")
            
            return {
                "success": True,
                "chat_response": chat_response,
                "voice_session_id": voice_session.session_id,
                "chat_session_id": voice_session.chat_session_id,
                "response_text": chat_response.get("message", {}).get("content", ""),
                "knowledge_used": chat_response.get("knowledge_used", False),
                "processing_time": chat_response.get("response_time_ms", 0)
            }
            
        except Exception as e:
            logger.error(f"Voice message processing failed for call {call_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "chat_response": None,
                "response_text": "I'm sorry, I'm having trouble processing your message right now."
            }
    
    async def process_voice_message_stream(
        self,
        call_id: str,
        transcribed_text: str,
        user_info: Optional[Dict[str, Any]] = None,
        voice_metadata: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process voice message with streaming response (for future use).
        
        Currently returns non-streaming result, but structured for future streaming support.
        """
        # For now, return the regular result as a single chunk
        result = await self.process_voice_message(
            call_id=call_id,
            transcribed_text=transcribed_text,
            user_info=user_info,
            voice_metadata=voice_metadata
        )
        
        yield result
    
    async def _get_or_create_voice_session(
        self,
        call_id: str,
        voice_metadata: Optional[Dict[str, Any]] = None
    ) -> VoiceSession:
        """Get existing voice session or create new one."""
        # Try to get existing voice session for this call
        voice_session = self.voice_session_repo.get_by_call_id(self.db, call_id)
        
        if voice_session:
            logger.debug(f"Using existing voice session {voice_session.session_id} for call {call_id}")
            return voice_session
        
        # Create new voice session
        voice_session = VoiceSession(
            call_id=call_id,
            client_id=self.client_id,
            language=voice_metadata.get("language_detected") if voice_metadata else "en",
            voice_model=voice_metadata.get("voice_model", "tts-1") if voice_metadata else "tts-1",
            status="active"
        )
        
        self.db.add(voice_session)
        self.db.commit()
        self.db.refresh(voice_session)
        
        logger.info(f"Created new voice session {voice_session.session_id} for call {call_id}")
        return voice_session
    
    def _prepare_chat_user_info(
        self,
        user_info: Optional[Dict[str, Any]],
        voice_metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare user info for chat service following your existing pattern."""
        chat_user_info = {
            "channel": "voice",  # Mark this as voice channel
            "user_id": None,  # No user ID for phone calls
            "ip_address": None,  # No IP for phone calls
            "user_agent": "Voice Agent",
            "referrer": None,
        }
        
        # Add telephony-specific info
        if user_info:
            chat_user_info.update({
                "caller_number": user_info.get("caller_number"),
                "phone_number": user_info.get("phone_number"),
                "call_direction": user_info.get("direction"),
            })
        
        # Add voice processing metadata
        if voice_metadata:
            chat_user_info.update({
                "language_detected": voice_metadata.get("language_detected"),
                "voice_confidence": voice_metadata.get("confidence"),
                "voice_processing_time": voice_metadata.get("processing_time_seconds")
            })
        
        return chat_user_info
    
    def get_chat_history(
        self,
        call_id: str,
        limit: int = 20
    ) -> Optional[Dict[str, Any]]:
        """Get chat history for a voice call."""
        try:
            # Get voice session
            voice_session = self.voice_session_repo.get_by_call_id(self.db, call_id)
            if not voice_session or not voice_session.chat_session_id:
                return None
            
            # Get chat history through existing service
            history = self.chat_service.get_chat_history(
                client_id=self.client_id,
                session_id=voice_session.chat_session_id,
                limit=limit
            )
            
            return {
                "voice_session_id": voice_session.session_id,
                "chat_session_id": voice_session.chat_session_id,
                "history": history
            }
            
        except Exception as e:
            logger.error(f"Failed to get chat history for call {call_id}: {str(e)}")
            return None
    
    def end_voice_session(self, call_id: str) -> bool:
        """End voice session when call ends."""
        try:
            voice_session = self.voice_session_repo.get_by_call_id(self.db, call_id)
            if voice_session:
                voice_session.status = "completed"
                voice_session.ended_at = datetime.utcnow()
                voice_session.updated_at = datetime.utcnow()
                
                self.db.add(voice_session)
                self.db.commit()
                
                logger.info(f"Ended voice session {voice_session.session_id} for call {call_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to end voice session for call {call_id}: {str(e)}")
            return False
    
    def get_voice_session_stats(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Get voice session statistics."""
        try:
            voice_session = self.voice_session_repo.get_by_call_id(self.db, call_id)
            if not voice_session:
                return None
            
            # Get chat session stats if available
            chat_stats = None
            if voice_session.chat_session_id:
                # Could get message count, etc. from chat service
                pass
            
            return {
                "voice_session_id": voice_session.session_id,
                "chat_session_id": voice_session.chat_session_id,
                "language": voice_session.language,
                "status": voice_session.status,
                "created_at": voice_session.created_at.isoformat(),
                "ended_at": voice_session.ended_at.isoformat() if voice_session.ended_at else None,
                "chat_stats": chat_stats
            }
            
        except Exception as e:
            logger.error(f"Failed to get voice session stats for call {call_id}: {str(e)}")
            return None
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if voice-chat bridge is operational."""
        try:
            # Check if chat services are initialized
            if not self.chat_service or not self.llm_service:
                return {
                    "healthy": False,
                    "service": "Voice Chat Bridge",
                    "client_id": self.client_id,
                    "error": "Chat services not initialized"
                }
            
            return {
                "healthy": True,
                "service": "Voice Chat Bridge",
                "client_id": self.client_id,
                "chat_service": "EnhancedChatService",
                "llm_service": self.llm_service.__class__.__name__
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "service": "Voice Chat Bridge",
                "client_id": self.client_id,
                "error": str(e)
            }