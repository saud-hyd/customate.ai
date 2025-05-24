# backend/app/api/widget/__init__.py
"""
Widget API module for Customate.ai

This module provides all the necessary endpoints for the embeddable chat widget,
including streaming responses, settings management, and CORS handling for
cross-origin embedding.

Features:
- Real-time streaming chat responses
- Widget settings and configuration
- Cross-origin resource sharing (CORS) support
- Client authentication via API keys
- Integration with LLM services and knowledge base
"""

import logging
from fastapi import APIRouter

# Configure logging
logger = logging.getLogger(__name__)

# Import all widget components
try:
    from . import routes
    from . import schemas
    from . import widget_js
    
    WIDGET_COMPONENTS_LOADED = True
    logger.info("✅ Widget API components loaded successfully")
    
except ImportError as e:
    WIDGET_COMPONENTS_LOADED = False
    logger.error(f"❌ Failed to load widget components: {e}")

# Create main widget router
widget_router = APIRouter()

if WIDGET_COMPONENTS_LOADED:
    # Include all widget routes
    widget_router.include_router(routes.router, tags=["widget-api"])
    widget_router.include_router(widget_js.router, tags=["widget-static"])
    
    logger.info(f"✅ Widget router configured with {len(widget_router.routes)} routes")
    
    # Log available routes for debugging
    for route in widget_router.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ', '.join(route.methods) if route.methods else 'N/A'
            logger.debug(f"   {methods}: {route.path}")

else:
    # Create minimal fallback router
    @widget_router.get("/error")
    async def widget_error():
        return {
            "error": "Widget components not loaded",
            "status": "error",
            "message": "Widget functionality is currently unavailable"
        }
    
    logger.warning("⚠️ Using fallback widget router due to component loading errors")

# Export the router for use in main API
router = widget_router

# Module metadata
__version__ = "2.0.0"
__author__ = "Customate.ai Team"
__email__ = "support@customate.ai"

# Public API
__all__ = [
    "router",
    "widget_router", 
    "WIDGET_COMPONENTS_LOADED"
]

# Widget configuration constants
WIDGET_CONFIG = {
    "version": __version__,
    "supported_features": [
        "streaming_responses",
        "markdown_formatting", 
        "real_time_settings",
        "cross_origin_embedding",
        "multi_llm_support",
        "knowledge_integration"
    ],
    "cors_origins": ["*"],  # Allow all origins for widget embedding
    "default_settings": {
        "primary_color": "#ea580c",
        "chatbot_name": "AI Assistant", 
        "greeting_message": "Hello! How can I help you today?",
        "widget_position": "bottom-right",
        "show_typing_indicator": True,
        "enable_suggestions": True
    }
}

logger.info(f"🔧 Widget API v{__version__} initialized")
logger.info(f"   Features: {', '.join(WIDGET_CONFIG['supported_features'])}")
logger.info(f"   Components loaded: {WIDGET_COMPONENTS_LOADED}")

if not WIDGET_COMPONENTS_LOADED:
    logger.warning("⚠️  Widget functionality will be limited due to missing components")
    logger.warning("   Please check widget route imports and dependencies")