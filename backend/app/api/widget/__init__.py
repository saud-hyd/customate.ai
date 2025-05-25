# backend/app/api/widget/__init__.py
"""
Widget API module for Customate.ai
"""

import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Create the main router
router = APIRouter()

# Import and include routes with error handling
try:
    from . import routes
    router.include_router(routes.router, tags=["widget"])
    logger.info("✅ Widget routes included successfully")
    ROUTES_LOADED = True
except Exception as e:
    logger.error(f"❌ Failed to load widget routes: {e}")
    ROUTES_LOADED = False
    
    # Add a fallback route
    @router.get("/error")
    async def widget_error():
        return {
            "error": "Widget routes failed to load",
            "details": str(e),
            "status": "error"
        }

# Import widget.js with error handling
try:
    from . import widget_js
    router.include_router(widget_js.router, tags=["widget-static"])
    logger.info("✅ Widget.js routes included successfully")
except Exception as e:
    logger.error(f"❌ Failed to load widget.js routes: {e}")

logger.info(f"🔧 Widget API initialized - Routes loaded: {ROUTES_LOADED}")

# Export the router
__all__ = ["router"]