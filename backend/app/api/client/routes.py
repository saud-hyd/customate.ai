from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.repositories.client_repository import ClientRepository, ClientSettingsRepository
from app.domain.client.entities import Client, ClientSettings, Subscription
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client", tags=["client"])

@router.get("", response_model=Dict[str, Any])
async def get_client_info(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get information about the current client."""
    client_repo = ClientRepository()
    client = client_repo.get_by_client_id(db, current_client.client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get client settings
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, client.client_id)
    
    return {
        "client_id": client.client_id,
        "name": client.name,
        "industry": client.industry,
        "email": client.email,
        "website": client.website,
        "phone": client.phone,
        "api_key": client.api_key,
        "active": client.active,
        "created_at": client.created_at.isoformat(),
        "settings": {
            "primary_color": settings.primary_color if settings else "#4f46e5",
            "logo_url": settings.logo_url if settings else None,
            "greeting_message": settings.greeting_message if settings else None,
            "enable_suggestions": settings.enable_suggestions if settings else True,
            "enable_typing_indicator": settings.enable_typing_indicator if settings else True,
            "widget_position": settings.widget_position if settings else "bottom-right",
            "chatbot_name": settings.chatbot_name if settings else "AI Assistant",
        }
    }

@router.put("/settings", response_model=Dict[str, Any])
async def update_client_settings(
    settings_data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Update client settings."""
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, current_client.client_id)
    
    if not settings:
        # Create settings if they don't exist
        settings = settings_repo.create(db, obj_in={"client_id": current_client.client_id})
    
    # Update settings
    updated_settings = settings_repo.update(db, db_obj=settings, obj_in=settings_data)
    
    return {
        "message": "Settings updated successfully",
        "settings": {
            "primary_color": updated_settings.primary_color,
            "logo_url": updated_settings.logo_url,
            "greeting_message": updated_settings.greeting_message,
            "enable_suggestions": updated_settings.enable_suggestions,
            "enable_typing_indicator": updated_settings.enable_typing_indicator,
            "widget_position": updated_settings.widget_position,
            "chatbot_name": updated_settings.chatbot_name,
        }
    }
    
@router.get("/subscription", response_model=Dict[str, Any])
async def get_client_subscription(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get current subscription information including usage from analytics."""
    try:
        # Initialize Stripe service
        from app.services.subscription.stripe_service import StripeService
        stripe_service = StripeService()
        
        # Get subscription information directly from analytics
        subscription_info = await stripe_service.get_subscription_info(current_client, db)
        
        return subscription_info
    except Exception as e:
        logger.exception(f"Error getting subscription info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve subscription information: {str(e)}"
        ) 
        
@router.post("/sync-dashboard-data", response_model=Dict[str, Any])
async def sync_dashboard_data(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Sync all dashboard data including conversation counts, message counts, and storage."""
    try:
        # Import the needed repositories and services
        from app.domain.chat.entities import ChatSession, ChatMessage
        from sqlalchemy import func, distinct
        from datetime import datetime
        
        # Get today's date
        today = datetime.utcnow().strftime("%Y-%m-%d")
        this_month = datetime.utcnow().strftime("%Y-%m")
        
        # Count today's conversations (sessions)
        today_sessions = db.query(ChatSession)\
            .filter(
                ChatSession.client_id == current_client.client_id,
                func.date(ChatSession.created_at) == today
            )\
            .count()
        
        # Count this month's conversations
        month_sessions = db.query(ChatSession)\
            .filter(
                ChatSession.client_id == current_client.client_id,
                func.date(ChatSession.created_at) >= f"{this_month}-01"
            )\
            .count()
            
        # Count today's messages (both user and assistant)
        today_messages = db.query(ChatMessage)\
            .join(ChatSession, ChatSession.session_id == ChatMessage.session_id)\
            .filter(
                ChatSession.client_id == current_client.client_id,
                func.date(ChatMessage.created_at) == today
            )\
            .count()
            
        # Count this month's messages
        month_messages = db.query(ChatMessage)\
            .join(ChatSession, ChatSession.session_id == ChatMessage.session_id)\
            .filter(
                ChatSession.client_id == current_client.client_id,
                func.date(ChatMessage.created_at) >= f"{this_month}-01"
            )\
            .count()
            
        # Count assistant messages for subscription usage
        assistant_messages = db.query(ChatMessage)\
            .join(ChatSession, ChatSession.session_id == ChatMessage.session_id)\
            .filter(
                ChatSession.client_id == current_client.client_id,
                ChatMessage.role == 'assistant',
                func.date(ChatMessage.created_at) >= f"{this_month}-01"
            )\
            .count()
            
        # Get active users
        active_users = db.query(func.count(distinct(ChatSession.user_id)))\
            .filter(
                ChatSession.client_id == current_client.client_id,
                func.date(ChatSession.created_at) >= f"{this_month}-01",
                ChatSession.user_id.isnot(None)
            )\
            .scalar() or 0
            
        # Update subscription usage
        from app.domain.analytics.entities import SubscriptionUsage
        usage = db.query(SubscriptionUsage)\
            .filter(
                SubscriptionUsage.client_id == current_client.client_id,
                SubscriptionUsage.month_year == this_month
            )\
            .first()
            
        # Update or create subscription usage
        if usage:
            usage.messages_used = assistant_messages
            usage.active_users = active_users
            usage.last_updated = datetime.utcnow()
        else:
            # Get subscription ID
            subscription = db.query(Subscription)\
                .filter(Subscription.client_id == current_client.client_id)\
                .first()
                
            if subscription:
                import uuid
                usage = SubscriptionUsage(
                    usage_id=str(uuid.uuid4()),
                    client_id=current_client.client_id,
                    subscription_id=subscription.id,
                    month_year=this_month,
                    messages_used=assistant_messages,
                    active_users=active_users,
                    storage_used_bytes=0,  # This will be updated separately
                    last_updated=datetime.utcnow()
                )
                db.add(usage)
                
        # Commit changes
        db.commit()
        
        # Update analytics tables
        from app.services.analytics.usage_tracker import UsageTracker
        usage_tracker = UsageTracker()
        usage_tracker._update_storage_usage(db, current_client.client_id)
        usage_tracker._update_daily_stats(db, current_client.client_id)
        
        return {
            "status": "success",
            "today": {
                "sessions": today_sessions,
                "messages": today_messages
            },
            "month": {
                "sessions": month_sessions,
                "messages": month_messages,
                "assistant_messages": assistant_messages,
                "active_users": active_users
            }
        }
            
    except Exception as e:
        logger.exception(f"Error syncing dashboard data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync dashboard data: {str(e)}"
        )        
        
@router.post("/refresh-analytics", response_model=Dict[str, Any])
async def refresh_analytics_data(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Refresh analytics data for the current client."""
    try:
        # Import the usage tracker service
        from app.services.analytics.usage_tracker import UsageTracker
        
        # Initialize the usage tracker
        usage_tracker = UsageTracker()
        
        # Force a sync of subscription usage
        await usage_tracker.sync_subscription_usage(db, current_client.client_id)
        
        # Get current subscription
        subscription_repo = SubscriptionRepository()
        subscription = subscription_repo.get_active_subscription(db, current_client.client_id)
        
        return {
            "status": "success",
            "message": "Analytics data refreshed successfully",
            "subscription": {
                "plan_type": subscription.plan_type,
                "message_limit": subscription.message_limit,
                "user_limit": subscription.user_limit,
                "storage_limit_bytes": subscription.storage_limit_bytes
            }
        }
    except Exception as e:
        logger.exception(f"Error refreshing analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh analytics: {str(e)}"
        )           
        
@router.post("/sync-subscription-messages", response_model=Dict[str, Any])
async def sync_subscription_messages(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Sync subscription message counts directly from chat history.
    This replicates the functionality of scripts.fix_message_counts.
    """
    try:
        # Import necessary models
        from app.domain.chat.entities import ChatSession, ChatMessage
        from app.domain.analytics.entities import SubscriptionUsage
        from sqlalchemy import func
        from datetime import datetime
        
        # Get current month
        current_month = datetime.utcnow().strftime("%Y-%m")
        month_start = f"{current_month}-01"
        
        # Count only assistant messages
        assistant_message_count = db.query(func.count(ChatMessage.id))\
            .join(ChatSession, ChatSession.session_id == ChatMessage.session_id)\
            .filter(
                ChatSession.client_id == current_client.client_id,
                ChatMessage.role == 'assistant',
                ChatMessage.created_at >= month_start
            )\
            .scalar() or 0
        
        # Get subscription usage for current month
        usage = db.query(SubscriptionUsage)\
            .filter(
                SubscriptionUsage.client_id == current_client.client_id,
                SubscriptionUsage.month_year == current_month
            ).first()
        
        # Update or create subscription usage
        if usage:
            usage.messages_used = assistant_message_count
            usage.last_updated = datetime.utcnow()
        else:
            # Get subscription
            subscription = db.query(Subscription)\
                .filter(
                    Subscription.client_id == current_client.client_id,
                    Subscription.status == 'active'
                ).first()
            
            if subscription:
                import uuid
                usage = SubscriptionUsage(
                    usage_id=str(uuid.uuid4()),
                    client_id=current_client.client_id,
                    subscription_id=subscription.id,
                    month_year=current_month,
                    messages_used=assistant_message_count,
                    active_users=0,  # We'll update this separately
                    storage_used_bytes=0,  # This will be updated separately
                    last_updated=datetime.utcnow()
                )
                db.add(usage)
        
        # Commit changes
        db.commit()
        
        # Also update daily analytics
        from app.services.analytics.usage_tracker import UsageTracker
        usage_tracker = UsageTracker()
        usage_tracker._update_daily_stats(db, current_client.client_id)
        
        # Return the updated counts
        return {
            "status": "success",
            "message": "Message counts synced successfully",
            "data": {
                "assistant_messages": assistant_message_count,
                "month": current_month
            }
        }
    
    except Exception as e:
        logger.exception(f"Error syncing subscription messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync subscription messages: {str(e)}"
        )
        
@router.post("/fix-message-counts", response_model=Dict[str, Any])
async def fix_message_counts(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Directly fix message counts by mimicking the scripts.fix_message_counts script.
    This will update both the database and return the updated counts.
    """
    try:
        # Get client_id
        client_id = current_client.client_id
        
        # Import necessary models and functions
        from sqlalchemy import func, text
        from app.domain.chat.entities import ChatSession, ChatMessage
        from app.domain.analytics.entities import SubscriptionUsage
        from datetime import datetime
        
        # Get current month
        current_month = datetime.utcnow().strftime("%Y-%m")
        month_start = f"{current_month}-01"
        
        # Direct SQL query to count assistant messages
        query = text("""
            SELECT COUNT(*) 
            FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.session_id
            WHERE cs.client_id = :client_id
            AND cm.role = 'assistant'
            AND cm.created_at >= :month_start
        """)
        
        result = db.execute(query, {"client_id": client_id, "month_start": month_start})
        assistant_count = result.scalar() or 0
        
        # Get or create subscription usage record
        usage = db.query(SubscriptionUsage).filter(
            SubscriptionUsage.client_id == client_id,
            SubscriptionUsage.month_year == current_month
        ).first()
        
        if usage:
            # Update existing record with the assistant message count
            usage.messages_used = assistant_count
            usage.last_updated = datetime.utcnow()
        else:
            # Create new record
            subscription = db.query(Subscription).filter(
                Subscription.client_id == client_id
            ).order_by(Subscription.created_at.desc()).first()
            
            if subscription:
                import uuid
                usage = SubscriptionUsage(
                    usage_id=str(uuid.uuid4()),
                    client_id=client_id,
                    subscription_id=subscription.id,
                    month_year=current_month,
                    messages_used=assistant_count,
                    active_users=0,  # This will be updated separately
                    storage_used_bytes=0,  # This will be updated separately
                    last_updated=datetime.utcnow()
                )
                db.add(usage)
        
        # Commit changes
        db.commit()
        
        # Return the fixed count
        return {
            "status": "success",
            "message": "Message counts fixed successfully",
            "data": {
                "client_id": client_id,
                "month": current_month,
                "assistant_message_count": assistant_count,
                "previous_count": getattr(usage, "messages_used", 0) if usage else 0
            }
        }
    
    except Exception as e:
        logger.exception(f"Error fixing message counts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fix message counts: {str(e)}"
        )        