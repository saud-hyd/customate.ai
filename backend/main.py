# Path: main.py

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import time
import asyncio
from contextlib import asynccontextmanager
import os

from app.core.config.settings import settings
from app.core.database.session import engine, Base
from app.core import logger
from app.core.middleware.client_context import ClientContextMiddleware
from app.core.middleware.analytics_middleware import AnalyticsMiddleware
from app.core.middleware.subscription_limit_middleware import SubscriptionLimitMiddleware
from app.workers.crawler_worker import run_crawler_worker
from app.api.demo import routes as demo_routes

# Import routes
from app.api.auth import routes as auth_routes
from app.api.client import routes as client_routes
from app.api.knowledge import routes as knowledge_routes
from app.api.knowledge import document_routes
from app.api.chatbot import session_routes
from app.api.chatbot import enhanced_routes as chatbot_routes
from app.api.knowledge import enhanced_routes as enhanced_knowledge_routes
from app.api.analytics import routes as analytics_routes
from app.api.knowledge import collection_routes
from app.api.integration import routes as integration_routes  
from app.api.client import subscription_routes
from app.api.channel.routes import router as channel_router
from app.api.channel.webhook_routes import router as webhook_router
from app.api.channel.gmail_routes import router as gmail_router
from app.api.channel.gmail_webhook_routes import router as gmail_webhook_router
from app.api.notifications import router as notifications_router
from app.api.admin.routes import router as admin_router
from app.api.demo import routes as demo_routes
from app.api.knowledge import (
    knowledge_router, document_router, collection_router, 
    crawl_router, enhanced_router
)

# CRITICAL: Import widget router properly
try:
    from app.api.widget import router as widget_router
    WIDGET_ROUTES_AVAILABLE = True
    logger.info("OK Widget router imported successfully")
except ImportError as e:
    WIDGET_ROUTES_AVAILABLE = False
    logger.error(f"ERROR Failed to import widget router: {e}")


# Import widget services for initialization
try:
    from app.services.widget.widget_chat_service import WidgetChatService
    WIDGET_SERVICE_AVAILABLE = True
    logger.info("OK Widget chat service imported successfully")
except ImportError as e:
    WIDGET_SERVICE_AVAILABLE = False
    logger.warning(f"WARNING Widget chat service not available: {e}")

import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

# Create database tables
Base.metadata.create_all(bind=engine)

# Environment detection
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development").lower() == "production"
BACKEND_URL = "https://customate-ai-1.onrender.com" if IS_PRODUCTION else "http://localhost:8000"

# Define allowed origins based on environment
def get_allowed_origins():
    # Base origins that are always allowed
    origins = [
        # Local development URLs
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002", 
        "http://localhost:5173",
        "http://localhost", 
        "http://127.0.0.1",
        
        # Render backend URL for same-origin requests
        "https://customate-ai-1.onrender.com",
    ]
    
    # Production-only origins
    if IS_PRODUCTION:
        origins.extend([
            # Vercel deployment URLs
            "https://customate.vercel.app",
            "https://customate-ai.vercel.app",
            "https://customate-ai-git-develop-saud-hyds-projects.vercel.app",
            "https://customate-lyw0rsjn0-saud-hyds-projects.vercel.app",
            "https://customate-16bvgs9s9-saud-hyds-projects.vercel.app",
            "https://customate-g3wug6ubm-saud-hyds-projects.vercel.app",
            
            # Custom domains
            "https://customate.ai",
            "https://app.customate.ai",
            "http://customate.ai",
            "http://app.customate.ai",
        ])
    
    # For widget embedding, we need to allow all origins
    origins.append("*")
    
    return origins

# Define lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run before the application starts
    logger.info(f"Starting application in {'PRODUCTION' if IS_PRODUCTION else 'DEVELOPMENT'} mode")
    logger.info(f"Antenna Backend URL: {BACKEND_URL}")
    
    # Initialize widget services
    if WIDGET_SERVICE_AVAILABLE:
        logger.info("Starting Widget chat service available for streaming responses")
    else:
        logger.warning("WARNING Widget chat service not available - using basic widget functionality")
    
    
    crawler_task = asyncio.create_task(run_crawler_worker())
    logger.info("Spider Started crawler worker in background")
    yield
    # Shutdown: Run when the application is shutting down
    logger.info("STOP Shutting down crawler worker")
    crawler_task.cancel()
    try:
        await crawler_task
    except asyncio.CancelledError:
        pass

# Initialize FastAPI app with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Multi-tenant chatbot platform API with React widget, knowledge integration, streaming responses, and real-time widget embedding",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Configure CORS with enhanced widget support
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add middleware (order matters)
app.add_middleware(ClientContextMiddleware) 
app.add_middleware(SubscriptionLimitMiddleware)
app.add_middleware(AnalyticsMiddleware)

# Include routes with proper error handling
logger.info("Books Registering API routes...")

app.include_router(auth_routes.router, prefix="/api")
app.include_router(client_routes.router, prefix="/api")
app.include_router(knowledge_routes.router, prefix="/api/knowledge")
app.include_router(document_routes.router, prefix="/api/knowledge/knowledge/documents")
app.include_router(session_routes.router, prefix="/api")
app.include_router(chatbot_routes.router, prefix="/api")
app.include_router(enhanced_knowledge_routes.router, prefix="/api")
app.include_router(analytics_routes.router, prefix="/api")
app.include_router(collection_routes.router, prefix="/api/knowledge/knowledge")
app.include_router(integration_routes.router, prefix="/api")

# CRITICAL: Widget router registration with error handling
if WIDGET_ROUTES_AVAILABLE:
    try:
        app.include_router(widget_router, prefix="/api/widget", tags=["widget"])
        logger.info("OK Widget routes registered successfully at /api/widget/*")
    except Exception as e:
        logger.error(f"ERROR Failed to register widget routes: {e}")
        WIDGET_ROUTES_AVAILABLE = False
else:
    logger.error("ERROR Widget routes not available - widget functionality will be limited")
    
    # Create fallback widget health endpoint
    @app.get("/api/widget/health")
    async def fallback_widget_health():
        return {
            "status": "error",
            "message": "Widget routes not available",
            "error": "Widget router import failed"
        }

app.include_router(subscription_routes.router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(admin_router)
app.include_router(knowledge_router, prefix="/api/knowledge")
app.include_router(document_router, prefix="/api/knowledge/documents")
app.include_router(collection_router, prefix="/api/knowledge") 
app.include_router(crawl_router, prefix="/api/knowledge")
app.include_router(enhanced_router, prefix="/api/knowledge")

# Gmail routes with error handling - Register BEFORE general channel routes to avoid conflicts
try:
    logger.info(f"DEBUG About to register Gmail router with {len(gmail_router.routes)} routes")
    app.include_router(gmail_router, prefix="/api")
    logger.info("OK Gmail routes registered successfully")
    
    # Verify routes were actually added
    gmail_routes_found = [route for route in app.routes if hasattr(route, 'path') and 'gmail' in route.path]
    logger.info(f"DEBUG Found {len(gmail_routes_found)} Gmail routes in app after registration")
    
except Exception as e:
    logger.error(f"ERROR Failed to register Gmail routes: {e}")
    import traceback
    logger.error(f"ERROR Traceback: {traceback.format_exc()}")

try:
    app.include_router(gmail_webhook_router, prefix="/api")
    logger.info("OK Gmail webhook routes registered successfully")
except Exception as e:
    logger.error(f"ERROR Failed to register Gmail webhook routes: {e}")

app.include_router(channel_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")
app.include_router(demo_routes.router, prefix="/api/demo")

logger.info("OK All routes registered successfully")

# Enhanced debugging endpoints
@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to check all loaded routes."""
    routes_info = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes_info.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": getattr(route, 'name', 'unknown')
            })
    
    return {
        "total_routes": len(routes_info),
        "all_routes": routes_info
    }

@app.get("/debug/widget-routes")
async def debug_widget_routes():
    """Debug endpoint to check widget routes specifically."""
    widget_routes = []
    for route in app.routes:
        if hasattr(route, 'path') and '/widget' in route.path:
            widget_routes.append({
                "path": route.path,
                "methods": list(route.methods) if hasattr(route, 'methods') and route.methods else [],
                "name": getattr(route, 'name', 'unknown')
            })
    
    expected_routes = [
        "/api/widget/settings",
        "/api/widget/test", 
        "/api/widget/app/",
        "/api/widget/health",
        "/api/widget/embed",
        "/api/widget/status"
    ]
    
    return {
        "widget_routes_available": WIDGET_ROUTES_AVAILABLE,
        "total_widget_routes": len(widget_routes),
        "found_widget_routes": widget_routes,
        "expected_routes": expected_routes,
        "missing_routes": [route for route in expected_routes if not any(route in wr['path'] for wr in widget_routes)]
    }


# Request logging middleware with enhanced widget request tracking
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Calculate process time
    process_time = time.time() - start_time
    
    # Enhanced logging for widget requests
    if request.url.path.startswith("/api/widget"):
        log_level = "INFO"
        if request.url.path.endswith("/stream"):
            log_level = "DEBUG"  # Streaming requests can be verbose
        
        logger.log(
            getattr(logging, log_level),
            f"Tools Widget Request: {request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Process Time: {process_time:.4f}s "
            f"- Origin: {request.headers.get('origin', 'N/A')} "
            f"- API Key: {request.headers.get('X-API-Key', 'N/A')[:4] + '...' if request.headers.get('X-API-Key') else 'None'}"
        )
    else:
        # Standard request logging
        logger.debug(
            f"Antenna Request: {request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Process Time: {process_time:.4f}s"
        )
    
    return response

# Root endpoint for health check with enhanced widget info
@app.get("/")
async def root():
    return {
        "status": "healthy", 
        "app_name": settings.APP_NAME, 
        "version": f"{settings.API_VERSION}-widget-fix",
        "environment": "production" if IS_PRODUCTION else "development",
        "backend_url": BACKEND_URL,
        "features": [
            "enhanced_search", 
            "knowledge_integration", 
            "analytics", 
            "conversation_history", 
            "external_integrations",
            "website_crawling",
            "streaming_widget_responses",
            "real_time_settings_sync",
            "multi_llm_support",
            "react_widget_app"
        ],
        "widget": {
            "enabled": WIDGET_ROUTES_AVAILABLE,
            "streaming": WIDGET_SERVICE_AVAILABLE,
            "llm_integration": WIDGET_SERVICE_AVAILABLE,
            "settings_url": f"{BACKEND_URL}/api/widget/settings",
            "app_url": f"{BACKEND_URL}/api/widget/app/",
            "health_url": f"{BACKEND_URL}/api/widget/health"
        }
    }

# Enhanced health check endpoint with detailed component status
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": int(time.time()),
        "environment": "production" if IS_PRODUCTION else "development",
        "backend_url": BACKEND_URL,
        "components": {
            "api": "up",
            "database": "up",
            "widget_routes": "up" if WIDGET_ROUTES_AVAILABLE else "down",
            "widget_service": "up" if WIDGET_SERVICE_AVAILABLE else "limited",
            "streaming": "available" if WIDGET_SERVICE_AVAILABLE else "unavailable",
            "cors": "configured"
        },
        "widget_info": {
            "routes_available": WIDGET_ROUTES_AVAILABLE,
            "service_available": WIDGET_SERVICE_AVAILABLE,
            "settings_endpoint": f"{BACKEND_URL}/api/widget/settings",
            "app_endpoint": f"{BACKEND_URL}/api/widget/app/",
            "test_endpoint": f"{BACKEND_URL}/api/widget/test",
            "embed_endpoint": f"{BACKEND_URL}/api/widget/embed"
        },
        "debug_endpoints": {
            "all_routes": f"{BACKEND_URL}/debug/routes",
            "widget_routes": f"{BACKEND_URL}/debug/widget-routes", 
            "widget_status": f"{BACKEND_URL}/debug/widget-status"
        }
    }

# CORS preflight handler for widget embedding
@app.options("/api/widget/{path:path}")
async def widget_options_handler(path: str):
    """Handle CORS preflight requests for all widget endpoints."""
    return {
        "message": "CORS preflight handled",
        "path": path,
        "methods": ["GET", "POST", "PUT", "HEAD", "OPTIONS"],
        "headers": ["Content-Type", "X-API-Key", "Authorization"]
    }



if __name__ == "__main__":
    import uvicorn
    
    # Log startup information
    logger.info("Starting Customate.ai Backend Server")
    logger.info(f"Antenna Environment: {os.environ.get('ENVIRONMENT', 'development')}")
    logger.info(f"Link Backend URL: {BACKEND_URL}")
    logger.info(f"Tools Widget Routes: {'Available' if WIDGET_ROUTES_AVAILABLE else 'NOT AVAILABLE'}")
    logger.info(f"Wave Widget Service: {'Available' if WIDGET_SERVICE_AVAILABLE else 'Limited'}")
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)