# Add the new channel routes to the API router
from app.api.channel import routes as channel_routes
from app.api.channel import webhook_routes as channel_webhook_routes
from fastapi import APIRouter

# Initialize the API router
api_router = APIRouter()

# Add to the list of routers
api_router.include_router(channel_routes.router, prefix="/channel")
api_router.include_router(channel_webhook_routes.router, prefix="/channel/webhook")