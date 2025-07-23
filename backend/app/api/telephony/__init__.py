# backend/app/api/telephony/__init__.py
"""
Telephony API package for Customate.ai voice agent feature.

This package provides REST API endpoints for:
- Phone number provisioning and management
- Call handling and processing
- Twilio webhook integration
- Call analytics and reporting
- Voice agent configuration
"""

from app.api.telephony.routes import router as telephony_router
from app.api.telephony.webhook_routes import router as webhook_router
from app.api.telephony.call_routes import router as call_router

__all__ = [
    "telephony_router",
    "webhook_router", 
    "call_router"
]