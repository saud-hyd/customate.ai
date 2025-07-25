# backend/app/repositories/__init__.py
"""
Repository layer exports.

This module provides centralized access to all repository classes
used throughout the application for data access operations.
"""

# Base repository
from app.repositories.base_repository import BaseRepository

# Core repositories
from app.repositories.client_repository import (
    ClientRepository,
    ClientSettingsRepository, 
    SubscriptionRepository
)

from app.repositories.chat_repository import (
    ChatSessionRepository,
    ChatMessageRepository,
    ConversationContextRepository
)

from app.repositories.channel_repository import (
    ChannelRepository,
    ChannelConversationRepository,
    ChannelMessageRepository
)

# Telephony repositories (NEW)
from app.repositories.telephony_repository import (
    PhoneNumberRepository,
    CallRepository,
    VoiceSessionRepository,
    CallEventRepository,
    TelephonyRepositoryFactory,
    get_phone_number_repository,
    get_call_repository,
    get_voice_session_repository,
    get_call_event_repository
)

__all__ = [
    # Base
    "BaseRepository",
    
    # Core repositories
    "ClientRepository",
    "ClientSettingsRepository",
    "SubscriptionRepository",
    
    # Chat repositories
    "ChatSessionRepository", 
    "ChatMessageRepository",
    "ConversationContextRepository",
    
    # Channel repositories
    "ChannelRepository",
    "ChannelConversationRepository", 
    "ChannelMessageRepository",
    
    # Telephony repositories
    "PhoneNumberRepository",
    "CallRepository", 
    "VoiceSessionRepository",
    "CallEventRepository",
    "TelephonyRepositoryFactory",
    
    # Telephony dependency injection functions
    "get_phone_number_repository",
    "get_call_repository", 
    "get_voice_session_repository",
    "get_call_event_repository"
]