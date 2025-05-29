# backend/app/api/widget/__init__.py
"""
Widget API module for Customate.ai - Fixed Version
"""

import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Create the main router
router = APIRouter()

# Import and include widget settings/API routes
try:
    from . import routes
    router.include_router(routes.router, tags=["widget"])
    logger.info("✅ Widget API routes loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load widget API routes: {e}")
    # Create a fallback route to prevent complete failure
    @router.get("/settings")
    async def fallback_settings():
        return {
            "primary_color": "#ea580c",
            "chatbot_name": "AI Assistant",
            "greeting_message": "Hello! How can I help you today?",
            "widget_position": "bottom-right",
            "show_typing_indicator": True,
            "enable_suggestions": True,
            "llm_provider": "deepseek",
            "llm_model": "deepseek-chat"
        }

# Import and include widget app serving routes
try:
    from . import widget_app_routes
    router.include_router(widget_app_routes.router, tags=["widget-app"])
    logger.info("✅ Widget app routes loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load widget app routes: {e}")
    # Create a fallback route
    @router.get("/app/")
    async def fallback_widget_app():
        return {"error": "Widget app not available", "details": str(e)}

# Health check route
@router.get("/health")
async def widget_health():
    """Widget-specific health check"""
    return {
        "status": "healthy",
        "service": "widget",
        "routes_loaded": {
            "api_routes": "routes" in globals(),
            "app_routes": "widget_app_routes" in globals()
        }
    }

__all__ = ["router"]