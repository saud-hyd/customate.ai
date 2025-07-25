# backend/app/repositories/telephony_repository.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from datetime import datetime, timedelta

from app.domain.telephony.entities import PhoneNumber, Call, VoiceSession, CallEvent
from app.repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class PhoneNumberRepository(BaseRepository[PhoneNumber, Dict[str, Any], Dict[str, Any]]):
    """Repository for PhoneNumber entity with multi-tenant isolation."""
    
    def __init__(self):
        super().__init__(PhoneNumber)
    
    def get_by_number_id(self, db: Session, number_id: str) -> Optional[PhoneNumber]:
        """Get phone number by number_id."""
        return db.query(self.model).filter(self.model.number_id == number_id).first()
    
    def get_by_phone_number(self, db: Session, phone_number: str) -> Optional[PhoneNumber]:
        """Get phone number by actual phone number string."""
        return db.query(self.model).filter(self.model.phone_number == phone_number).first()
    
    def get_by_client_id(self, db: Session, client_id: str, status: Optional[str] = None) -> List[PhoneNumber]:
        """Get all phone numbers for a client with optional status filter."""
        query = db.query(self.model).filter(self.model.client_id == client_id)
        
        if status:
            query = query.filter(self.model.status == status)
        
        return query.order_by(desc(self.model.assigned_at)).all()
    
    def get_active_by_client_id(self, db: Session, client_id: str) -> List[PhoneNumber]:
        """Get active phone numbers for a client."""
        return self.get_by_client_id(db, client_id, status="active")
    
    def get_by_provider_sid(self, db: Session, provider_sid: str) -> Optional[PhoneNumber]:
        """Get phone number by provider SID (for webhook lookup)."""
        return db.query(self.model).filter(self.model.provider_sid == provider_sid).first()
    
    def count_by_client_id(self, db: Session, client_id: str) -> int:
        """Count phone numbers for a client (for subscription limits)."""
        return db.query(func.count(self.model.id)).filter(
            self.model.client_id == client_id,
            self.model.status == "active"
        ).scalar() or 0
    
    def get_available_numbers(self, db: Session, country_code: str = "US", limit: int = 10) -> List[PhoneNumber]:
        """Get available phone numbers for assignment."""
        return db.query(self.model).filter(
            self.model.client_id.is_(None),
            self.model.country_code == country_code,
            self.model.status == "available"
        ).limit(limit).all()


class CallRepository(BaseRepository[Call, Dict[str, Any], Dict[str, Any]]):
    """Repository for Call entity with analytics optimization."""
    
    def __init__(self):
        super().__init__(Call)
    
    def get_by_call_id(self, db: Session, call_id: str) -> Optional[Call]:
        """Get call by call_id."""
        return db.query(self.model).filter(self.model.call_id == call_id).first()
    
    def get_by_twilio_call_sid(self, db: Session, twilio_call_sid: str) -> Optional[Call]:
        """Get call by Twilio call SID (for webhook processing)."""
        return db.query(self.model).filter(self.model.twilio_call_sid == twilio_call_sid).first()
    
    def get_by_client_id(
        self, 
        db: Session, 
        client_id: str, 
        limit: int = 50, 
        skip: int = 0,
        direction: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Call]:
        """Get calls for a client with filtering and pagination."""
        query = db.query(self.model).filter(self.model.client_id == client_id)
        
        if direction:
            query = query.filter(self.model.direction == direction)
        
        if status:
            query = query.filter(self.model.status == status)
        
        if start_date:
            query = query.filter(self.model.started_at >= start_date)
        
        if end_date:
            query = query.filter(self.model.started_at <= end_date)
        
        return query.order_by(desc(self.model.started_at)).offset(skip).limit(limit).all()
    
    def get_active_calls_by_client_id(self, db: Session, client_id: str) -> List[Call]:
        """Get currently active calls for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.status.in_(["ringing", "in-progress"])
        ).all()
    
    def get_recent_calls(
        self, 
        db: Session, 
        client_id: str, 
        hours: int = 24
    ) -> List[Call]:
        """Get recent calls within specified hours."""
        since_time = datetime.utcnow() - timedelta(hours=hours)
        return db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.started_at >= since_time
        ).order_by(desc(self.model.started_at)).all()
    
    # Call Analytics Methods
    def get_call_analytics(
        self, 
        db: Session, 
        client_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get comprehensive call analytics for a client."""
        query = db.query(self.model).filter(self.model.client_id == client_id)
        
        if start_date:
            query = query.filter(self.model.started_at >= start_date)
        if end_date:
            query = query.filter(self.model.started_at <= end_date)
        
        # Total calls
        total_calls = query.count()
        
        # Completed calls
        completed_calls = query.filter(self.model.status == "completed").count()
        
        # Failed calls
        failed_calls = query.filter(self.model.status == "failed").count()
        
        # Average duration (only completed calls)
        avg_duration = db.query(func.avg(self.model.duration_seconds)).filter(
            self.model.client_id == client_id,
            self.model.status == "completed",
            self.model.duration_seconds.isnot(None)
        )
        
        if start_date:
            avg_duration = avg_duration.filter(self.model.started_at >= start_date)
        if end_date:
            avg_duration = avg_duration.filter(self.model.started_at <= end_date)
        
        avg_duration_result = avg_duration.scalar()
        
        # Total duration in minutes
        total_duration = db.query(func.sum(self.model.duration_seconds)).filter(
            self.model.client_id == client_id,
            self.model.status == "completed"
        )
        
        if start_date:
            total_duration = total_duration.filter(self.model.started_at >= start_date)
        if end_date:
            total_duration = total_duration.filter(self.model.started_at <= end_date)
        
        total_duration_seconds = total_duration.scalar() or 0
        
        # Total cost
        total_cost = db.query(func.sum(self.model.cost_cents)).filter(
            self.model.client_id == client_id,
            self.model.cost_cents.isnot(None)
        )
        
        if start_date:
            total_cost = total_cost.filter(self.model.started_at >= start_date)
        if end_date:
            total_cost = total_cost.filter(self.model.started_at <= end_date)
        
        total_cost_cents = total_cost.scalar() or 0
        
        return {
            "total_calls": total_calls,
            "completed_calls": completed_calls,
            "failed_calls": failed_calls,
            "success_rate": (completed_calls / total_calls * 100) if total_calls > 0 else 0,
            "average_duration_seconds": int(avg_duration_result) if avg_duration_result else 0,
            "total_duration_minutes": int(total_duration_seconds / 60),
            "total_cost_cents": total_cost_cents,
            "total_cost_dollars": total_cost_cents / 100
        }
    
    def get_call_volume_by_day(
        self, 
        db: Session, 
        client_id: str, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get daily call volume for analytics charts."""
        since_date = datetime.utcnow() - timedelta(days=days)
        
        results = db.query(
            func.date(self.model.started_at).label('date'),
            func.count(self.model.id).label('call_count'),
            func.sum(self.model.duration_seconds).label('total_duration')
        ).filter(
            self.model.client_id == client_id,
            self.model.started_at >= since_date
        ).group_by(
            func.date(self.model.started_at)
        ).order_by(
            func.date(self.model.started_at)
        ).all()
        
        return [
            {
                "date": result.date.isoformat(),
                "call_count": result.call_count,
                "total_duration_minutes": int((result.total_duration or 0) / 60)
            }
            for result in results
        ]
    
    def get_monthly_usage(self, db: Session, client_id: str) -> int:
        """Get total call minutes for current month (for subscription limits)."""
        # Get first day of current month
        now = datetime.utcnow()
        first_day = datetime(now.year, now.month, 1)
        
        total_seconds = db.query(func.sum(self.model.duration_seconds)).filter(
            self.model.client_id == client_id,
            self.model.started_at >= first_day,
            self.model.status == "completed"
        ).scalar() or 0
        
        return int(total_seconds / 60)  # Convert to minutes


class VoiceSessionRepository(BaseRepository[VoiceSession, Dict[str, Any], Dict[str, Any]]):
    """Repository for VoiceSession entity."""
    
    def __init__(self):
        super().__init__(VoiceSession)
    
    def get_by_session_id(self, db: Session, session_id: str) -> Optional[VoiceSession]:
        """Get voice session by session_id."""
        return db.query(self.model).filter(self.model.session_id == session_id).first()
    
    def get_by_call_id(self, db: Session, call_id: str) -> Optional[VoiceSession]:
        """Get voice session by call_id."""
        return db.query(self.model).filter(self.model.call_id == call_id).first()
    
    def get_by_client_id(self, db: Session, client_id: str, limit: int = 50) -> List[VoiceSession]:
        """Get voice sessions for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id
        ).order_by(desc(self.model.created_at)).limit(limit).all()
    
    def get_active_sessions_by_client_id(self, db: Session, client_id: str) -> List[VoiceSession]:
        """Get active voice sessions for a client."""
        return db.query(self.model).filter(
            self.model.client_id == client_id,
            self.model.status == "active"
        ).all()
    
    def get_by_chat_session_id(self, db: Session, chat_session_id: str) -> Optional[VoiceSession]:
        """Get voice session by linked chat session ID."""
        return db.query(self.model).filter(
            self.model.chat_session_id == chat_session_id
        ).first()


class CallEventRepository(BaseRepository[CallEvent, Dict[str, Any], Dict[str, Any]]):
    """Repository for CallEvent entity for lightweight event tracking."""
    
    def __init__(self):
        super().__init__(CallEvent)
    
    def get_by_event_id(self, db: Session, event_id: str) -> Optional[CallEvent]:
        """Get call event by event_id."""
        return db.query(self.model).filter(self.model.event_id == event_id).first()
    
    def get_by_call_id(
        self, 
        db: Session, 
        call_id: str, 
        event_type: Optional[str] = None
    ) -> List[CallEvent]:
        """Get events for a call, optionally filtered by event type."""
        query = db.query(self.model).filter(self.model.call_id == call_id)
        
        if event_type:
            query = query.filter(self.model.event_type == event_type)
        
        return query.order_by(self.model.occurred_at).all()
    
    def create_event(
        self, 
        db: Session, 
        call_id: str, 
        event_type: str, 
        event_data: Optional[Dict[str, Any]] = None
    ) -> CallEvent:
        """Create a new call event (helper method)."""
        event = CallEvent(
            call_id=call_id,
            event_type=event_type,
            event_data=event_data or {}
        )
        
        db.add(event)
        db.commit()
        db.refresh(event)
        
        logger.info(f"Created call event: {event_type} for call {call_id}")
        return event
    
    def get_recent_events(
        self, 
        db: Session, 
        client_id: str, 
        hours: int = 1
    ) -> List[CallEvent]:
        """Get recent call events for monitoring (joins with calls for client filtering)."""
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        return db.query(self.model).join(Call).filter(
            Call.client_id == client_id,
            self.model.occurred_at >= since_time
        ).order_by(desc(self.model.occurred_at)).all()
    
    def get_call_timeline(self, db: Session, call_id: str) -> List[CallEvent]:
        """Get complete event timeline for a call (for debugging/analytics)."""
        return self.get_by_call_id(db, call_id)


# Repository Factory for Dependency Injection
class TelephonyRepositoryFactory:
    """Factory for creating telephony repositories."""
    
    @staticmethod
    def create_phone_number_repository() -> PhoneNumberRepository:
        return PhoneNumberRepository()
    
    @staticmethod
    def create_call_repository() -> CallRepository:
        return CallRepository()
    
    @staticmethod
    def create_voice_session_repository() -> VoiceSessionRepository:
        return VoiceSessionRepository()
    
    @staticmethod
    def create_call_event_repository() -> CallEventRepository:
        return CallEventRepository()


# Dependency injection functions for FastAPI
def get_phone_number_repository() -> PhoneNumberRepository:
    """Dependency for PhoneNumberRepository."""
    return TelephonyRepositoryFactory.create_phone_number_repository()


def get_call_repository() -> CallRepository:
    """Dependency for CallRepository."""
    return TelephonyRepositoryFactory.create_call_repository()


def get_voice_session_repository() -> VoiceSessionRepository:
    """Dependency for VoiceSessionRepository."""
    return TelephonyRepositoryFactory.create_voice_session_repository()


def get_call_event_repository() -> CallEventRepository:
    """Dependency for CallEventRepository."""
    return TelephonyRepositoryFactory.create_call_event_repository()