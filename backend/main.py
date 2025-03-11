# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import time

from app.core.config.settings import settings
from app.core.database.session import engine, Base
from app.core import logger
from app.core.middleware.client_context import ClientContextMiddleware

# Import original routes
from app.api.auth import routes as auth_routes
from app.api.client import routes as client_routes
from app.api.knowledge import routes as knowledge_routes
from app.api.knowledge import document_routes

# Import enhanced routes
from app.api.chatbot import enhanced_routes as enhanced_chatbot_routes
from app.api.knowledge import enhanced_routes as enhanced_knowledge_routes

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Multi-tenant chatbot platform API with enhanced knowledge integration",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add client context middleware
app.add_middleware(ClientContextMiddleware)

# Include original routes
app.include_router(auth_routes.router, prefix="/api")
app.include_router(client_routes.router, prefix="/api")
app.include_router(knowledge_routes.router, prefix="/api/knowledge")
app.include_router(document_routes.router, prefix="/api/knowledge")

# Include enhanced routes
app.include_router(enhanced_chatbot_routes.router, prefix="/api")
app.include_router(enhanced_knowledge_routes.router, prefix="/api")

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
        "features": ["enhanced_search", "knowledge_integration"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)