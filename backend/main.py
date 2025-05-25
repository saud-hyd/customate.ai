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

# Import routes
from app.api.auth import routes as auth_routes
from app.api.client import routes as client_routes
from app.api.knowledge import routes as knowledge_routes
from app.api.knowledge import document_routes
from app.api.chatbot import enhanced_routes as chatbot_routes
from app.api.chatbot import session_routes
from app.api.knowledge import enhanced_routes as enhanced_knowledge_routes
from app.api.analytics import routes as analytics_routes
from app.api.knowledge import collection_routes
from app.api.integration import routes as integration_routes  
from app.api.client import subscription_routes
from app.api.channel.routes import router as channel_router
from app.api.channel.webhook_routes import router as webhook_router
from app.api.notifications import router as notifications_router
from app.api.admin.routes import router as admin_router
from app.api.knowledge import (
    knowledge_router, document_router, collection_router, 
    crawl_router, enhanced_router
)
from app.api.widget import router as widget_router
from app.api.widget.widget_js import get_widget_js

# Import widget services for initialization (FIXED IMPORT PATH)
try:
    from app.services.widget.widget_chat_service import WidgetChatService
    WIDGET_SERVICE_AVAILABLE = True
    logger.info("✅ Widget chat service imported successfully")
except ImportError as e:
    WIDGET_SERVICE_AVAILABLE = False
    logger.warning(f"⚠️ Widget chat service not available: {e}")

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
    logger.info(f"Backend URL: {BACKEND_URL}")
    
    # Initialize widget services
    if WIDGET_SERVICE_AVAILABLE:
        logger.info("🚀 Widget chat service available for streaming responses")
        logger.info("   Features: Real-time streaming, LLM integration, settings sync")
    else:
        logger.warning("⚠️ Widget chat service not available - using basic widget functionality")
    
    # Log widget configuration
    logger.info("🔧 Widget configuration:")
    logger.info(f"   - Streaming responses: {'✅ Enabled' if WIDGET_SERVICE_AVAILABLE else '❌ Basic mode'}")
    logger.info(f"   - LLM integration: {'✅ Available' if WIDGET_SERVICE_AVAILABLE else '❌ Limited'}")
    logger.info(f"   - Settings sync: {'✅ Real-time' if WIDGET_SERVICE_AVAILABLE else '❌ Manual'}")
    logger.info(f"   - CORS origins: {len(get_allowed_origins())} configured")
    
    crawler_task = asyncio.create_task(run_crawler_worker())
    logger.info("Started crawler worker in background")
    yield
    # Shutdown: Run when the application is shutting down
    logger.info("Shutting down crawler worker")
    crawler_task.cancel()
    try:
        await crawler_task
    except asyncio.CancelledError:
        pass

# Initialize FastAPI app with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Multi-tenant chatbot platform API with knowledge integration, streaming responses, and real-time widget embedding",
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

# Include routes
app.include_router(auth_routes.router, prefix="/api")
app.include_router(client_routes.router, prefix="/api")
app.include_router(knowledge_routes.router, prefix="/api/knowledge")
app.include_router(document_routes.router, prefix="/api/knowledge/knowledge/documents")
app.include_router(chatbot_routes.router, prefix="/api")
app.include_router(session_routes.router, prefix="/api")
app.include_router(enhanced_knowledge_routes.router, prefix="/api")
app.include_router(analytics_routes.router, prefix="/api")
app.include_router(collection_routes.router, prefix="/api/knowledge/knowledge")
app.include_router(integration_routes.router, prefix="/api")
app.include_router(widget_router, prefix="/api")
app.include_router(subscription_routes.router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(admin_router)
app.include_router(knowledge_router, prefix="/api/knowledge")
app.include_router(document_router, prefix="/api/knowledge/documents")
app.include_router(collection_router, prefix="/api/knowledge") 
app.include_router(crawl_router, prefix="/api/knowledge")
app.include_router(enhanced_router, prefix="/api/knowledge")
app.include_router(channel_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")

# Direct route for widget.js to handle the exact path
@app.get("/api/widget/widget.js")
async def serve_widget_js():
    """Direct route for widget.js to ensure it's available at the expected path"""
    return await get_widget_js()

# Enhanced widget health check endpoint
@app.get("/api/widget/health")
async def widget_health_check():
    """Specific health check for widget services with detailed status"""
    return {
        "status": "healthy",
        "service": "widget",
        "version": settings.API_VERSION,
        "features": {
            "streaming_responses": WIDGET_SERVICE_AVAILABLE,
            "llm_integration": WIDGET_SERVICE_AVAILABLE,
            "settings_sync": WIDGET_SERVICE_AVAILABLE,
            "markdown_formatting": True,
            "cors_embedding": True
        },
        "endpoints": [
            "/api/widget/settings",
            "/api/widget/message",
            "/api/widget/message/stream",
            "/api/widget/widget.js"
        ],
        "backend_url": BACKEND_URL,
        "environment": "production" if IS_PRODUCTION else "development"
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
            f"Widget Request: {request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Process Time: {process_time:.4f}s "
            f"- Origin: {request.headers.get('origin', 'N/A')}"
        )
    else:
        # Standard request logging
        logger.info(
            f"Request: {request.method} {request.url.path} "
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
        "version": settings.API_VERSION,
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
            "multi_llm_support"
        ],
        "widget": {
            "enabled": True,
            "streaming": WIDGET_SERVICE_AVAILABLE,
            "llm_integration": WIDGET_SERVICE_AVAILABLE,
            "embed_url": f"{BACKEND_URL}/api/widget/widget.js"
        }
    }

# Health check endpoint with detailed component status
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": "production" if IS_PRODUCTION else "development",
        "backend_url": BACKEND_URL,
        "components": {
            "api": "up",
            "database": "up",
            "widget_service": "up" if WIDGET_SERVICE_AVAILABLE else "limited",
            "streaming": "available" if WIDGET_SERVICE_AVAILABLE else "unavailable",
            "cors": "configured"
        },
        "widget_info": {
            "javascript_url": f"{BACKEND_URL}/api/widget/widget.js",
            "streaming_endpoint": f"{BACKEND_URL}/api/widget/message/stream",
            "settings_endpoint": f"{BACKEND_URL}/api/widget/settings",
            "test_endpoint": f"{BACKEND_URL}/api/widget/test"
        }
    }

# CORS preflight handler for widget embedding
@app.options("/api/widget/{path:path}")
async def widget_options_handler(path: str):
    """Handle CORS preflight requests for all widget endpoints"""
    return {
        "message": "CORS preflight handled",
        "path": path,
        "methods": ["GET", "POST", "OPTIONS"],
        "headers": ["Content-Type", "X-API-Key", "Authorization"]
    }
    
@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to check loaded routes"""
    routes_info = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes_info.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": getattr(route, 'name', 'unknown')
            })
    
    # Filter widget routes
    widget_routes = [r for r in routes_info if '/widget' in r['path']]
    
    return {
        "total_routes": len(routes_info),
        "widget_routes": widget_routes,
        "widget_routes_count": len(widget_routes)
    }    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)