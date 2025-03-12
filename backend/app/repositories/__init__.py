# backend/app/repositories/__init__.py
from app.repositories.base_repository import BaseRepository
from app.repositories.client_repository import ClientRepository, ClientSettingsRepository, SubscriptionRepository
from app.repositories.knowledge_repository import (
    KnowledgeCollectionRepository, KnowledgeItemRepository,
    VectorEmbeddingRepository, DocumentSourceRepository
)
from app.repositories.chat_repository import (
    ChatSessionRepository, ChatMessageRepository,
    ConversationContextRepository
)
from app.repositories.vector_repository import VectorRepository
from app.repositories.analytics_repository import (
    ApiUsageLogRepository, ChatMetricsRepository,
    KnowledgeMetricsRepository, SubscriptionUsageRepository,
    DailyStatsRepository
)

__all__ = [
    "BaseRepository", 
    "ClientRepository", "ClientSettingsRepository", "SubscriptionRepository",
    "KnowledgeCollectionRepository", "KnowledgeItemRepository",
    "VectorEmbeddingRepository", "DocumentSourceRepository",
    "ChatSessionRepository", "ChatMessageRepository", "ConversationContextRepository",
    "VectorRepository",
    "ApiUsageLogRepository", "ChatMetricsRepository",
    "KnowledgeMetricsRepository", "SubscriptionUsageRepository",
    "DailyStatsRepository"
]