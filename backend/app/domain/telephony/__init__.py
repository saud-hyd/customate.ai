"""
Telephony domain package for Customate.ai voice agent feature.

This package contains all domain entities, enums, and value objects
related to telephony and voice processing functionality.
"""

from .entities import (
    PhoneNumber,
    Call,
    VoiceSession,
    CallEvent
)

from .enums import (
    CallStatus,
    CallDirection,
    PhoneNumberStatus,
    VoiceProvider,
    TelephonyProvider,
    CallEventType,
    CallQuality,
    VoiceModel,
    VoiceType,
    LanguageCode,
    TelephonyConstants,
    get_enum_values,
    validate_enum_value
)

__all__ = [
    # Entities
    "PhoneNumber",
    "Call",
    "VoiceSession", 
    "CallEvent",
    
    # Enums
    "CallStatus",
    "CallDirection",
    "PhoneNumberStatus",
    "VoiceProvider",
    "TelephonyProvider",
    "CallEventType",
    "CallQuality",
    "VoiceModel",
    "VoiceType",
    "LanguageCode",
    "TelephonyConstants",
    
    # Utilities
    "get_enum_values",
    "validate_enum_value"
]