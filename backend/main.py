# backend/main.py - Update to include integration routes

# Keep existing imports and add the new one
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import time

from app.core.config.settings import settings
from app.core.database.session import engine, Base
from app.core import logger
from app.core.middleware.client_context import ClientContextMiddleware
from app.core.middleware.analytics_middleware import AnalyticsMiddleware
from app.core.middleware.subscription_limit_middleware import SubscriptionLimitMiddleware



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
from app.api.notifications import router as notifications_router



import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)
# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Multi-tenant chatbot platform API with knowledge integration and analytics",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "test:1"],
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
app.include_router(integration_routes.router, prefix="/api")  # Add this line
app.include_router(widget_router, prefix="/api")  
app.include_router(subscription_routes.router, prefix="/api")
app.include_router(notifications_router, prefix="/api")

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
        "features": ["enhanced_search", "knowledge_integration", "analytics", "conversation_history", "external_integrations"]  # Updated features list
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