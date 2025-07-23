"""
Telephony domain entities for Customate.ai voice agent feature.

This module defines the core database entities for telephony functionality,
following the existing domain pattern used throughout the application.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean, JSON, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.domain.base import BaseEntity


class PhoneNumber(BaseEntity):
    """
    Represents a phone number provisioned for a client.
    Each client can have multiple phone numbers for different purposes.
    """
    __tablename__ = "phone_numbers"

    number_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False, index=True)
    
    # Phone number details
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    country_code = Column(String(5), nullable=False, default='US')
    area_code = Column(String(10))
    
    # Provider details (Twilio)
    provider = Column(String(20), nullable=False, default='twilio')
    provider_sid = Column(String(50), unique=True)  # Twilio phone number SID
    provider_data = Column(JSON)  # Additional provider-specific data
    
    # Status and configuration
    status = Column(String(20), nullable=False, default='active')  # active, inactive, suspended
    is_default = Column(Boolean, default=False)  # Default number for the client
    
    # Voice agent configuration
    voice_enabled = Column(Boolean, default=True)
    voice_model = Column(String(50), default='tts-1')
    voice_language = Column(String(10), default='en')
    voice_speed = Column(DECIMAL(3, 2), default=1.0)
    
    # Timestamps
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    calls = relationship("Call", back_populates="phone_number", lazy="dynamic")
    client = relationship("Client", back_populates="phone_numbers")

    def __repr__(self):
        return f"<PhoneNumber {self.phone_number} for client {self.client_id}>"


class Call(BaseEntity):
    """
    Represents a phone call session.
    Core entity that tracks the entire call lifecycle.
    """
    __tablename__ = "calls"

    call_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False, index=True)
    phone_number_id = Column(String(36), ForeignKey('phone_numbers.number_id'), nullable=False)
    
    # Call identification
    provider_call_sid = Column(String(50), unique=True, index=True)  # Twilio Call SID
    session_id = Column(String(36), default=lambda: str(uuid.uuid4()))  # Internal session tracking
    
    # Call participants
    caller_number = Column(String(20), nullable=False)  # Who called
    called_number = Column(String(20), nullable=False)  # Which number they called
    direction = Column(String(10), nullable=False, default='inbound')  # inbound, outbound
    
    # Call status and timing
    status = Column(String(20), nullable=False, default='initiated')  # initiated, ringing, answered, ended, failed
    start_time = Column(DateTime(timezone=True))
    answer_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer, default=0)
    
    # Call quality and metadata
    call_quality = Column(String(20))  # excellent, good, fair, poor
    disconnect_reason = Column(String(50))  # completed, busy, no-answer, failed, etc.
    provider_data = Column(JSON)  # Raw provider data for debugging
    
    # Voice processing stats
    total_voice_segments = Column(Integer, default=0)
    total_response_time_ms = Column(Integer, default=0)
    average_response_time_ms = Column(Integer, default=0)
    
    # Cost tracking
    cost_per_minute = Column(DECIMAL(6, 4))
    total_cost = Column(DECIMAL(8, 4))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    phone_number = relationship("PhoneNumber", back_populates="calls")
    voice_sessions = relationship("VoiceSession", back_populates="call", lazy="dynamic")
    call_events = relationship("CallEvent", back_populates="call", lazy="dynamic")
    client = relationship("Client", back_populates="calls")

    @property
    def duration_minutes(self) -> float:
        """Calculate call duration in minutes for billing."""
        if self.duration_seconds:
            return round(self.duration_seconds / 60, 2)
        return 0.0

    @property
    def is_active(self) -> bool:
        """Check if call is currently active."""
        return self.status in ['initiated', 'ringing', 'answered']

    def __repr__(self):
        return f"<Call {self.call_id} from {self.caller_number} - {self.status}>"


class VoiceSession(BaseEntity):
    """
    Represents a voice interaction within a call.
    Maps to the existing ChatSession pattern but for voice.
    """
    __tablename__ = "voice_sessions"

    session_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey('calls.call_id'), nullable=False, index=True)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False, index=True)
    
    # Voice processing details
    audio_input_url = Column(Text)  # URL to recorded audio input
    audio_output_url = Column(Text)  # URL to generated audio response
    
    # Transcription details (STT)
    transcribed_text = Column(Text)
    transcription_confidence = Column(DECIMAL(4, 3))  # 0.000 to 1.000
    transcription_language = Column(String(10))
    stt_processing_time_ms = Column(Integer)
    
    # Chat processing (reuses existing EnhancedChatService)
    chat_session_id = Column(String(36), ForeignKey('chat_sessions.session_id'))  # Link to chat session
    chat_response_text = Column(Text)
    chat_processing_time_ms = Column(Integer)
    
    # Speech synthesis details (TTS)
    tts_model = Column(String(50), default='tts-1')
    tts_voice = Column(String(20), default='alloy')
    tts_speed = Column(DECIMAL(3, 2), default=1.0)
    tts_processing_time_ms = Column(Integer)
    
    # Quality metrics
    total_processing_time_ms = Column(Integer)  # End-to-end processing time
    user_sentiment = Column(String(20))  # positive, neutral, negative
    response_relevance_score = Column(DECIMAL(3, 2))  # 0.00 to 1.00
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    call = relationship("Call", back_populates="voice_sessions")
    chat_session = relationship("ChatSession", back_populates="voice_sessions")
    client = relationship("Client", back_populates="voice_sessions")

    @property
    def processing_time_seconds(self) -> float:
        """Total processing time in seconds."""
        if self.total_processing_time_ms:
            return self.total_processing_time_ms / 1000
        return 0.0

    def __repr__(self):
        return f"<VoiceSession {self.session_id} for call {self.call_id}>"


class CallEvent(BaseEntity):
    """
    Tracks call lifecycle events for analytics and debugging.
    Lightweight event tracking (not complex event sourcing).
    """
    __tablename__ = "call_events"

    event_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey('calls.call_id'), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(50), nullable=False, index=True)  # call_started, voice_detected, etc.
    event_data = Column(JSON)  # Additional event-specific data
    event_source = Column(String(20), default='system')  # system, twilio, openai, user
    
    # Event context
    sequence_number = Column(Integer)  # Order of events within a call
    processing_time_ms = Column(Integer)  # Time to process this event
    
    # Timestamps
    occurred_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    call = relationship("Call", back_populates="call_events")

    def __repr__(self):
        return f"<CallEvent {self.event_type} for call {self.call_id}>"


# Add relationships to existing models (to be added to existing files)
"""
Add these relationships to existing models:

# In app/domain/chat/entities.py - ChatSession class:
voice_sessions = relationship("VoiceSession", back_populates="chat_session", lazy="dynamic")

# In app/domain/client/entities.py - Client class:  
phone_numbers = relationship("PhoneNumber", back_populates="client", lazy="dynamic")
calls = relationship("Call", back_populates="client", lazy="dynamic")
voice_sessions = relationship("VoiceSession", back_populates="client", lazy="dynamic")
"""