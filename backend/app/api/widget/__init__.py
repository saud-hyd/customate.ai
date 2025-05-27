# backend/app/api/widget/__init__.py
"""
Widget API module for Customate.ai
"""

import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Create the main router
router = APIRouter()

# Import and include routes
try:
    from . import routes
    router.include_router(routes.router, tags=["widget"])
    logger.info("✅ Widget routes loaded")
except Exception as e:
    logger.error(f"❌ Failed to load widget routes: {e}")

# Import widget.js routes
try:
    from . import widget_js
    router.include_router(widget_js.router, tags=["widget-static"])
    logger.info("✅ Widget.js routes loaded")
except Exception as e:
    logger.error(f"❌ Failed to load widget.js routes: {e}")

__all__ = ["router"]