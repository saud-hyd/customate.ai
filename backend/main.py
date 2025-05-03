from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import time
import asyncio
from contextlib import asynccontextmanager

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
from app.api.widget import router as widget_router 
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


import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

# Create database tables
Base.metadata.create_all(bind=engine)

# Define lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run before the application starts
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
    description="Multi-tenant chatbot platform API with knowledge integration and analytics",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development URLs
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002", 
        "http://localhost:5173",
        "http://localhost", 
        "http://127.0.0.1",
        
        # Vercel deployment URLs
        "https://customate.vercel.app",
        "https://customate-ai.vercel.app",
        "https://customate-ai-git-develop-saud-hyds-projects.vercel.app",
        "https://customate-lyw0rsjn0-saud-hyds-projects.vercel.app",
        "https://customate-16bvgs9s9-saud-hyds-projects.vercel.app",
        "https://customate-g3wug6ubm-saud-hyds-projects.vercel.app",
        
        # Render backend URL for same-origin requests
        "https://customate-ai-1.onrender.com",
        
        # Custom domains
        "https://customate.ai",
        "https://app.customate.ai",
        "http://customate.ai",
        "http://app.customate.ai",
        
        # Allow all for widget embedding
        "*"
    ],
    
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
app.include_router(widget_router, prefix="/api")


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Calculate process time
    process_time = time.time() - start_time
    
    # Log request details
    logger.info(
        f"Request: {request.method} {request.url.path} "
        f"- Status: {response.status_code} "
        f"- Process Time: {process_time:.4f}s"
    )
    
    return response

# Root endpoint for health check
@app.get("/")
async def root():
    return {
        "status": "healthy", 
        "app_name": settings.APP_NAME, 
        "version": settings.API_VERSION,
        "features": [
            "enhanced_search", 
            "knowledge_integration", 
            "analytics", 
            "conversation_history", 
            "external_integrations",
            "website_crawling"
        ]
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "components": {
            "api": "up",
            "database": "up"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)