# backend/app/api/widget/__init__.py
from fastapi import APIRouter

# Create main widget router
router = APIRouter()

# Include embed routes (MOST IMPORTANT)
try:
    from .embed_routes import router as embed_router
    router.include_router(embed_router, tags=["embed"])
    print("OK Embed routes included")
except ImportError as e:
    print(f"X Failed to import embed routes: {e}")
    
    # Create fallback embed endpoint
    @router.get("/embed.js")
    async def fallback_embed(api_key: str):
        from fastapi.responses import Response
        fallback_script = f"""
        console.error('X Embed routes not properly configured');
        console.log('API Key: {api_key}');
        alert('Widget embed system not configured properly');
        """
        return Response(
            content=fallback_script,
            media_type="application/javascript",
            headers={"Access-Control-Allow-Origin": "*"}
        )

# Include other widget routes
try:
    from . import routes
    router.include_router(routes.router, tags=["widget-api"])
    print("OK Widget API routes included")
except ImportError as e:
    print(f"! Widget API routes not available: {e}")

try:
    from . import widget_app_routes  
    router.include_router(widget_app_routes.router, tags=["widget-app"])
    print("OK Widget app routes included")
except ImportError as e:
    print(f"! Widget app routes not available: {e}")

# Health check
@router.get("/health")
async def widget_health():
    return {
        "status": "healthy",
        "service": "widget",
        "embed_available": True
    }

print(f"OK Widget router configured with {len(router.routes)} routes")