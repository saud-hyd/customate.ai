# backend/app/api/integration/__init__.py
from fastapi import APIRouter
from .routes import router as integration_router

# Create the main integration router
router = APIRouter(
    prefix="/integrations",
    tags=["integrations"],
    responses={
        404: {"description": "Integration not found"},
        401: {"description": "Authentication required"},
        403: {"description": "Insufficient permissions"}
    }
)

# Include the integration routes
router.include_router(integration_router)

__all__ = ["router"]