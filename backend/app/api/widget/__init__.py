# backend/app/api/widget/__init__.py
from fastapi import APIRouter

# Create router with the correct prefix
router = APIRouter()

# Import all widget-related routes
from app.api.widget.routes import router as routes_router
from app.api.widget.widget_js import router as widget_js_router

# Include the sub-routers
router.include_router(routes_router)
router.include_router(widget_js_router)