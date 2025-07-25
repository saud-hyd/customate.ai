# backend/tests/api/test_analytics_api.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import json
import uuid

from app.core.database.session import get_db_session
from app.domain.client.entities import Client
from app.services.analytics.reporting_service import ReportingService
from app.services.analytics.usage_tracker import UsageTracker
from main import app

# Mock dependencies
client = TestClient(app)

@pytest.fixture
def mock_db_session():
    """Mock database session."""
    with patch("app.core.database.dependencies.get_db") as mock:
        yield mock

@pytest.fixture
def mock_auth():
    """Mock authentication to return a test client."""
    with patch("app.api.auth.dependencies.get_current_client") as mock:
        # Create a mock client
        client = MagicMock(spec=Client)
        client.client_id = str(uuid.uuid4())
        client.name = "Test Client"
        mock.return_value = client
        yield mock, client.client_id
        
@pytest.fixture
def mock_reporting_service():
    """Mock reporting service."""
    with patch("app.services.analytics.reporting_service.ReportingService") as mock:
        service = MagicMock(spec=ReportingService)
        mock.return_value = service
        yield service

@pytest.fixture
def mock_usage_tracker():
    """Mock usage tracker."""
    with patch("app.services.analytics.usage_tracker.UsageTracker") as mock:
        tracker = MagicMock(spec=UsageTracker)
        mock.return_value = tracker
        yield tracker


def test_get_dashboard_overview(mock_db_session, mock_auth, mock_reporting_service):
    """Test dashboard overview endpoint."""
    # Arrange
    _, client_id = mock_auth
    
    mock_response = {
        "today": {
            "sessions": 10,
            "messages": 50,
            "searches": 20,
            "users": 5,
            "avg_response_time_ms": 120.5,
            "knowledge_usage_ratio": 0.7
        },
        "changes": {
            "sessions": 25.0,
            "messages": 25.0,
            "searches": 33.33,
            "users": 25.0
        },
        "monthly": {
            "total_sessions": 300,
            "total_messages": 1500,
            "total_searches": 600,
            "avg_sessions_per_day": 10.0,
            "avg_messages_per_day": 50.0,
            "avg_searches_per_day": 20.0,
            "avg_response_time_ms": 130.5,
            "avg_knowledge_usage_ratio": 0.65
        },
        "subscription": {
            "within_limits": True,
            "limits": {
                "messages": {"used": 500, "limit": 1000, "exceeded": False, "percentage": 50},
                "users": {"active": 5, "limit": 10, "exceeded": False, "percentage": 50},
                "storage": {"used_bytes": 500000000, "limit_bytes": 1000000000, "exceeded": False, "percentage": 50}
            }
        },
        "time_period": {
            "start_date": "2025-02-09",
            "end_date": "2025-03-11",
            "days": 30
        }
    }
    
    mock_reporting_service.get_dashboard_overview.return_value = mock_response
    
    # Act
    response = client.get("/api/analytics/dashboard")
    
    # Assert
    assert response.status_code == 200
    assert response.json() == mock_response
    mock_reporting_service.get_dashboard_overview.assert_called_once()


def test_get_chat_performance(mock_db_session, mock_auth, mock_reporting_service):
    """Test chat performance endpoint."""
    # Arrange
    _, client_id = mock_auth
    
    mock_response = {
        "summary": {
            "total_messages": 1500,
            "total_sessions": 300,
            "messages_per_session": 5.0,
            "knowledge_usage_percentage": 65.0,
            "avg_response_time_ms": 130.5,
            "min_response_time_ms": 95.2,
            "max_response_time_ms": 180.7
        },
        "time_series": [
            {
                "date": "2025-03-05",
                "total_messages": 45,
                "total_sessions": 9,
                "knowledge_usage_ratio": 0.7,
                "average_response_time_ms": 125.3
            },
            {
                "date": "2025-03-06",
                "total_messages": 50,
                "total_sessions": 10,
                "knowledge_usage_ratio": 0.65,
                "average_response_time_ms": 130.5
            }
        ],
        "time_period": {
            "start_date": "2025-02-09",
            "end_date": "2025-03-11",
            "days": 30
        }
    }
    
    mock_reporting_service.get_chat_performance_report.return_value = mock_response
    
    # Act
    response = client.get("/api/analytics/chat?days=30")
    
    # Assert
    assert response.status_code == 200
    assert response.json() == mock_response
    mock_reporting_service.get_chat_performance_report.assert_called_once()


def test_get_knowledge_usage(mock_db_session, mock_auth, mock_reporting_service):
    """Test knowledge usage endpoint."""
    # Arrange
    _, client_id = mock_auth
    
    mock_response = {
        "summary": {
            "total_searches": 600,
            "avg_relevance_score": 0.78,
            "current_items": 150,
            "current_documents": 25,
            "search_per_day": 20.0
        },
        "time_series": [
            {
                "date": "2025-03-05",
                "search_count": 18,
                "average_relevance_score": 0.76,
                "items_count": 145,
                "document_count": 24
            },
            {
                "date": "2025-03-06",
                "search_count": 22,
                "average_relevance_score": 0.79,
                "items_count": 150,
                "document_count": 25
            }
        ],
        "collection_distribution": [
            {
                "id": "12345",
                "name": "FAQs",
                "search_count": 300
            },
            {
                "id": "67890",
                "name": "Product Info",
                "search_count": 200
            }
        ],
        "time_period": {
            "start_date": "2025-02-09",
            "end_date": "2025-03-11",
            "days": 30
        }
    }
    
    mock_reporting_service.get_knowledge_usage_report.return_value = mock_response
    
    # Act
    response = client.get("/api/analytics/knowledge?days=30")
    
    # Assert
    assert response.status_code == 200
    assert response.json() == mock_response
    mock_reporting_service.get_knowledge_usage_report.assert_called_once()


def test_get_subscription_usage(mock_db_session, mock_auth, mock_reporting_service):
    """Test subscription usage endpoint."""
    # Arrange
    _, client_id = mock_auth
    
    mock_response = {
        "current": {
            "messages": {
                "used": 500,
                "limit": 1000,
                "percentage": 50.0
            },
            "users": {
                "used": 5,
                "limit": 10,
                "percentage": 50.0
            },
            "storage": {
                "used_bytes": 500000000,
                "limit_bytes": 1000000000,
                "percentage": 50.0,
                "used_mb": 476.83,
                "limit_mb": 953.67
            }
        },
        "historical": [
            {
                "month": "2025-03",
                "messages_used": 500,
                "messages_limit": 1000,
                "active_users": 5,
                "active_users_limit": 10,
                "storage_used_bytes": 500000000,
                "storage_limit_bytes": 1000000000
            },
            {
                "month": "2025-02",
                "messages_used": 450,
                "messages_limit": 1000,
                "active_users": 4,
                "active_users_limit": 10,
                "storage_used_bytes": 450000000,
                "storage_limit_bytes": 1000000000
            }
        ],
        "subscription": {
            "id": "12345",
            "plan_type": "professional",
            "status": "active",
            "message_limit": 1000,
            "user_limit": 10,
            "starts_at": "2025-01-01T00:00:00",
            "expires_at": "2025-12-31T23:59:59"
        },
        "time_period": {
            "months": 6
        }
    }
    
    mock_reporting_service.get_subscription_usage_report.return_value = mock_response
    
    # Act
    response = client.get("/api/analytics/subscription?months=6")
    
    # Assert
    assert response.status_code == 200
    assert response.json() == mock_response
    mock_reporting_service.get_subscription_usage_report.assert_called_once()


def test_get_api_usage(mock_db_session, mock_auth, mock_reporting_service):
    """Test API usage endpoint."""
    # Arrange
    _, client_id = mock_auth
    
    mock_response = {
        "endpoint_stats": {
            "endpoints": [
                {
                    "endpoint": "/api/chatbot/message",
                    "count": 500,
                    "avg_response_time_ms": 130.5
                },
                {
                    "endpoint": "/api/knowledge/search",
                    "count": 200,
                    "avg_response_time_ms": 95.3
                }
            ],
            "status_codes": [
                {
                    "status_code": 200,
                    "count": 650
                },
                {
                    "status_code": 404,
                    "count": 25
                }
            ]
        },
        "daily_usage": [
            {
                "date": "2025-03-05",
                "request_count": 230,
                "avg_response_time_ms": 125.7
            },
            {
                "date": "2025-03-06",
                "request_count": 245,
                "avg_response_time_ms": 132.3
            }
        ],
        "user_agents": [
            {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
                "count": 350
            },
            {
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
                "count": 250
            }
        ],
        "methods": [
            {
                "method": "POST",
                "count": 450
            },
            {
                "method": "GET",
                "count": 250
            }
        ],
        "time_period": {
            "start_date": "2025-02-09",
            "end_date": "2025-03-11",
            "days": 30
        }
    }
    
    mock_reporting_service.get_api_usage_report.return_value = mock_response
    
    # Act
    response = client.get("/api/analytics/api-usage?days=30")
    
    # Assert
    assert response.status_code == 200
    assert response.json() == mock_response
    mock_reporting_service.get_api_usage_report.assert_called_once()


def test_check_subscription_limits(mock_db_session, mock_auth, mock_usage_tracker):
    """Test subscription limits endpoint."""
    # Arrange
    _, client_id = mock_auth
    
    mock_response = {
        "within_limits": True,
        "limits": {
            "messages": {
                "used": 500,
                "limit": 1000,
                "exceeded": False,
                "percentage": 50.0
            },
            "users": {
                "active": 5,
                "limit": 10,
                "exceeded": False,
                "percentage": 50.0
            },
            "storage": {
                "used_bytes": 500000000,
                "limit_bytes": 1000000000,
                "exceeded": False,
                "percentage": 50.0
            }
        }
    }
    
    mock_usage_tracker.check_subscription_limits.return_value = mock_response
    
    # Act
    response = client.get("/api/analytics/subscription/limits")
    
    # Assert
    assert response.status_code == 200
    assert response.json() == mock_response
    mock_usage_tracker.check_subscription_limits.assert_called_once()