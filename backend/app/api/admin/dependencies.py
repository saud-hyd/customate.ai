# backend/app/api/admin/dependencies.py
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
import logging
import os
from typing import Optional

from app.core.database.dependencies import get_db
from app.api.admin.schemas import AdminUserResponse

logger = logging.getLogger(__name__)

# In a production environment, you would use a proper admin authentication system
# This is a simple implementation for demo purposes
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "admin-secret-key-change-me")
ADMIN_USERS = {
    "admin": {
        "user_id": "admin",
        "email": "admin@customate.ai",
        "full_name": "Admin User",
        "role": "admin"
    },
    "support": {
        "user_id": "support",
        "email": "support@customate.ai",
        "full_name": "Support User",
        "role": "support"
    }
}

async def get_admin_user(
    x_admin_key: str = Header(None, description="Admin API Key"),
    x_admin_user: Optional[str] = Header(None, description="Admin Username"),
    db: Session = Depends(get_db)
):
    """
    Verify admin API key and return admin user information.
    In a production environment, this would use a more robust authentication system.
    """
    logger.info(f"Admin auth attempt: {x_admin_user}")
    
    if not x_admin_key:
        logger.error("Missing admin API key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin API key is required"
        )
    
    if x_admin_key != ADMIN_API_KEY:
        logger.error("Invalid admin API key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key"
        )
    
    # Default to 'admin' user if not specified
    admin_id = x_admin_user or "admin"
    
    if admin_id not in ADMIN_USERS:
        logger.error(f"Unknown admin user: {admin_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown admin user"
        )
    
    logger.info(f"Admin authentication successful: {admin_id}")
    return AdminUserResponse(**ADMIN_USERS[admin_id])