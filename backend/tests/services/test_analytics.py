# backend/tests/services/test_analytics.py
import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from app.services.analytics.usage_tracker import UsageTracker
from app.services.analytics.reporting_service import ReportingService
from app.repositories.analytics_repository import (
    ApiUsageLogRepository, ChatMetricsRepository,
    KnowledgeMetricsRepository, SubscriptionUsageRepository,
    DailyStatsRepository
)
from app.domain.analytics.entities import (
    ApiUsageLog, ChatMetrics, KnowledgeMetrics,
    SubscriptionUsage, DailyStats
)


@pytest.fixture
def mock_db():
    """Mock database session."""
    return MagicMock(spec=Session)


@pytest.fixture
def usage_tracker():
    """Create usage tracker with mocked repositories."""
    tracker = UsageTracker()
    tracker.api_log_repo = MagicMock(spec=ApiUsageLogRepository)
    tracker.chat_metrics_repo = MagicMock(spec=ChatMetricsRepository)
    tracker.knowledge_metrics_repo = MagicMock(spec=KnowledgeMetricsRepository)
    tracker.subscription_usage_repo = MagicMock(spec=SubscriptionUsageRepository)
    tracker.daily_stats_repo = MagicMock(spec=DailyStatsRepository)
    return tracker


@pytest.fixture
def reporting_service():
    """Create reporting service with mocked repositories."""
    service = ReportingService()
    service.api_log_repo = MagicMock(spec=ApiUsageLogRepository)
    service.chat_metrics_repo = MagicMock(spec=ChatMetricsRepository)
    service.knowledge_metrics_repo = MagicMock(spec=KnowledgeMetricsRepository)
    service.subscription_usage_repo = MagicMock(spec=SubscriptionUsageRepository)
    service.daily_stats_repo = MagicMock(spec=DailyStatsRepository)
    service.usage_tracker = MagicMock(spec=UsageTracker)
    return service


def test_track_api_request(usage_tracker, mock_db):
    """Test tracking API requests."""
    # Arrange
    client_id = str(uuid.uuid4())
    endpoint = "/api/test"
    method = "GET"
    status_code = 200
    response_time_ms = 150
    
    # Act
    usage_tracker.track_api_request(
        db=mock_db,
        client_id=client_id,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        response_time_ms=response_time_ms
    )
    
    # Assert
    usage_tracker.api_log_repo.create.assert_called_once()
    create_args = usage_tracker.api_log_repo.create.call_args[1]
    assert create_args["obj_in"]["client_id"] == client_id
    assert create_args["obj_in"]["endpoint"] == endpoint
    assert create_args["obj_in"]["method"] == method
    assert create_args["obj_in"]["status_code"] == status_code
    assert create_args["obj_in"]["response_time_ms"] == response_time_ms


def test_track_chat_interaction(usage_tracker, mock_db):
    """Test tracking chat interactions."""
    # Arrange
    client_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    response_time_ms = 250
    used_knowledge = True
    
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Mock the repository behavior
    usage_tracker.chat_metrics_repo.get_by_date.return_value = None
    
    # Act
    usage_tracker.track_chat_interaction(
        db=mock_db,
        client_id=client_id,
        session_id=session_id,
        response_time_ms=response_time_ms,
        used_knowledge=used_knowledge
    )
    
    # Assert
    usage_tracker.chat_metrics_repo.create.assert_called_once()
    create_args = usage_tracker.chat_metrics_repo.create.call_args[1]
    assert create_args["obj_in"]["client_id"] == client_id
    assert create_args["obj_in"]["session_id"] == session_id
    assert create_args["obj_in"]["average_response_time_ms"] == response_time_ms
    assert create_args["obj_in"]["knowledge_usage_count"] == 1
    assert create_args["obj_in"]["date"] == today


def test_track_knowledge_search(usage_tracker, mock_db):
    """Test tracking knowledge base searches."""
    # Arrange
    client_id = str(uuid.uuid4())
    collection_id = str(uuid.uuid4())
    query = "test query"
    results_count = 5
    relevance_scores = [0.9, 0.8, 0.7, 0.6, 0.5]
    
    # Mock the repository behavior
    usage_tracker.knowledge_metrics_repo.get_by_date.return_value = None
    
    # Act
    usage_tracker.track_knowledge_search(
        db=mock_db,
        client_id=client_id,
        query=query,
        collection_id=collection_id,
        results_count=results_count,
        relevance_scores=relevance_scores
    )
    
    # Assert
    usage_tracker.knowledge_metrics_repo.create.assert_called_once()
    create_args = usage_tracker.knowledge_metrics_repo.create.call_args[1]
    assert create_args["obj_in"]["client_id"] == client_id
    assert create_args["obj_in"]["collection_id"] == collection_id
    assert create_args["obj_in"]["search_count"] == 1
    # Calculate avg relevance for assertion
    avg_relevance = sum(relevance_scores) / len(relevance_scores)
    assert create_args["obj_in"]["average_relevance_score"] == avg_relevance


def test_check_subscription_limits(usage_tracker, mock_db):
    """Test checking subscription limits."""
    # Arrange
    client_id = str(uuid.uuid4())
    
    # Mock usage with limits exceeded
    mock_usage = MagicMock(spec=SubscriptionUsage)
    mock_usage.messages_used = 1500
    mock_usage.messages_limit = 1000
    mock_usage.active_users = 5
    mock_usage.active_users_limit = 10
    mock_usage.storage_used_bytes = 500 * 1024 * 1024  # 500 MB
    mock_usage.storage_limit_bytes = 1024 * 1024 * 1024  # 1 GB
    
    usage_tracker.subscription_usage_repo.get_current_month.return_value = mock_usage
    
    # Act
    result = usage_tracker.check_subscription_limits(mock_db, client_id)
    
    # Assert
    assert result["within_limits"] is False
    assert result["limits"]["messages"]["exceeded"] is True
    assert result["limits"]["users"]["exceeded"] is False
    assert result["limits"]["storage"]["exceeded"] is False


def test_get_dashboard_overview(reporting_service, mock_db):
    """Test generating dashboard overview report."""
    # Arrange
    client_id = str(uuid.uuid4())
    
    # Mock daily stats
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    mock_today_stats = MagicMock(spec=DailyStats)
    mock_today_stats.total_sessions = 10
    mock_today_stats.total_messages = 50
    mock_today_stats.total_searches = 20
    mock_today_stats.total_users = 5
    mock_today_stats.average_response_time_ms = 120.5
    mock_today_stats.knowledge_usage_ratio = 0.7
    
    mock_yesterday_stats = MagicMock(spec=DailyStats)
    mock_yesterday_stats.total_sessions = 8
    mock_yesterday_stats.total_messages = 40
    mock_yesterday_stats.total_searches = 15
    mock_yesterday_stats.total_users = 4
    
    # Mock monthly stats as a list of daily stats
    mock_monthly_stats = [mock_today_stats, mock_yesterday_stats]
    
    reporting_service.daily_stats_repo.get_by_date.side_effect = lambda db, client, date: \
        mock_today_stats if date == today else mock_yesterday_stats if date == yesterday else None
    
    reporting_service.daily_stats_repo.get_date_range.return_value = mock_monthly_stats
    
    # Mock subscription status
    reporting_service.usage_tracker.check_subscription_limits.return_value = {
        "within_limits": True,
        "limits": {
            "messages": {"used": 500, "limit": 1000, "exceeded": False, "percentage": 50},
            "users": {"active": 5, "limit": 10, "exceeded": False, "percentage": 50},
            "storage": {"used_bytes": 500000000, "limit_bytes": 1000000000, "exceeded": False, "percentage": 50}
        }
    }
    
    # Act
    result = reporting_service.get_dashboard_overview(mock_db, client_id)
    
    # Assert
    assert "today" in result
    assert "changes" in result
    assert "monthly" in result
    assert "subscription" in result
    
    assert result["today"]["sessions"] == 10
    assert result["today"]["messages"] == 50
    assert result["today"]["searches"] == 20
    
    # Check percentage change calculations (today vs yesterday)
    assert result["changes"]["sessions"] == pytest.approx(25.0)  # (10-8)/8*100
    assert result["changes"]["messages"] == pytest.approx(25.0)  # (50-40)/40*100


def test_get_chat_performance_report(reporting_service, mock_db):
    """Test generating chat performance report."""
    # Arrange
    client_id = str(uuid.uuid4())
    days = 7
    
    # Create mock daily stats for 7 days
    mock_stats = []
    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        stat = MagicMock(spec=DailyStats)
        stat.date = date
        stat.total_messages = 50 - i * 5  # Decreasing message count
        stat.total_sessions = 10 - i  # Decreasing session count
        stat.knowledge_usage_ratio = 0.6 + i * 0.05  # Increasing knowledge usage
        stat.average_response_time_ms = 100 + i * 10  # Increasing response time
        mock_stats.append(stat)
    
    reporting_service.daily_stats_repo.get_date_range.return_value = mock_stats
    
    # Act
    result = reporting_service.get_chat_performance_report(mock_db, client_id, days)
    
    # Assert
    assert "summary" in result
    assert "time_series" in result
    assert "time_period" in result
    
    assert len(result["time_series"]) == days
    assert result["summary"]["total_messages"] > 0
    assert result["summary"]["total_sessions"] > 0
    assert "avg_response_time_ms" in result["summary"]
    assert result["time_period"]["days"] == days


def test_update_subscription_usage(usage_tracker, mock_db):
    """Test updating subscription usage."""
    # Arrange
    client_id = str(uuid.uuid4())
    
    # Mock active subscription
    from app.domain.client.entities import Subscription
    mock_subscription = MagicMock(spec=Subscription)
    mock_subscription.message_limit = 1000
    mock_subscription.user_limit = 10
    
    # Mock repository methods
    from app.repositories.client_repository import SubscriptionRepository
    with patch('app.repositories.client_repository.SubscriptionRepository') as mock_sub_repo_class:
        mock_sub_repo = MagicMock(spec=SubscriptionRepository)
        mock_sub_repo.get_active_subscription.return_value = mock_subscription
        mock_sub_repo_class.return_value = mock_sub_repo
        
        # Mock current usage
        mock_usage = MagicMock(spec=SubscriptionUsage)
        usage_tracker.subscription_usage_repo.get_current_month.return_value = mock_usage
        
        # Act
        usage_tracker.update_subscription_usage(mock_db, client_id)
        
        # Assert
        # Verify that _update_active_users was called
        mock_sub_repo.get_active_subscription.assert_called_once_with(mock_db, client_id)