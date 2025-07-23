# backend/tests/repositories/test_telephony_repository.py
"""
Unit tests for telephony repositories.

Tests cover multi-tenant data isolation, query optimization,
and analytics functionality. Critical for ensuring client data separation.
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.repositories.telephony_repository import (
    PhoneNumberRepository,
    CallRepository,
    VoiceSessionRepository,
    CallEventRepository
)
from app.repositories.telephony_analytics import TelephonyAnalyticsRepository
from app.domain.telephony.entities import PhoneNumber, Call, VoiceSession, CallEvent


class TestPhoneNumberRepository:
    """Test PhoneNumberRepository multi-tenant isolation."""
    
    def test_get_by_client_id_isolation(self, db_session: Session):
        """Test that phone numbers are isolated by client_id."""
        repo = PhoneNumberRepository()
        
        # Create phone numbers for different clients
        phone1 = PhoneNumber(
            client_id="client-1",
            phone_number="+1234567890",
            status="active"
        )
        phone2 = PhoneNumber(
            client_id="client-2", 
            phone_number="+1234567891",
            status="active"
        )
        
        db_session.add_all([phone1, phone2])
        db_session.commit()
        
        # Test isolation
        client1_phones = repo.get_by_client_id(db_session, "client-1")
        client2_phones = repo.get_by_client_id(db_session, "client-2")
        
        assert len(client1_phones) == 1
        assert len(client2_phones) == 1
        assert client1_phones[0].phone_number == "+1234567890"
        assert client2_phones[0].phone_number == "+1234567891"
    
    def test_count_by_client_id(self, db_session: Session):
        """Test phone number counting for subscription limits."""
        repo = PhoneNumberRepository()
        
        # Create active and inactive phone numbers
        phones = [
            PhoneNumber(client_id="client-1", phone_number="+1111", status="active"),
            PhoneNumber(client_id="client-1", phone_number="+2222", status="active"),
            PhoneNumber(client_id="client-1", phone_number="+3333", status="inactive"),
            PhoneNumber(client_id="client-2", phone_number="+4444", status="active")
        ]
        
        db_session.add_all(phones)
        db_session.commit()
        
        # Test count (should only count active numbers)
        client1_count = repo.count_by_client_id(db_session, "client-1")
        client2_count = repo.count_by_client_id(db_session, "client-2")
        
        assert client1_count == 2  # Only active numbers
        assert client2_count == 1
    
    def test_get_by_provider_sid(self, db_session: Session):
        """Test lookup by Twilio SID for webhook processing."""
        repo = PhoneNumberRepository()
        
        phone = PhoneNumber(
            client_id="client-1",
            phone_number="+1234567890",
            provider_sid="PN123456789",
            status="active"
        )
        
        db_session.add(phone)
        db_session.commit()
        
        # Test lookup
        found_phone = repo.get_by_provider_sid(db_session, "PN123456789")
        assert found_phone is not None
        assert found_phone.client_id == "client-1"
        
        # Test non-existent SID
        not_found = repo.get_by_provider_sid(db_session, "INVALID")
        assert not_found is None


class TestCallRepository:
    """Test CallRepository with focus on analytics and isolation."""
    
    def test_client_isolation(self, db_session: Session):
        """Test call data isolation between clients."""
        repo = CallRepository()
        
        # Create calls for different clients
        call1 = Call(
            client_id="client-1",
            phone_number="+1111", 
            caller_number="+2222",
            direction="inbound",
            status="completed",
            started_at=datetime.utcnow()
        )
        call2 = Call(
            client_id="client-2",
            phone_number="+3333",
            caller_number="+4444", 
            direction="inbound",
            status="completed",
            started_at=datetime.utcnow()
        )
        
        db_session.add_all([call1, call2])
        db_session.commit()
        
        # Test isolation
        client1_calls = repo.get_by_client_id(db_session, "client-1")
        client2_calls = repo.get_by_client_id(db_session, "client-2")
        
        assert len(client1_calls) == 1
        assert len(client2_calls) == 1
        assert client1_calls[0].phone_number == "+1111"
        assert client2_calls[0].phone_number == "+3333"
    
    def test_get_by_client_id_filtering(self, db_session: Session):
        """Test call filtering by direction, status, and date range."""
        repo = CallRepository()
        
        base_time = datetime.utcnow()
        
        calls = [
            Call(
                client_id="client-1",
                phone_number="+1111",
                caller_number="+2222",
                direction="inbound",
                status="completed",
                started_at=base_time - timedelta(hours=1)
            ),
            Call(
                client_id="client-1", 
                phone_number="+1111",
                caller_number="+3333",
                direction="outbound",
                status="failed", 
                started_at=base_time - timedelta(hours=2)
            ),
            Call(
                client_id="client-1",
                phone_number="+1111",
                caller_number="+4444",
                direction="inbound",
                status="completed",
                started_at=base_time - timedelta(days=2)
            )
        ]
        
        db_session.add_all(calls)
        db_session.commit()
        
        # Test direction filter
        inbound_calls = repo.get_by_client_id(
            db_session, "client-1", direction="inbound"
        )
        assert len(inbound_calls) == 2
        
        # Test status filter
        completed_calls = repo.get_by_client_id(
            db_session, "client-1", status="completed" 
        )
        assert len(completed_calls) == 2
        
        # Test date range filter
        recent_calls = repo.get_by_client_id(
            db_session, 
            "client-1",
            start_date=base_time - timedelta(hours=3)
        )
        assert len(recent_calls) == 2  # Should exclude the 2-day old call
    
    def test_call_analytics(self, db_session: Session):
        """Test call analytics calculation."""
        repo = CallRepository()
        
        calls = [
            Call(
                client_id="client-1",
                phone_number="+1111",
                caller_number="+2222", 
                direction="inbound",
                status="completed",
                duration_seconds=120,
                cost_cents=50,
                started_at=datetime.utcnow()
            ),
            Call(
                client_id="client-1",
                phone_number="+1111", 
                caller_number="+3333",
                direction="inbound",
                status="completed",
                duration_seconds=180,
                cost_cents=75,
                started_at=datetime.utcnow()
            ),
            Call(
                client_id="client-1",
                phone_number="+1111",
                caller_number="+4444",
                direction="inbound", 
                status="failed",
                started_at=datetime.utcnow()
            )
        ]
        
        db_session.add_all(calls)
        db_session.commit()
        
        # Test analytics
        analytics = repo.get_call_analytics(db_session, "client-1")
        
        assert analytics["total_calls"] == 3
        assert analytics["completed_calls"] == 2
        assert analytics["failed_calls"] == 1
        assert analytics["success_rate"] == 66.67  # 2/3 * 100
        assert analytics["average_duration_seconds"] == 150  # (120+180)/2
        assert analytics["total_duration_minutes"] == 5  # (120+180)/60
        assert analytics["total_cost_cents"] == 125  # 50+75  
        assert analytics["total_cost_dollars"] == 1.25
    
    def test_monthly_usage_calculation(self, db_session: Session):
        """Test monthly usage calculation for subscription limits."""
        repo = CallRepository()
        
        now = datetime.utcnow()
        first_day_this_month = datetime(now.year, now.month, 1)
        last_month = first_day_this_month - timedelta(days=1)
        
        calls = [
            # This month's calls (should be counted)
            Call(
                client_id="client-1",
                phone_number="+1111",
                caller_number="+2222",
                direction="inbound", 
                status="completed",
                duration_seconds=600,  # 10 minutes
                started_at=first_day_this_month + timedelta(days=1)
            ),
            Call(
                client_id="client-1",
                phone_number="+1111", 
                caller_number="+3333",
                direction="inbound",
                status="completed", 
                duration_seconds=300,  # 5 minutes
                started_at=first_day_this_month + timedelta(days=5)
            ),
            # Last month's call (should NOT be counted)
            Call(
                client_id="client-1",
                phone_number="+1111",
                caller_number="+4444",
                direction="inbound",
                status="completed",
                duration_seconds=1200,  # 20 minutes
                started_at=last_month
            )
        ]
        
        db_session.add_all(calls)
        db_session.commit()
        
        # Test monthly usage (should only count this month)
        monthly_minutes = repo.get_monthly_usage(db_session, "client-1")
        assert monthly_minutes == 15  # 10 + 5 minutes


class TestCallEventRepository:
    """Test CallEventRepository for event tracking."""
    
    def test_create_event(self, db_session: Session):
        """Test event creation helper method."""
        repo = CallEventRepository()
        
        # Create a call first
        call = Call(
            client_id="client-1",
            phone_number="+1111",
            caller_number="+2222",
            direction="inbound",
            status="in-progress",
            started_at=datetime.utcnow()
        )
        db_session.add(call)
        db_session.commit()
        
        # Create event
        event = repo.create_event(
            db_session,
            call.call_id,
            "voice_detected",
            {"language": "en", "confidence": 0.95}
        )
        
        assert event.call_id == call.call_id
        assert event.event_type == "voice_detected"
        assert event.event_data["language"] == "en"
        assert event.event_data["confidence"] == 0.95
    
    def test_get_call_timeline(self, db_session: Session):
        """Test complete call event timeline retrieval."""
        repo = CallEventRepository()
        
        # Create call and events
        call = Call(
            client_id="client-1",
            phone_number="+1111", 
            caller_number="+2222",
            direction="inbound",
            status="completed",
            started_at=datetime.utcnow()
        )
        db_session.add(call)
        db_session.commit()
        
        # Create timeline events
        events = [
            repo.create_event(db_session, call.call_id, "call_started"),
            repo.create_event(db_session, call.call_id, "voice_detected"),
            repo.create_event(db_session, call.call_id, "response_generated"),
            repo.create_event(db_session, call.call_id, "call_ended")
        ]
        
        # Get timeline
        timeline = repo.get_call_timeline(db_session, call.call_id)
        
        assert len(timeline) == 4
        assert timeline[0].event_type == "call_started"
        assert timeline[-1].event_type == "call_ended"
        
        # Verify chronological order
        for i in range(1, len(timeline)):
            assert timeline[i].occurred_at >= timeline[i-1].occurred_at


class TestTelephonyAnalyticsRepository:
    """Test specialized analytics repository."""
    
    def test_client_usage_summary(self, db_session: Session):
        """Test comprehensive usage summary calculation."""
        repo = TelephonyAnalyticsRepository()
        
        # Create test data
        now = datetime.utcnow()
        calls = [
            Call(
                client_id="client-1", 
                phone_number="+1111",
                caller_number="+2222",
                direction="inbound",
                status="completed",
                duration_seconds=300,  # 5 minutes
                cost_cents=100,
                started_at=now - timedelta(hours=1)
            ),
            Call(
                client_id="client-1",
                phone_number="+1111",
                caller_number="+3333", 
                direction="inbound",
                status="failed",
                started_at=now - timedelta(hours=2)
            )
        ]
        
        db_session.add_all(calls)
        db_session.commit()
        
        # Test usage summary
        summary = repo.get_client_usage_summary(db_session, "client-1")
        
        assert summary["summary"]["total_calls"] == 2
        assert summary["summary"]["total_minutes"] == 5
        assert summary["summary"]["total_cost_cents"] == 100
        assert summary["success_rate"] == 50.0  # 1 completed out of 2
        
        # Test status breakdown
        assert "completed" in summary["status_breakdown"]
        assert "failed" in summary["status_breakdown"]
        assert summary["status_breakdown"]["completed"]["count"] == 1
        assert summary["status_breakdown"]["failed"]["count"] == 1


# Fixtures for testing
@pytest.fixture
def db_session():
    """Mock database session for testing."""
    # This would typically be provided by your test configuration
    # Returning None as placeholder - replace with actual test DB session
    return None