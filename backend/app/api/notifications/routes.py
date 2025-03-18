from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.notification.notification_service import NotificationService
from app.repositories.notification_repository import NotificationRepository, NotificationPreferenceRepository
from app.api.notifications.schemas import (
    NotificationResponse,
    NotificationsResponse,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
    MarkAsReadResponse
)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Initialize services and repositories
notification_service = NotificationService()
notification_repo = NotificationRepository()
preference_repo = NotificationPreferenceRepository()

@router.get("", response_model=NotificationsResponse)
async def get_all_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get all notifications for the current client with pagination.
    """
    notifications = await notification_service.get_all_notifications(
        db=db,
        client_id=current_client.client_id,
        limit=limit,
        offset=offset
    )
    
    # Get total unread count
    unread_count = len(await notification_service.get_unread_notifications(
        db=db,
        client_id=current_client.client_id,
        limit=1000  # Large limit to get accurate count
    ))
    
    return {
        "notifications": notifications,
        "total": len(notifications),
        "unread_count": unread_count
    }

@router.get("/unread", response_model=NotificationsResponse)
async def get_unread_notifications(
    limit: int = Query(5, ge=1, le=20),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get unread notifications for the current client.
    """
    notifications = await notification_service.get_unread_notifications(
        db=db,
        client_id=current_client.client_id,
        limit=limit
    )
    
    return {
        "notifications": notifications,
        "unread_count": len(notifications),
        "total": len(notifications)
    }

@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    # Get notification and verify ownership
    notification = notification_repo.get(db, notification_id)
    
    if not notification or notification.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Mark as read
    updated_notification = await notification_service.mark_as_read(db, notification_id)
    return updated_notification

@router.post("/read-all", response_model=MarkAsReadResponse)
async def mark_all_as_read(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Mark all notifications as read for the current client.
    """
    count = await notification_service.mark_all_as_read(db, current_client.client_id)
    return {
        "success": True,
        "count": count
    }

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Delete a notification.
    """
    # Get notification and verify ownership
    notification = notification_repo.get(db, notification_id)
    
    if not notification or notification.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Delete notification
    notification_repo.delete(db, id=notification_id)
    return None

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get notification preferences for the current client.
    """
    # Get or create preferences
    preferences = preference_repo.get_or_create(db, current_client.client_id)
    return preferences

@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    preferences: NotificationPreferenceUpdate,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Update notification preferences for the current client.
    """
    # Get existing preferences
    existing_preferences = preference_repo.get_or_create(db, current_client.client_id)
    
    # Update preferences
    updated_preferences = preference_repo.update(db, db_obj=existing_preferences, obj_in=preferences.dict(exclude_unset=True))
    return updated_preferences