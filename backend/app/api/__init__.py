# backend/app/api/__init__.py
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware

# Import all route modules
from app.api.auth import routes as auth_routes
from app.api.client import routes as client_routes
from app.api.knowledge import routes as knowledge_routes
from app.api.analytics import routes as analytics_routes

# Import widget routes
try:
    from app.api.widget import routes as widget_routes
    from app.api.widget.widget_js import router as widget_js_router
    WIDGET_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Widget routes not available: {e}")
    WIDGET_AVAILABLE = False

# Import integration routes if available
try:
    from app.api.integrations import routes as integration_routes
    INTEGRATIONS_AVAILABLE = True
except ImportError:
    INTEGRATIONS_AVAILABLE = False
    
try:
    from app.api.demo import routes as demo_routes
    DEMO_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Demo routes not available: {e}")
    DEMO_AVAILABLE = False    

def create_api_router() -> APIRouter:
    """
    Create and configure the main API router with all endpoints.
    
    Returns:
        Configured APIRouter instance
    """
    
    # Create main API router
    api_router = APIRouter()
    
    # Authentication routes
    api_router.include_router(
        auth_routes.router,
        prefix="/auth",
        tags=["authentication"]
    )
    
    # Client management routes
    api_router.include_router(
        client_routes.router,
        prefix="/client",
        tags=["client"]
    )
    
    # Knowledge base routes
    api_router.include_router(
        knowledge_routes.router,
        prefix="/knowledge",
        tags=["knowledge"]
    )
    
    # Analytics routes
    api_router.include_router(
        analytics_routes.router,
        prefix="/analytics",
        tags=["analytics"]
    )
    
    # Demo routes (ADD THIS SECTION)
    if DEMO_AVAILABLE:
        api_router.include_router(
            demo_routes.router,
            prefix="/demo",
            tags=["demo"]
        )
        print("✅ Demo routes registered")
    else:
        print("⚠️ Demo routes not available")
    
    # Widget routes (enhanced with streaming support)
    if WIDGET_AVAILABLE:
        print("✅ Registering widget routes...")
        
        # Main widget API routes
        api_router.include_router(
            widget_routes.router,
            prefix="/widget",
            tags=["widget"]
        )
        
        # Widget JavaScript serving routes
        api_router.include_router(
            widget_js_router,
            prefix="/widget",
            tags=["widget-static"]
        )
        
        print("✅ Widget routes registered successfully")
    else:
        print("⚠️ Widget routes not available - widget functionality will be limited")
    
    # Integration routes (if available)
    if INTEGRATIONS_AVAILABLE:
        api_router.include_router(
            integration_routes.router,
            prefix="/integrations",
            tags=["integrations"]
        )
        print("✅ Integration routes registered")
    
    return api_router

def setup_widget_cors(app):
    """
    Setup CORS specifically for widget endpoints to allow embedding.
    
    Args:
        app: FastAPI application instance
    """
    
    # Allow all origins for widget endpoints (required for embedding)
    widget_cors_origins = [
        "*"  # Allow all origins for widget embedding
    ]
    
    # Add CORS middleware specifically for widget endpoints
    app.add_middleware(
        CORSMiddleware,
        allow_origins=widget_cors_origins,
        allow_credentials=False,  # Don't allow credentials for widget endpoints
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "X-API-Key",
            "Authorization",
            "Accept",
            "Origin",
            "User-Agent",
            "X-Requested-With"
        ],
        expose_headers=["Content-Type"],
    )
    
    print("✅ Widget CORS middleware configured")

# Create the main API router instance
api_router = create_api_router()

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "services": {
            "widget": WIDGET_AVAILABLE,
            "integrations": INTEGRATIONS_AVAILABLE
        }
    }

# Widget-specific health check
if WIDGET_AVAILABLE:
    @api_router.get("/widget/health")
    async def widget_health_check():
        """Specific health check for widget services."""
        return {
            "status": "healthy",
            "service": "widget",
            "version": "2.0.0",
            "features": {
                "streaming": True,
                "markdown": True,
                "settings_sync": True
            }
        }

print(f"✅ API Router configured with {len(api_router.routes)} total routes")
print(f"   - Widget routes: {'Available' if WIDGET_AVAILABLE else 'Not Available'}")
print(f"   - Integration routes: {'Available' if INTEGRATIONS_AVAILABLE else 'Not Available'}")