# backend/app/services/telephony/call_lifecycle_manager.py
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from enum import Enum

from app.repositories.telephony_repository import CallRepository, CallEventRepository
from app.domain.telephony.entities import Call
from app.core import logger

class CallEventType(Enum):
    """Call lifecycle event types."""
    CALL_STARTED = "call_started"
    CALL_ANSWERED = "call_answered"
    VOICE_DETECTED = "voice_detected"
    STT_COMPLETED = "stt_completed"
    CHAT_PROCESSED = "chat_processed"
    TTS_COMPLETED = "tts_completed"
    RESPONSE_PLAYED = "response_played"
    CALL_ENDED = "call_ended"
    CALL_FAILED = "call_failed"
    TIMEOUT_OCCURRED = "timeout_occurred"

class CallLifecycleManager:
    """
    Lightweight call lifecycle and event tracking manager.
    
    Provides simple event tracking for call states and performance monitoring.
    Not complex event sourcing - just basic state management and analytics.
    """
    
    def __init__(
        self,
        db: Session,
        client_id: str,
        call_repo: Optional[CallRepository] = None,
        event_repo: Optional[CallEventRepository] = None
    ):
        self.db = db
        self.client_id = client_id
        self.call_repo = call_repo or CallRepository()
        self.event_repo = event_repo or CallEventRepository()
        
        # Configuration
        self.max_call_duration_minutes = 30
        self.response_timeout_seconds = 30
        self.voice_detection_timeout_seconds = 10
        
        logger.info(f"CallLifecycleManager initialized for client {client_id}")
    
    async def start_call(
        self,
        call_id: str,
        phone_number: str,
        caller_number: str,
        direction: str = "inbound",
        twilio_call_sid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Start tracking a new call.
        
        Args:
            call_id: Internal call ID
            phone_number: Called phone number
            caller_number: Caller's phone number
            direction: Call direction (inbound/outbound)
            twilio_call_sid: Twilio call SID
            
        Returns:
            Dict with call start result
        """
        try:
            logger.info(f"Starting call tracking: {call_id} from {caller_number} to {phone_number}")
            
            # Create call record
            call = Call(
                call_id=call_id,
                client_id=self.client_id,
                phone_number=phone_number,
                caller_number=caller_number,
                direction=direction,
                status="ringing",
                started_at=datetime.utcnow(),
                twilio_call_sid=twilio_call_sid
            )
            
            self.db.add(call)
            self.db.commit()
            self.db.refresh(call)
            
            # Log call started event
            await self.track_event(
                call_id=call_id,
                event_type=CallEventType.CALL_STARTED,
                event_data={
                    "phone_number": phone_number,
                    "caller_number": caller_number,
                    "direction": direction,
                    "twilio_call_sid": twilio_call_sid
                }
            )
            
            logger.info(f"Call {call_id} started successfully")
            
            return {
                "success": True,
                "call_id": call_id,
                "status": "started",
                "started_at": call.started_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to start call {call_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "call_id": call_id
            }
    
    async def answer_call(self, call_id: str) -> Dict[str, Any]:
        """Mark call as answered and start voice processing."""
        try:
            call = self.call_repo.get_by_call_id(self.db, call_id)
            if not call:
                return {"success": False, "error": "Call not found"}
            
            # Update call status
            call.status = "in-progress"
            call.updated_at = datetime.utcnow()
            self.db.add(call)
            self.db.commit()
            
            # Track event
            await self.track_event(
                call_id=call_id,
                event_type=CallEventType.CALL_ANSWERED,
                event_data={"answered_at": datetime.utcnow().isoformat()}
            )
            
            logger.info(f"Call {call_id} answered")
            
            return {
                "success": True,
                "call_id": call_id,
                "status": "in-progress"
            }
            
        except Exception as e:
            logger.error(f"Failed to answer call {call_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def track_voice_detection(
        self,
        call_id: str,
        detection_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Track voice detection event."""
        return await self.track_event(
            call_id=call_id,
            event_type=CallEventType.VOICE_DETECTED,
            event_data=detection_data
        )
    
    async def track_stt_completion(
        self,
        call_id: str,
        stt_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Track STT completion event."""
        return await self.track_event(
            call_id=call_id,
            event_type=CallEventType.STT_COMPLETED,
            event_data=stt_data
        )
    
    async def track_chat_processing(
        self,
        call_id: str,
        chat_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Track chat processing completion."""
        return await self.track_event(
            call_id=call_id,
            event_type=CallEventType.CHAT_PROCESSED,
            event_data=chat_data
        )
    
    async def track_tts_completion(
        self,
        call_id: str,
        tts_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Track TTS completion event."""
        return await self.track_event(
            call_id=call_id,
            event_type=CallEventType.TTS_COMPLETED,
            event_data=tts_data
        )
    
    async def track_response_played(
        self,
        call_id: str,
        response_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Track response audio played to caller."""
        return await self.track_event(
            call_id=call_id,
            event_type=CallEventType.RESPONSE_PLAYED,
            event_data=response_data
        )
    
    async def end_call(
        self,
        call_id: str,
        end_reason: str = "completed",
        duration_seconds: Optional[int] = None,
        cost_cents: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        End call tracking and finalize call record.
        
        Args:
            call_id: Call ID
            end_reason: Reason for call end (completed, failed, timeout, etc.)
            duration_seconds: Call duration in seconds
            cost_cents: Call cost in cents
            
        Returns:
            Dict with call end result
        """
        try:
            call = self.call_repo.get_by_call_id(self.db, call_id)
            if not call:
                return {"success": False, "error": "Call not found"}
            
            # Calculate duration if not provided
            if duration_seconds is None and call.started_at:
                duration_seconds = int((datetime.utcnow() - call.started_at).total_seconds())
            
            # Update call record
            call.status = "completed" if end_reason == "completed" else "failed"
            call.ended_at = datetime.utcnow()
            call.duration_seconds = duration_seconds
            call.cost_cents = cost_cents
            call.updated_at = datetime.utcnow()
            
            self.db.add(call)
            self.db.commit()
            
            # Track event
            await self.track_event(
                call_id=call_id,
                event_type=CallEventType.CALL_ENDED,
                event_data={
                    "end_reason": end_reason,
                    "duration_seconds": duration_seconds,
                    "cost_cents": cost_cents,
                    "ended_at": call.ended_at.isoformat()
                }
            )
            
            logger.info(f"Call {call_id} ended: {end_reason}, duration: {duration_seconds}s")
            
            return {
                "success": True,
                "call_id": call_id,
                "status": call.status,
                "duration_seconds": duration_seconds,
                "end_reason": end_reason,
                "ended_at": call.ended_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to end call {call_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def fail_call(
        self,
        call_id: str,
        failure_reason: str,
        error_details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Mark call as failed with reason."""
        try:
            call = self.call_repo.get_by_call_id(self.db, call_id)
            if not call:
                return {"success": False, "error": "Call not found"}
            
            # Update call record
            call.status = "failed"
            call.ended_at = datetime.utcnow()
            call.updated_at = datetime.utcnow()
            
            if call.started_at:
                call.duration_seconds = int((datetime.utcnow() - call.started_at).total_seconds())
            
            self.db.add(call)
            self.db.commit()
            
            # Track failure event
            await self.track_event(
                call_id=call_id,
                event_type=CallEventType.CALL_FAILED,
                event_data={
                    "failure_reason": failure_reason,
                    "error_details": error_details or {},
                    "failed_at": datetime.utcnow().isoformat()
                }
            )
            
            logger.warning(f"Call {call_id} failed: {failure_reason}")
            
            return {
                "success": True,
                "call_id": call_id,
                "status": "failed",
                "failure_reason": failure_reason
            }
            
        except Exception as e:
            logger.error(f"Failed to mark call {call_id} as failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def track_event(
        self,
        call_id: str,
        event_type: CallEventType,
        event_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Track a call lifecycle event.
        
        Args:
            call_id: Call ID
            event_type: Event type enum
            event_data: Additional event data
            
        Returns:
            Dict with event tracking result
        """
        try:
            event = self.event_repo.create_event(
                db=self.db,
                call_id=call_id,
                event_type=event_type.value,
                event_data=event_data or {}
            )
            
            return {
                "success": True,
                "event_id": event.event_id,
                "event_type": event_type.value,
                "occurred_at": event.occurred_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to track event {event_type.value} for call {call_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "event_type": event_type.value
            }
    
    def get_call_timeline(self, call_id: str) -> List[Dict[str, Any]]:
        """Get complete timeline of events for a call."""
        try:
            events = self.event_repo.get_call_timeline(self.db, call_id)
            
            timeline = []
            for event in events:
                timeline.append({
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "event_data": event.event_data,
                    "occurred_at": event.occurred_at.isoformat()
                })
            
            return timeline
            
        except Exception as e:
            logger.error(f"Failed to get call timeline for {call_id}: {str(e)}")
            return []
    
    def get_call_performance_stats(self, call_id: str) -> Dict[str, Any]:
        """Get performance statistics for a call."""
        try:
            events = self.event_repo.get_call_timeline(self.db, call_id)
            
            # Calculate timing between events
            event_times = {}
            for event in events:
                event_times[event.event_type] = event.occurred_at
            
            stats = {"call_id": call_id}
            
            # Calculate response times
            if "call_started" in event_times and "voice_detected" in event_times:
                detection_time = (event_times["voice_detected"] - event_times["call_started"]).total_seconds()
                stats["voice_detection_time_seconds"] = detection_time
            
            if "stt_completed" in event_times and "voice_detected" in event_times:
                stt_time = (event_times["stt_completed"] - event_times["voice_detected"]).total_seconds()
                stats["stt_processing_time_seconds"] = stt_time
            
            if "chat_processed" in event_times and "stt_completed" in event_times:
                chat_time = (event_times["chat_processed"] - event_times["stt_completed"]).total_seconds()
                stats["chat_processing_time_seconds"] = chat_time
            
            if "tts_completed" in event_times and "chat_processed" in event_times:
                tts_time = (event_times["tts_completed"] - event_times["chat_processed"]).total_seconds()
                stats["tts_processing_time_seconds"] = tts_time
            
            if "response_played" in event_times and "voice_detected" in event_times:
                total_response_time = (event_times["response_played"] - event_times["voice_detected"]).total_seconds()
                stats["total_response_time_seconds"] = total_response_time
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get performance stats for call {call_id}: {str(e)}")
            return {"call_id": call_id, "error": str(e)}
    
    def get_active_calls(self) -> List[Dict[str, Any]]:
        """Get all active calls for the client."""
        try:
            active_calls = self.call_repo.get_active_calls_by_client_id(self.db, self.client_id)
            
            call_summaries = []
            for call in active_calls:
                call_summaries.append({
                    "call_id": call.call_id,
                    "phone_number": call.phone_number,
                    "caller_number": call.caller_number,
                    "status": call.status,
                    "started_at": call.started_at.isoformat(),
                    "duration_seconds": int((datetime.utcnow() - call.started_at).total_seconds())
                })
            
            return call_summaries
            
        except Exception as e:
            logger.error(f"Failed to get active calls for client {self.client_id}: {str(e)}")
            return []
    
    async def cleanup_old_events(self, days_to_keep: int = 30) -> Dict[str, Any]:
        """Cleanup old call events for maintenance."""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            # This would require a method in the repository to delete old events
            # For now, just return stats
            logger.info(f"Cleanup requested for events older than {cutoff_date}")
            
            return {
                "success": True,
                "cutoff_date": cutoff_date.isoformat(),
                "client_id": self.client_id,
                "message": "Cleanup operation logged (implementation needed in repository)"
            }
            
        except Exception as e:
            logger.error(f"Failed to cleanup old events: {str(e)}")
            return {"success": False, "error": str(e)}