# backend/app/services/telephony/enhanced_telephony_service.py
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.services.telephony.twilio_provider_service import TwilioProviderService
from app.services.telephony.call_lifecycle_manager import CallLifecycleManager
from app.services.voice.openai_voice_service import OpenAIVoiceService
from app.services.voice.voice_pipeline_service import VoicePipelineService
from app.services.voice.voice_chat_bridge import VoiceChatBridge
from app.repositories.telephony_repository import (
    CallRepository,
    PhoneNumberRepository, 
    VoiceSessionRepository,
    CallEventRepository
)
from app.repositories.telephony_analytics import TelephonyAnalyticsRepository
from app.domain.telephony.entities import PhoneNumber
from app.core import logger

class EnhancedTelephonyService:
    """
    Main telephony orchestration service - equivalent to EnhancedChatService.
    
    This service provides:
    - Phone number provisioning and management
    - Inbound call routing and processing
    - Voice pipeline orchestration (STT → Chat → TTS)
    - Call analytics and usage tracking
    - Integration with existing chat services
    
    Follows your existing EnhancedChatService patterns exactly.
    """
    
    def __init__(
        self,
        db: Session,
        client_id: str,
        call_repo: CallRepository,
        phone_repo: PhoneNumberRepository,
        voice_session_repo: VoiceSessionRepository,
        event_repo: CallEventRepository,
        analytics_repo: TelephonyAnalyticsRepository,
        twilio_service: TwilioProviderService,
        voice_service: OpenAIVoiceService,
        voice_chat_bridge: VoiceChatBridge
    ):
        """Initialize enhanced telephony service with all dependencies."""
        self.db = db
        self.client_id = client_id
        
        # Repository dependencies
        self.call_repo = call_repo
        self.phone_repo = phone_repo
        self.voice_session_repo = voice_session_repo
        self.event_repo = event_repo
        self.analytics_repo = analytics_repo
        
        # Service dependencies
        self.twilio_service = twilio_service
        self.voice_service = voice_service
        self.voice_chat_bridge = voice_chat_bridge
        
        # Initialize lifecycle manager
        self.lifecycle_manager = CallLifecycleManager(
            db=db,
            client_id=client_id,
            call_repo=call_repo,
            event_repo=event_repo
        )
        
        logger.info(f"EnhancedTelephonyService initialized for client {client_id}")
    
    # Phone Number Management
    async def provision_phone_number(
        self,
        area_code: Optional[str] = None,
        country_code: str = "US"
    ) -> Dict[str, Any]:
        """
        Provision a new phone number for the client.
        
        Args:
            area_code: Preferred area code
            country_code: Country code
            
        Returns:
            Dict with provisioned phone number details
        """
        try:
            logger.info(f"Provisioning phone number for client {self.client_id}")
            
            # Check subscription limits (would integrate with your SubscriptionRepository)
            current_count = self.phone_repo.count_by_client_id(self.db, self.client_id)
            # TODO: Check against subscription limits
            
            # Provision from Twilio
            twilio_result = await self.twilio_service.provision_phone_number(
                area_code=area_code,
                country_code=country_code
            )
            
            if not twilio_result["success"]:
                return twilio_result
            
            # Create database record
            phone_number = PhoneNumber(
                client_id=self.client_id,
                phone_number=twilio_result["phone_number"],
                country_code=country_code,
                provider="twilio",
                provider_sid=twilio_result["provider_sid"],
                status="active"
            )
            
            self.db.add(phone_number)
            self.db.commit()
            self.db.refresh(phone_number)
            
            logger.info(f"Phone number {phone_number.phone_number} provisioned for client {self.client_id}")
            
            return {
                "success": True,
                "phone_number": phone_number.phone_number,
                "number_id": phone_number.number_id,
                "provider_sid": phone_number.provider_sid,
                "status": phone_number.status,
                "country_code": phone_number.country_code,
                "assigned_at": phone_number.assigned_at.isoformat(),
                "webhook_configured": twilio_result.get("webhook_configured", False)
            }
            
        except Exception as e:
            logger.error(f"Failed to provision phone number for client {self.client_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "phone_number": None
            }
    
    async def release_phone_number(self, number_id: str) -> Dict[str, Any]:
        """Release a phone number back to the provider."""
        try:
            # Get phone number record
            phone_number = self.phone_repo.get_by_number_id(self.db, number_id)
            if not phone_number:
                return {"success": False, "error": "Phone number not found"}
            
            if phone_number.client_id != self.client_id:
                return {"success": False, "error": "Access denied"}
            
            # Release from Twilio
            twilio_result = await self.twilio_service.release_phone_number(phone_number.provider_sid)
            
            if twilio_result["success"]:
                # Update database record
                phone_number.status = "released"
                phone_number.updated_at = datetime.utcnow()
                self.db.add(phone_number)
                self.db.commit()
            
            logger.info(f"Phone number {phone_number.phone_number} released for client {self.client_id}")
            return twilio_result
            
        except Exception as e:
            logger.error(f"Failed to release phone number {number_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_phone_numbers(self) -> List[Dict[str, Any]]:
        """Get all phone numbers for the client."""
        try:
            phone_numbers = self.phone_repo.get_by_client_id(self.db, self.client_id)
            
            return [
                {
                    "number_id": phone.number_id,
                    "phone_number": phone.phone_number,
                    "country_code": phone.country_code,
                    "status": phone.status,
                    "provider": phone.provider,
                    "assigned_at": phone.assigned_at.isoformat(),
                    "updated_at": phone.updated_at.isoformat()
                }
                for phone in phone_numbers
            ]
            
        except Exception as e:
            logger.error(f"Failed to get phone numbers for client {self.client_id}: {str(e)}")
            return []
    
    # Call Processing (Main Voice Pipeline)
    async def process_inbound_call(
        self,
        phone_number: str,
        caller_number: str,
        twilio_call_sid: str,
        call_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process an inbound call - main entry point for voice calls.
        
        Args:
            phone_number: Called phone number
            caller_number: Caller's phone number
            twilio_call_sid: Twilio call SID
            call_data: Additional call metadata
            
        Returns:
            Dict with call processing result and TwiML response
        """
        call_id = str(uuid.uuid4())
        
        try:
            logger.info(f"Processing inbound call {call_id}: {caller_number} → {phone_number}")
            
            # Verify phone number belongs to client
            phone_record = self.phone_repo.get_by_phone_number(self.db, phone_number)
            if not phone_record or phone_record.client_id != self.client_id:
                logger.warning(f"Unauthorized call to {phone_number} for client {self.client_id}")
                return {
                    "success": False,
                    "error": "Phone number not found or unauthorized",
                    "twiml_response": self._generate_error_twiml("This number is not in service.")
                }
            
            # Start call tracking
            call_result = await self.lifecycle_manager.start_call(
                call_id=call_id,
                phone_number=phone_number,
                caller_number=caller_number,
                direction="inbound",
                twilio_call_sid=twilio_call_sid
            )
            
            if not call_result["success"]:
                return {
                    "success": False,
                    "error": f"Failed to start call tracking: {call_result.get('error')}",
                    "twiml_response": self._generate_error_twiml("System error. Please try again.")
                }
            
            # Answer the call
            await self.lifecycle_manager.answer_call(call_id)
            
            # Generate initial TwiML response for voice interaction
            twiml_response = self._generate_voice_interaction_twiml(call_id)
            
            logger.info(f"Inbound call {call_id} processed successfully")
            
            return {
                "success": True,
                "call_id": call_id,
                "status": "in-progress",
                "twiml_response": twiml_response,
                "webhook_url": f"{self.twilio_service.webhook_url}/twilio/voice/{call_id}"
            }
            
        except Exception as e:
            logger.error(f"Failed to process inbound call {call_id}: {str(e)}")
            
            # Try to fail the call gracefully
            try:
                await self.lifecycle_manager.fail_call(call_id, "processing_error", {"error": str(e)})
            except:
                pass
            
            return {
                "success": False,
                "error": str(e),
                "call_id": call_id,
                "twiml_response": self._generate_error_twiml("We're having technical difficulties. Please try again later.")
            }
    
    async def process_voice_input(
        self,
        call_id: str,
        audio_data: bytes,
        audio_format: str = "wav"
    ) -> Dict[str, Any]:
        """
        Process voice input from caller through the complete pipeline.
        
        Args:
            call_id: Call ID
            audio_data: Raw audio bytes
            audio_format: Audio format
            
        Returns:
            Dict with processing result and response audio
        """
        try:
            logger.info(f"Processing voice input for call {call_id}")
            
            # Get call information
            call = self.call_repo.get_by_call_id(self.db, call_id)
            if not call or call.client_id != self.client_id:
                return {"success": False, "error": "Call not found or unauthorized"}
            
            # Create voice pipeline service
            pipeline_service = VoicePipelineService(
                db=self.db,
                client_id=self.client_id,
                call_id=call_id,
                voice_service=self.voice_service,
                voice_chat_bridge=self.voice_chat_bridge,
                event_repo=self.event_repo
            )
            
            # Prepare caller info
            caller_info = {
                "caller_number": call.caller_number,
                "phone_number": call.phone_number,
                "direction": call.direction
            }
            
            # Process through pipeline
            pipeline_result = await pipeline_service.process_voice_message(
                audio_data=audio_data,
                audio_format=audio_format,
                caller_info=caller_info
            )
            
            # Track performance events
            if pipeline_result["success"]:
                await self.lifecycle_manager.track_response_played(
                    call_id=call_id,
                    response_data={
                        "response_text": pipeline_result.get("response_text"),
                        "audio_size_bytes": len(pipeline_result.get("audio_response", b"")),
                        "pipeline_stats": pipeline_result.get("pipeline_stats", {})
                    }
                )
            
            return pipeline_result
            
        except Exception as e:
            logger.error(f"Voice input processing failed for call {call_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def end_call(
        self,
        call_id: str,
        end_reason: str = "completed"
    ) -> Dict[str, Any]:
        """End a call and finalize all tracking."""
        try:
            # End call lifecycle tracking
            end_result = await self.lifecycle_manager.end_call(
                call_id=call_id,
                end_reason=end_reason
            )
            
            # End voice session
            self.voice_chat_bridge.end_voice_session(call_id)
            
            logger.info(f"Call {call_id} ended: {end_reason}")
            return end_result
            
        except Exception as e:
            logger.error(f"Failed to end call {call_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Analytics and Monitoring
    def get_call_analytics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get call analytics for the client."""
        try:
            return self.analytics_repo.get_client_usage_summary(
                db=self.db,
                client_id=self.client_id,
                start_date=start_date,
                end_date=end_date
            )
        except Exception as e:
            logger.error(f"Failed to get call analytics for client {self.client_id}: {str(e)}")
            return {"error": str(e)}
    
    def get_call_history(
        self,
        limit: int = 50,
        skip: int = 0,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get call history for the client."""
        try:
            calls = self.call_repo.get_by_client_id(
                db=self.db,
                client_id=self.client_id,
                limit=limit,
                skip=skip,
                status=status
            )
            
            return [
                {
                    "call_id": call.call_id,
                    "phone_number": call.phone_number,
                    "caller_number": call.caller_number,
                    "direction": call.direction,
                    "status": call.status,
                    "started_at": call.started_at.isoformat(),
                    "ended_at": call.ended_at.isoformat() if call.ended_at else None,
                    "duration_seconds": call.duration_seconds,
                    "cost_cents": call.cost_cents
                }
                for call in calls
            ]
            
        except Exception as e:
            logger.error(f"Failed to get call history for client {self.client_id}: {str(e)}")
            return []
    
    def get_active_calls(self) -> List[Dict[str, Any]]:
        """Get currently active calls."""
        return self.lifecycle_manager.get_active_calls()
    
    def get_monthly_usage(self) -> Dict[str, Any]:
        """Get monthly usage statistics for subscription management."""
        try:
            # Get usage from analytics repo
            usage_summary = self.analytics_repo.get_client_usage_summary(self.db, self.client_id)
            
            # Get call minutes specifically
            monthly_minutes = self.call_repo.get_monthly_usage(self.db, self.client_id)
            
            # Get phone number count
            phone_count = self.phone_repo.count_by_client_id(self.db, self.client_id)
            
            return {
                "client_id": self.client_id,
                "monthly_call_minutes": monthly_minutes,
                "active_phone_numbers": phone_count,
                "total_calls_this_month": usage_summary.get("summary", {}).get("total_calls", 0),
                "success_rate": usage_summary.get("success_rate", 0),
                "total_cost_cents": usage_summary.get("summary", {}).get("total_cost_cents", 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to get monthly usage for client {self.client_id}: {str(e)}")
            return {"error": str(e)}
    
    # TwiML Generation (for Twilio webhooks)
    def _generate_voice_interaction_twiml(self, call_id: str) -> str:
        """Generate TwiML for voice interaction."""
        # Initial greeting
        greeting = "Hello! Welcome to Customate AI. How can I help you today?"
        return self.twilio_service.generate_twiml_response(text=greeting)
    
    def _generate_error_twiml(self, error_message: str) -> str:
        """Generate TwiML for error responses."""
        return self.twilio_service.generate_twiml_response(text=error_message)
    
    def generate_response_twiml(
        self,
        call_id: str,
        response_text: Optional[str] = None,
        audio_url: Optional[str] = None
    ) -> str:
        """Generate TwiML response for processed voice input."""
        return self.twilio_service.generate_twiml_response(
            text=response_text,
            audio_url=audio_url
        )
    
    # Health and Configuration
    async def health_check(self) -> Dict[str, Any]:
        """Check if telephony service is operational."""
        try:
            # Check all components
            twilio_health = await self.twilio_service.health_check()
            voice_health = await self.voice_service.health_check()
            bridge_health = await self.voice_chat_bridge.health_check()
            
            overall_healthy = (
                twilio_health["healthy"] and 
                voice_health["healthy"] and 
                bridge_health["healthy"]
            )
            
            return {
                "healthy": overall_healthy,
                "service": "Enhanced Telephony Service",
                "client_id": self.client_id,
                "components": {
                    "twilio_provider": twilio_health,
                    "voice_service": voice_health,
                    "voice_chat_bridge": bridge_health
                },
                "active_calls": len(self.get_active_calls()),
                "phone_numbers": len(self.get_phone_numbers())
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "service": "Enhanced Telephony Service",
                "client_id": self.client_id,
                "error": str(e)
            }
    
    def get_service_configuration(self) -> Dict[str, Any]:
        """Get current service configuration."""
        return {
            "client_id": self.client_id,
            "telephony_provider": "twilio",
            "voice_provider": "openai",
            "twilio_config": self.twilio_service.get_configuration(),
            "voice_config": self.voice_service.get_configuration(),
            "active_features": [
                "phone_number_provisioning",
                "inbound_call_handling",
                "voice_to_text", 
                "text_to_voice",
                "chat_integration",
                "call_analytics"
            ]
        }