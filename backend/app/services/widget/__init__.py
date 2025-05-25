# backend/app/services/widget/__init__.py
"""
Widget services module for Customate.ai

This module contains all widget-related services including:
- Widget chat service for handling streaming responses
- Settings management for widget configuration
- Integration with existing chat and LLM services
"""

try:
    from .widget_chat_service import WidgetChatService
    WIDGET_CHAT_SERVICE_AVAILABLE = True
except ImportError as e:
    WIDGET_CHAT_SERVICE_AVAILABLE = False
    print(f"Warning: WidgetChatService not available: {e}")

__all__ = ['WidgetChatService'] if WIDGET_CHAT_SERVICE_AVAILABLE else []