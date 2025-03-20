# backend/app/api/admin/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.core.database.dependencies import get_db
from app.api.admin.dependencies import get_admin_user
from app.domain.client.entities import Client, Subscription, ClientSettings
from app.domain.analytics.entities import DailyStats, SubscriptionUsage
from app.repositories.client_repository import ClientRepository, SubscriptionRepository
from app.repositories.analytics_repository import DailyStatsRepository, SubscriptionUsageRepository
from app.services.subscription.stripe_service import StripeService
from app.services.notification.notification_service import NotificationService
from app.core import logger
from app.api.admin.schemas import AdminUserResponse, ClientListResponse, ClientDetailResponse
from app.services.subscription.stripe_admin_service import StripeAdminService


router = APIRouter(prefix="/admin", tags=["admin"])

# Initialize services
stripe_service = StripeAdminService()
notification_service = NotificationService()

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_admin_dashboard(
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get admin dashboard overview with platform-wide statistics.
    """
    try:
        # Client stats
        client_repo = ClientRepository()
        total_clients = client_repo.count_total(db)
        active_clients = client_repo.count_active(db)
        
        # Get clients registered in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_clients = client_repo.count_since(db, thirty_days_ago)
        
        # Subscription stats
        sub_repo = SubscriptionRepository()
        subscription_counts = sub_repo.count_by_plan_type(db)
        
        # Revenue stats (last 30 days)
        # We'll use subscription data to estimate
        revenue_data = sub_repo.get_revenue_data(db, days=30)
        
        # Usage stats
        usage_repo = SubscriptionUsageRepository()
        total_messages = usage_repo.get_total_messages(db)
        
        # Daily stats aggregation
        stats_repo = DailyStatsRepository()
        today = datetime.utcnow().strftime("%Y-%m-%d")
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        today_stats = stats_repo.get_platform_totals(db, today)
        yesterday_stats = stats_repo.get_platform_totals(db, yesterday)
        
        # Calculate changes
        changes = {
            "total_sessions": _calculate_change(
                today_stats.get("total_sessions", 0),
                yesterday_stats.get("total_sessions", 0)
            ),
            "total_messages": _calculate_change(
                today_stats.get("total_messages", 0),
                yesterday_stats.get("total_messages", 0)
            ),
            "total_searches": _calculate_change(
                today_stats.get("total_searches", 0),
                yesterday_stats.get("total_searches", 0)
            ),
            "avg_response_time": _calculate_change(
                today_stats.get("avg_response_time_ms", 0),
                yesterday_stats.get("avg_response_time_ms", 0)
            )
        }
        
        # Get 30-day historical data for charts
        thirty_days_ago_str = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
        historical_data = stats_repo.get_daily_platform_totals(db, thirty_days_ago_str, today)
        
        return {
            "clients": {
                "total": total_clients,
                "active": active_clients,
                "new_last_30_days": new_clients,
                "by_plan": subscription_counts
            },
            "revenue": revenue_data,
            "usage": {
                "total_messages": total_messages,
                "today": today_stats,
                "yesterday": yesterday_stats,
                "changes": changes
            },
            "historical_data": historical_data,
            "last_updated": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.exception(f"Error generating admin dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating admin dashboard: {str(e)}"
        )

@router.get("/clients", response_model=List[ClientListResponse])
async def get_all_clients(
    admin_user: AdminUserResponse = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    plan_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all clients with optional filtering.
    """
    client_repo = ClientRepository()
    filters = {}
    
    if status:
        filters["active"] = status.lower() == "active"
    
    if plan_type:
        filters["plan_type"] = plan_type
    
    clients = client_repo.get_all_with_filters(db, skip, limit, search, filters)
    
    result = []
    for client in clients:
        # Get subscription info
        subscription = None
        try:
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, client.client_id)
        except Exception as e:
            logger.warning(f"Error getting subscription for client {client.client_id}: {str(e)}")
        
        # Get usage data
        usage_data = {}
        try:
            usage_repo = SubscriptionUsageRepository()
            current_month = datetime.utcnow().strftime("%Y-%m")
            usage = usage_repo.get_by_month(db, client.client_id, current_month)
            if usage:
                usage_data = {
                    "messages_used": usage.messages_used,
                    "messages_limit": usage.messages_limit,
                    "active_users": usage.active_users,
                    "active_users_limit": usage.active_users_limit,
                    "storage_used_bytes": usage.storage_used_bytes,
                    "storage_limit_bytes": usage.storage_limit_bytes,
                    "last_updated": usage.last_updated.isoformat()
                }
        except Exception as e:
            logger.warning(f"Error getting usage data for client {client.client_id}: {str(e)}")
        
        client_data = {
            "client_id": client.client_id,
            "name": client.name,
            "email": client.email,
            "industry": client.industry,
            "active": client.active,
            "created_at": client.created_at.isoformat(),
            "plan_type": subscription.plan_type if subscription else "free",
            "plan_status": subscription.status if subscription else "inactive",
            "usage": usage_data
        }
        
        result.append(client_data)
    
    return result

@router.get("/clients/{client_id}", response_model=ClientDetailResponse)
async def get_client_details(
    client_id: str,
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific client.
    """
    client_repo = ClientRepository()
    client = client_repo.get_by_client_id(db, client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get subscription info
    sub_repo = SubscriptionRepository()
    subscription = sub_repo.get_active_subscription(db, client_id)
    
    # Get settings
    from app.repositories.client_repository import ClientSettingsRepository
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, client_id)
    
    # Get usage data
    usage_repo = SubscriptionUsageRepository()
    current_month = datetime.utcnow().strftime("%Y-%m")
    usage = usage_repo.get_by_month(db, client_id, current_month)
    
    # Get analytics data
    stats_repo = DailyStatsRepository()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    last_month = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    analytics = {
        "today": stats_repo.get_by_date(db, client_id, today),
        "last_30_days": stats_repo.get_date_range_totals(db, client_id, last_month, today)
    }
    
    # Get payment history from Stripe
    payment_history = []
    try:
        payment_history = await stripe_service.get_invoice_history(client)
    except Exception as e:
        logger.warning(f"Error getting payment history: {str(e)}")
    
    # Compile full client details
    result = {
        "client_id": client.client_id,
        "name": client.name,
        "email": client.email,
        "industry": client.industry,
        "website": client.website,
        "phone": client.phone,
        "active": client.active,
        "created_at": client.created_at.isoformat(),
        "api_key": client.api_key,
        "subscription": {
            "plan_type": subscription.plan_type if subscription else "free",
            "status": subscription.status if subscription else "inactive",
            "current_period_start": subscription.starts_at.isoformat() if subscription and subscription.starts_at else None,
            "current_period_end": subscription.expires_at.isoformat() if subscription and subscription.expires_at else None,
            "payment_id": subscription.payment_id if subscription else None
        } if subscription else None,
        "settings": {
            "primary_color": settings.primary_color if settings else None,
            "logo_url": settings.logo_url if settings else None,
            "greeting_message": settings.greeting_message if settings else None,
            "chatbot_name": settings.chatbot_name if settings else None
        } if settings else None,
        "usage": {
            "messages_used": usage.messages_used if usage else 0,
            "messages_limit": usage.messages_limit if usage else 0,
            "active_users": usage.active_users if usage else 0,
            "active_users_limit": usage.active_users_limit if usage else 0,
            "storage_used_bytes": usage.storage_used_bytes if usage else 0,
            "storage_limit_bytes": usage.storage_limit_bytes if usage else 0,
            "percentage_used": round((usage.messages_used / usage.messages_limit * 100) if usage and usage.messages_limit else 0, 2)
        } if usage else None,
        "analytics": {
            "total_sessions": analytics["last_30_days"].get("total_sessions", 0),
            "total_messages": analytics["last_30_days"].get("total_messages", 0),
            "total_searches": analytics["last_30_days"].get("total_searches", 0),
            "average_response_time_ms": analytics["last_30_days"].get("average_response_time_ms", 0)
        },
        "payment_history": payment_history
    }
    
    return result

@router.post("/clients/{client_id}/activate", response_model=Dict[str, Any])
async def activate_client(
    client_id: str,
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Activate a client account.
    """
    client_repo = ClientRepository()
    client = client_repo.get_by_client_id(db, client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    if client.active:
        return {"message": "Client is already active", "client_id": client_id}
    
    # Update client status
    client_repo.update(db, db_obj=client, obj_in={"active": True})
    
    # Send notification to client
    background_tasks = BackgroundTasks()
    background_tasks.add_task(
        notification_service.send_notification,
        db=db,
        client_id=client_id,
        title="Account Activated",
        message="Your account has been activated. You now have full access to the platform.",
        notification_type="account_activated"
    )
    
    return {"message": "Client activated successfully", "client_id": client_id}

@router.post("/clients/{client_id}/deactivate", response_model=Dict[str, Any])
async def deactivate_client(
    client_id: str,
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate a client account.
    """
    client_repo = ClientRepository()
    client = client_repo.get_by_client_id(db, client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    if not client.active:
        return {"message": "Client is already inactive", "client_id": client_id}
    
    # Update client status
    client_repo.update(db, db_obj=client, obj_in={"active": False})
    
    # Send notification to client
    background_tasks = BackgroundTasks()
    background_tasks.add_task(
        notification_service.send_notification,
        db=db,
        client_id=client_id,
        title="Account Deactivated",
        message="Your account has been deactivated. Please contact support for assistance.",
        notification_type="account_deactivated"
    )
    
    return {"message": "Client deactivated successfully", "client_id": client_id}

@router.post("/clients/{client_id}/change-plan", response_model=Dict[str, Any])
async def change_client_plan(
    client_id: str,
    plan_data: Dict[str, Any],
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Change a client's subscription plan from admin panel.
    """
    if "plan_type" not in plan_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan type is required"
        )
    
    plan_type = plan_data["plan_type"]
    
    # Validate plan type
    if plan_type not in ["free", "basic", "professional", "enterprise"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type: {plan_type}"
        )
    
    client_repo = ClientRepository()
    client = client_repo.get_by_client_id(db, client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    try:
        # Get current subscription
        sub_repo = SubscriptionRepository()
        current_subscription = sub_repo.get_active_subscription(db, client_id)
        
        if current_subscription:
            # Store current plan for notification
            current_plan = current_subscription.plan_type
            
            # Update subscription
            sub_repo.update(db, db_obj=current_subscription, obj_in={
                "plan_type": plan_type,
                "updated_at": datetime.utcnow()
            })
        else:
            # Create new subscription
            current_plan = "free"
            
            sub_repo.create(db, obj_in={
                "client_id": client_id,
                "plan_type": plan_type,
                "status": "active",
                "starts_at": datetime.utcnow(),
                "message_limit": _get_message_limit(plan_type),
                "user_limit": _get_user_limit(plan_type)
            })
        
        # Update any Stripe subscription
        try:
            await stripe_service.update_subscription(db, client, plan_type)
        except Exception as e:
            logger.warning(f"Error updating Stripe subscription: {str(e)}")
        
        # Send notification to client
        background_tasks = BackgroundTasks()
        background_tasks.add_task(
            notification_service.send_notification,
            db=db,
            client_id=client_id,
            title="Subscription Plan Changed",
            message=f"Your subscription plan has been changed from {current_plan} to {plan_type}.",
            notification_type="subscription_updated",
            metadata={"previous_plan": current_plan, "new_plan": plan_type}
        )
        
        return {
            "message": "Subscription plan changed successfully",
            "client_id": client_id,
            "previous_plan": current_plan,
            "new_plan": plan_type
        }
    
    except Exception as e:
        logger.exception(f"Error changing subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change subscription plan: {str(e)}"
        )

@router.get("/payments", response_model=Dict[str, Any])
async def get_payment_overview(
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db),
    period: str = Query("month", description="Period for revenue data: day, week, month, year")
):
    """
    Get payment and revenue overview.
    """
    try:
        # Get revenue data
        revenue_data = await stripe_service.get_admin_revenue_report(period)
        
        # Get subscription counts by plan
        sub_repo = SubscriptionRepository()
        subscription_counts = sub_repo.count_by_plan_type(db)
        
        # Get pending/failed payments
        problem_payments = await stripe_service.get_problem_payments()
        
        return {
            "revenue": revenue_data,
            "subscriptions": subscription_counts,
            "problem_payments": problem_payments,
            "as_of": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.exception(f"Error generating payment overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating payment overview: {str(e)}"
        )

@router.get("/payments/history", response_model=List[Dict[str, Any]])
async def get_payment_history(
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db),
    days: int = Query(30, description="Number of days of history to retrieve"),
    status: Optional[str] = Query(None, description="Filter by payment status")
):
    """
    Get detailed payment history for all clients.
    """
    try:
        payments = await stripe_service.get_payment_history(days, status)
        
        # Enhance payment data with client information
        client_repo = ClientRepository()
        
        for payment in payments:
            client_id = payment.get("client_id")
            if client_id:
                client = client_repo.get_by_client_id(db, client_id)
                if client:
                    payment["client_name"] = client.name
                    payment["client_email"] = client.email
        
        return payments
    
    except Exception as e:
        logger.exception(f"Error getting payment history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting payment history: {str(e)}"
        )

@router.post("/payments/{payment_id}/refund", response_model=Dict[str, Any])
async def refund_payment(
    payment_id: str,
    refund_data: Dict[str, Any],
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Issue a refund for a payment.
    """
    try:
        amount = refund_data.get("amount")
        reason = refund_data.get("reason", "requested_by_customer")
        
        refund_result = await stripe_service.issue_refund(payment_id, amount, reason)
        
        # Notify client about refund
        if refund_result.get("client_id"):
            background_tasks = BackgroundTasks()
            background_tasks.add_task(
                notification_service.send_notification,
                db=db,
                client_id=refund_result["client_id"],
                title="Payment Refunded",
                message=f"A refund of ${refund_result.get('amount', 0) / 100:.2f} has been issued to your payment method.",
                notification_type="payment_refunded",
                metadata={
                    "payment_id": payment_id,
                    "refund_id": refund_result.get("refund_id"),
                    "amount": refund_result.get("amount")
                }
            )
        
        return refund_result
    
    except Exception as e:
        logger.exception(f"Error refunding payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error refunding payment: {str(e)}"
        )

@router.post("/notifications/send", response_model=Dict[str, Any])
async def send_admin_notification(
    notification_data: Dict[str, Any],
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Send an admin notification to one or multiple clients.
    """
    if "title" not in notification_data or "message" not in notification_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title and message are required"
        )
    
    client_id = notification_data.get("client_id")
    client_ids = notification_data.get("client_ids", [])
    all_clients = notification_data.get("all_clients", False)
    
    # Validate that we have target clients
    if not client_id and not client_ids and not all_clients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either client_id, client_ids, or all_clients must be provided"
        )
    
    title = notification_data["title"]
    message = notification_data["message"]
    notification_type = notification_data.get("type", "admin_announcement")
    
    try:
        # Get target client IDs
        target_client_ids = []
        
        if client_id:
            # Single client
            target_client_ids = [client_id]
        elif client_ids:
            # Multiple specific clients
            target_client_ids = client_ids
        else:
            # All active clients
            client_repo = ClientRepository()
            clients = client_repo.get_all_active(db)
            target_client_ids = [client.client_id for client in clients]
        
        # Send notifications
        sent_count = 0
        for cid in target_client_ids:
            try:
                await notification_service.send_notification(
                    db=db,
                    client_id=cid,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    metadata=notification_data.get("metadata", {})
                )
                sent_count += 1
            except Exception as e:
                logger.warning(f"Error sending notification to client {cid}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Sent notification to {sent_count} clients",
            "sent_count": sent_count,
            "total_targets": len(target_client_ids)
        }
    
    except Exception as e:
        logger.exception(f"Error sending admin notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending admin notification: {str(e)}"
        )

@router.get("/system/stats", response_model=Dict[str, Any])
async def get_system_stats(
    admin_user: AdminUserResponse = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system-wide statistics and health metrics.
    """
    try:
        # Database stats
        from sqlalchemy import text
        
        # Get table row counts
        table_counts = {}
        tables = [
            "clients", "client_settings", "subscriptions", 
            "knowledge_collections", "knowledge_items", "vector_embeddings",
            "chat_sessions", "chat_messages", "daily_stats"
        ]
        
        for table in tables:
            count = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            table_counts[table] = count
        
        # Performance stats from analytics
        from app.domain.analytics.entities import ChatMetrics, KnowledgeMetrics
        from sqlalchemy import func, and_
        
        # Last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        # Chat performance
        avg_response_time = db.query(
            func.avg(ChatMetrics.average_response_time_ms)
        ).filter(
            ChatMetrics.timestamp >= yesterday
        ).scalar() or 0
        
        # Knowledge performance - modified to use the correct field name
        # Check if KnowledgeMetrics has average_search_time_ms attribute
        # If not, try alternative fields or provide a fallback value
        try:
            # Attempt to use the correct field based on the model structure
            if hasattr(KnowledgeMetrics, 'average_search_time_ms'):
                avg_search_time = db.query(
                    func.avg(KnowledgeMetrics.average_search_time_ms)
                ).filter(
                    KnowledgeMetrics.timestamp >= yesterday
                ).scalar() or 0
            elif hasattr(KnowledgeMetrics, 'metadata') and getattr(KnowledgeMetrics, 'metadata') is not None:
                # If there's a metadata field, try to use it
                avg_search_time = db.query(
                    func.avg(KnowledgeMetrics.metadata["avg_response_time_ms"].as_float())
                ).filter(
                    and_(
                        KnowledgeMetrics.timestamp >= yesterday,
                        KnowledgeMetrics.metadata.has_key("avg_response_time_ms")
                    )
                ).scalar() or 0
            else:
                # Fallback: Use a hardcoded value or derive from another metric
                avg_search_time = avg_response_time * 0.8  # Estimate search time as 80% of response time
        except Exception as e:
            logger.warning(f"Error getting search metrics: {str(e)}")
            avg_search_time = 0
        
        # Get storage stats
        total_storage_used = db.query(func.sum(SubscriptionUsage.storage_used_bytes)).scalar() or 0
        
        return {
            "database": {
                "table_counts": table_counts,
                "total_records": sum(table_counts.values())
            },
            "performance": {
                "avg_response_time_ms": avg_response_time,
                "avg_search_time_ms": avg_search_time
            },
            "storage": {
                "total_storage_bytes": total_storage_used,
                "total_storage_mb": round(total_storage_used / (1024 * 1024), 2)
            },
            "clients": {
                "active_count": table_counts.get("clients", 0)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.exception(f"Error getting system stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting system stats: {str(e)}"
        )
        
# Helper functions
def _calculate_change(current, previous):
    """Calculate percentage change between two values."""
    if previous == 0:
        return 100 if current > 0 else 0
    
    return round(((current - previous) / previous) * 100, 2)

def _get_message_limit(plan_type):
    """Get message limit based on plan type."""
    limits = {
        "free": 1000,
        "basic": 10000,
        "professional": 50000,
        "enterprise": 250000
    }
    return limits.get(plan_type, 1000)

def _get_user_limit(plan_type):
    """Get user limit based on plan type."""
    limits = {
        "free": 10,
        "basic": 100,
        "professional": 1000,
        "enterprise": 10000
    }
    return limits.get(plan_type, 10)