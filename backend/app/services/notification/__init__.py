# backend/app/services/notification/__init__.py
# This file makes the notification directory a Python module

from app.services.notification.notification_service import NotificationService

__all__ = ["NotificationService"]