"""
Telephony domain enums for Customate.ai voice agent feature.

This module defines all the enumeration types used throughout the telephony system,
providing type safety and consistent values across the application.
"""

from enum import Enum, auto
from typing import List


class CallStatus(str, Enum):
    """
    Status of a phone call throughout its lifecycle.
    Maps to Twilio call statuses where applicable.
    """
    INITIATED = "initiated"      # Call created, not yet ringing
    RINGING = "ringing"         # Phone is ringing
    ANSWERED = "answered"       # Call has been answered
    ENDED = "ended"            # Call completed normally
    FAILED = "failed"          # Call failed to connect
    BUSY = "busy"              # Called party was busy
    NO_ANSWER = "no_answer"    # Call rang but wasn't answered
    CANCELLED = "cancelled"    # Call was cancelled before answer
    
    @classmethod
    def active_statuses(cls) -> List[str]:
        """Return statuses that indicate an active call."""
        return [cls.INITIATED, cls.RINGING, cls.ANSWERED]
    
    @classmethod
    def completed_statuses(cls) -> List[str]:
        """Return statuses that indicate a completed call."""
        return [cls.ENDED, cls.FAILED, cls.BUSY, cls.NO_ANSWER, cls.CANCELLED]
    
    def is_active(self) -> bool:
        """Check if this status indicates an active call."""
        return self in self.active_statuses()
    
    def is_completed(self) -> bool:
        """Check if this status indicates a completed call."""
        return self in self.completed_statuses()


class CallDirection(str, Enum):
    """
    Direction of a phone call from the perspective of our system.
    """
    INBOUND = "inbound"         # Customer called our number
    OUTBOUND = "outbound"       # We called customer (future feature)
    
    def __str__(self):
        return self.value


class PhoneNumberStatus(str, Enum):
    """
    Status of a provisioned phone number.
    """
    ACTIVE = "active"           # Number is active and can receive calls
    INACTIVE = "inactive"       # Number is inactive, no calls accepted
    SUSPENDED = "suspended"     # Number is temporarily suspended
    RELEASED = "released"       # Number has been released back to provider
    PENDING = "pending"         # Number provision is in progress
    
    @classmethod
    def usable_statuses(cls) -> List[str]:
        """Return statuses where the number can receive calls."""
        return [cls.ACTIVE]
    
    def can_receive_calls(self) -> bool:
        """Check if number can receive calls in this status."""
        return self in self.usable_statuses()


class VoiceProvider(str, Enum):
    """
    Voice processing providers (STT/TTS).
    Currently focused on OpenAI, but extensible for future providers.
    """
    OPENAI = "openai"           # OpenAI Whisper (STT) + TTS
    # Future providers can be added here
    # GOOGLE = "google"
    # AZURE = "azure"
    # AWS = "aws"
    
    def __str__(self):
        return self.value


class TelephonyProvider(str, Enum):
    """
    Telephony service providers for phone numbers and call handling.
    Currently focused on Twilio, but extensible.
    """
    TWILIO = "twilio"           # Twilio Voice API
    # Future providers can be added here
    # VONAGE = "vonage"
    # AWS_CONNECT = "aws_connect"
    
    def __str__(self):
        return self.value


class CallEventType(str, Enum):
    """
    Types of events that can occur during a call lifecycle.
    Used for analytics, debugging, and call flow tracking.
    """
    # Call lifecycle events
    CALL_INITIATED = "call_initiated"         # Call started
    CALL_RINGING = "call_ringing"            # Phone ringing
    CALL_ANSWERED = "call_answered"          # Call answered
    CALL_ENDED = "call_ended"                # Call ended normally
    CALL_FAILED = "call_failed"              # Call failed
    
    # Voice processing events
    VOICE_DETECTED = "voice_detected"        # Voice input detected
    TRANSCRIPTION_STARTED = "transcription_started"  # STT processing started
    TRANSCRIPTION_COMPLETED = "transcription_completed"  # STT completed
    CHAT_PROCESSING_STARTED = "chat_processing_started"  # Chat service processing
    CHAT_PROCESSING_COMPLETED = "chat_processing_completed"  # Chat response ready
    TTS_STARTED = "tts_started"              # Text-to-speech started
    TTS_COMPLETED = "tts_completed"          # Audio response generated
    AUDIO_PLAYED = "audio_played"            # Audio played to caller
    
    # Error events
    TRANSCRIPTION_ERROR = "transcription_error"     # STT failed
    CHAT_PROCESSING_ERROR = "chat_processing_error" # Chat service error
    TTS_ERROR = "tts_error"                  # TTS generation failed
    TIMEOUT_ERROR = "timeout_error"          # Processing timeout
    
    # Quality events
    SILENCE_DETECTED = "silence_detected"    # Extended silence
    QUALITY_DEGRADED = "quality_degraded"    # Call quality issues
    HIGH_LATENCY = "high_latency"           # Response too slow
    
    @classmethod
    def error_events(cls) -> List[str]:
        """Return all error event types."""
        return [
            cls.CALL_FAILED,
            cls.TRANSCRIPTION_ERROR,
            cls.CHAT_PROCESSING_ERROR,
            cls.TTS_ERROR,
            cls.TIMEOUT_ERROR
        ]
    
    @classmethod
    def processing_events(cls) -> List[str]:
        """Return all voice processing event types."""
        return [
            cls.VOICE_DETECTED,
            cls.TRANSCRIPTION_STARTED,
            cls.TRANSCRIPTION_COMPLETED,
            cls.CHAT_PROCESSING_STARTED,
            cls.CHAT_PROCESSING_COMPLETED,
            cls.TTS_STARTED,
            cls.TTS_COMPLETED,
            cls.AUDIO_PLAYED
        ]
    
    def is_error(self) -> bool:
        """Check if this is an error event."""
        return self in self.error_events()
    
    def is_processing_event(self) -> bool:
        """Check if this is a voice processing event."""
        return self in self.processing_events()


class CallQuality(str, Enum):
    """
    Call quality assessment levels.
    Based on voice clarity, connection stability, and response times.
    """
    EXCELLENT = "excellent"     # >95% quality, <1s response time
    GOOD = "good"              # 85-95% quality, 1-2s response time
    FAIR = "fair"              # 70-85% quality, 2-3s response time
    POOR = "poor"              # <70% quality, >3s response time
    UNKNOWN = "unknown"        # Quality not yet assessed
    
    @classmethod
    def from_metrics(cls, confidence: float, response_time_ms: int) -> 'CallQuality':
        """
        Determine call quality from transcription confidence and response time.
        
        Args:
            confidence: Transcription confidence (0.0 to 1.0)
            response_time_ms: Average response time in milliseconds
        
        Returns:
            CallQuality level
        """
        if confidence >= 0.95 and response_time_ms < 1000:
            return cls.EXCELLENT
        elif confidence >= 0.85 and response_time_ms < 2000:
            return cls.GOOD
        elif confidence >= 0.70 and response_time_ms < 3000:
            return cls.FAIR
        else:
            return cls.POOR


class VoiceModel(str, Enum):
    """
    Available voice models for text-to-speech synthesis.
    Based on OpenAI TTS models.
    """
    TTS_1 = "tts-1"            # Standard quality, faster
    TTS_1_HD = "tts-1-hd"      # High definition, slower
    
    def __str__(self):
        return self.value


class VoiceType(str, Enum):
    """
    Available voice types for speech synthesis.
    Based on OpenAI TTS voices.
    """
    ALLOY = "alloy"            # Neutral, balanced
    ECHO = "echo"              # Male-leaning
    FABLE = "fable"            # Female-leaning  
    ONYX = "onyx"              # Deep male
    NOVA = "nova"              # Female
    SHIMMER = "shimmer"        # Gentle female
    
    def __str__(self):
        return self.value


class LanguageCode(str, Enum):
    """
    Supported language codes for voice processing.
    ISO 639-1 language codes supported by OpenAI Whisper/TTS.
    """
    ENGLISH = "en"             # English
    SPANISH = "es"             # Spanish
    FRENCH = "fr"              # French
    GERMAN = "de"              # German
    ITALIAN = "it"             # Italian
    PORTUGUESE = "pt"          # Portuguese
    DUTCH = "nl"               # Dutch
    RUSSIAN = "ru"             # Russian
    CHINESE = "zh"             # Chinese
    JAPANESE = "ja"            # Japanese
    KOREAN = "ko"              # Korean
    
    def __str__(self):
        return self.value
    
    @classmethod
    def get_default(cls) -> 'LanguageCode':
        """Get the default language."""
        return cls.ENGLISH


# Constants for validation and configuration
class TelephonyConstants:
    """
    Constants used throughout the telephony system.
    """
    # Call duration limits
    MAX_CALL_DURATION_MINUTES = 30
    DEFAULT_CALL_TIMEOUT_SECONDS = 300
    
    # Voice processing timeouts
    STT_TIMEOUT_SECONDS = 10
    CHAT_TIMEOUT_SECONDS = 30
    TTS_TIMEOUT_SECONDS = 15
    MAX_RESPONSE_TIME_MS = 3000
    
    # Audio configuration
    AUDIO_SAMPLE_RATE = 16000
    AUDIO_CHANNELS = 1
    AUDIO_FORMAT = "wav"
    
    # Phone number configuration
    MAX_PHONE_NUMBERS_PER_CLIENT = 10
    PHONE_NUMBER_REGEX = r'^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$'
    
    # Cost tracking (in USD)
    DEFAULT_COST_PER_MINUTE = 0.05
    TWILIO_COST_PER_MINUTE = 0.013
    OPENAI_STT_COST_PER_MINUTE = 0.006
    OPENAI_TTS_COST_PER_1K_CHARS = 0.015


# Utility functions for enum handling
def get_enum_values(enum_class) -> List[str]:
    """Get all values from an enum class as a list."""
    return [item.value for item in enum_class]


def validate_enum_value(value: str, enum_class) -> bool:
    """Validate that a value exists in the given enum class."""
    return value in get_enum_values(enum_class)