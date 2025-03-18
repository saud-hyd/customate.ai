import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

from app.core.config.settings import settings
from app.domain.client.entities import Client
from app.domain.notification.entities import Notification
from app.repositories.client_repository import ClientRepository
from app.repositories.notification_repository import NotificationRepository

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for managing client notifications (in-app and email)."""

    def __init__(self):
        """Initialize notification service."""
        self.client_repo = ClientRepository()
        self.notification_repo = NotificationRepository()
    
    async def send_notification(
        self,
        db: Session,
        client_id: str,
        title: str,
        message: str,
        notification_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        send_email: bool = False
    ) -> Notification:
        """
        Send a notification to a client.
        
        Args:
            db: Database session
            client_id: Client ID to send notification to
            title: Notification title
            message: Notification message
            notification_type: Type of notification (e.g., limit_warning, system_update)
            metadata: Additional notification metadata
            send_email: Whether to also send an email
            
        Returns:
            Created notification
        """
        # Create in-app notification
        notification = self.notification_repo.create(db, obj_in={
            "client_id": client_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "notification_metadata": metadata or {},
            "read": False,
            "created_at": datetime.utcnow()
        })
        
        # Send email if requested
        if send_email:
            client = self.client_repo.get_by_client_id(db, client_id)
            if client and client.email:
                try:
                    await self._send_email_notification(client, title, message, notification_type, metadata)
                except Exception as e:
                    logger.error(f"Failed to send email notification to {client.email}: {str(e)}")
        
        return notification
    
    async def send_bulk_notification(
        self,
        db: Session,
        client_ids: List[str],
        title: str,
        message: str,
        notification_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        send_email: bool = False
    ) -> List[Notification]:
        """
        Send notifications to multiple clients.
        
        Args:
            db: Database session
            client_ids: List of client IDs to send notifications to
            title: Notification title
            message: Notification message
            notification_type: Type of notification (e.g., limit_warning, system_update)
            metadata: Additional notification metadata
            send_email: Whether to also send emails
            
        Returns:
            List of created notifications
        """
        notifications = []
        
        # Create in-app notifications for all clients
        notification_data = []
        current_time = datetime.utcnow()
        
        for client_id in client_ids:
            notification_data.append({
                "client_id": client_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "notification_metadata": metadata or {},
                "read": False,
                "created_at": current_time
            })
        
        # Bulk create notifications
        created_notifications = self.notification_repo.create_bulk(db, notifications=notification_data)
        notifications.extend(created_notifications)
        
        # Send emails if requested
        if send_email:
            # Get all clients that should receive emails
            clients = self.client_repo.get_by_client_ids(db, client_ids)
            
            for client in clients:
                if client.email:
                    try:
                        await self._send_email_notification(client, title, message, notification_type, metadata)
                    except Exception as e:
                        logger.error(f"Failed to send email notification to {client.email}: {str(e)}")
        
        return notifications
    
    async def get_unread_notifications(
        self,
        db: Session,
        client_id: str,
        limit: int = 10
    ) -> List[Notification]:
        """
        Get unread notifications for a client.
        
        Args:
            db: Database session
            client_id: Client ID
            limit: Maximum number of notifications to return
            
        Returns:
            List of unread notifications
        """
        return self.notification_repo.get_unread_by_client_id(db, client_id, limit=limit)
    
    async def get_all_notifications(
        self,
        db: Session,
        client_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """
        Get all notifications for a client with pagination.
        
        Args:
            db: Database session
            client_id: Client ID
            limit: Maximum number of notifications to return
            offset: Offset for pagination
            
        Returns:
            List of notifications
        """
        return self.notification_repo.get_by_client_id(db, client_id, limit=limit, offset=offset)
    
    async def mark_as_read(self, db: Session, notification_id: int) -> Notification:
        """
        Mark a notification as read.
        
        Args:
            db: Database session
            notification_id: Notification ID
            
        Returns:
            Updated notification
        """
        notification = self.notification_repo.get(db, id=notification_id)
        if not notification:
            raise ValueError(f"Notification not found: {notification_id}")
        
        return self.notification_repo.update(db, db_obj=notification, obj_in={"read": True})
    
    async def mark_all_as_read(self, db: Session, client_id: str) -> int:
        """
        Mark all notifications for a client as read.
        
        Args:
            db: Database session
            client_id: Client ID
            
        Returns:
            Number of notifications marked as read
        """
        return self.notification_repo.mark_all_as_read(db, client_id)
    
    async def send_limit_approaching_notification(
        self,
        db: Session,
        client_id: str,
        limit_type: str,
        percentage: float,
        used: int,
        limit: int
    ) -> Notification:
        """
        Send a notification about approaching subscription limits.
        
        Args:
            db: Database session
            client_id: Client ID
            limit_type: Type of limit (e.g., messages, users, storage)
            percentage: Percentage of limit used
            used: Amount used
            limit: Total limit
            
        Returns:
            Created notification
        """
        # Format limit name for display
        limit_name = {
            "messages": "message",
            "users": "active user",
            "storage": "storage",
            "collections": "knowledge collection"
        }.get(limit_type, limit_type)
        
        title = f"Approaching {limit_name} limit - {percentage:.0f}% used"
        message = (
            f"You've used {percentage:.1f}% of your monthly {limit_name} limit "
            f"({used} of {limit}). "
            f"To ensure uninterrupted service, consider upgrading your subscription plan."
        )
        
        return await self.send_notification(
            db=db,
            client_id=client_id,
            title=title,
            message=message,
            notification_type="limit_warning",
            metadata={
                "limit_type": limit_type,
                "percentage": percentage,
                "used": used,
                "limit": limit
            },
            send_email=True
        )
    
    async def send_limit_exceeded_notification(
        self,
        db: Session,
        client_id: str,
        limit_type: str,
        used: int,
        limit: int
    ) -> Notification:
        """
        Send a notification about exceeded subscription limits.
        
        Args:
            db: Database session
            client_id: Client ID
            limit_type: Type of limit (e.g., messages, users, storage)
            used: Amount used
            limit: Total limit
            
        Returns:
            Created notification
        """
        # Format limit name for display
        limit_name = {
            "messages": "message",
            "users": "active user",
            "storage": "storage",
            "collections": "knowledge collection"
        }.get(limit_type, limit_type)
        
        title = f"{limit_name.capitalize()} limit exceeded"
        message = (
            f"You've exceeded your monthly {limit_name} limit "
            f"({used} of {limit}). "
            f"Some functionality may be limited until you upgrade your subscription plan."
        )
        
        return await self.send_notification(
            db=db,
            client_id=client_id,
            title=title,
            message=message,
            notification_type="limit_exceeded",
            metadata={
                "limit_type": limit_type,
                "used": used,
                "limit": limit
            },
            send_email=True
        )
    
    async def send_subscription_updated_notification(
        self,
        db: Session,
        client_id: str,
        new_plan: str,
        previous_plan: str
    ) -> Notification:
        """
        Send a notification about subscription plan changes.
        
        Args:
            db: Database session
            client_id: Client ID
            new_plan: New subscription plan
            previous_plan: Previous subscription plan
            
        Returns:
            Created notification
        """
        # Format plan name for display
        plan_display = {
            "free": "Free",
            "basic": "Basic",
            "professional": "Professional",
            "enterprise": "Enterprise"
        }
        
        new_plan_name = plan_display.get(new_plan, new_plan.capitalize())
        prev_plan_name = plan_display.get(previous_plan, previous_plan.capitalize())
        
        title = f"Subscription updated to {new_plan_name} plan"
        message = f"Your subscription has been updated from {prev_plan_name} to {new_plan_name} plan."
        
        return await self.send_notification(
            db=db,
            client_id=client_id,
            title=title,
            message=message,
            notification_type="subscription_updated",
            metadata={
                "new_plan": new_plan,
                "previous_plan": previous_plan
            },
            send_email=True
        )
    
    async def _send_email_notification(
        self,
        client: Client,
        title: str,
        message: str,
        notification_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Send an email notification to a client."""
        if not client.email:
            logger.warning(f"No email address for client {client.client_id}")
            return
        
        # Create email message
        email_message = MIMEMultipart("alternative")
        email_message["Subject"] = f"Customate.ai - {title}"
        email_message["From"] = settings.EMAIL_SENDER
        email_message["To"] = client.email
        
        # Create plain text and HTML versions
        text_content = f"{title}\n\n{message}\n\nCustomate.ai"
        
        # Simple HTML template
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4f46e5; padding: 20px; color: white; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }}
                .button {{ display: inline-block; padding: 10px 20px; background-color: #4f46e5; 
                          color: white; text-decoration: none; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Customate.ai</h1>
                </div>
                <div class="content">
                    <h2>{title}</h2>
                    <p>{message}</p>
                    
                    {self._get_notification_specific_content(notification_type, metadata)}
                    
                    <p>
                        <a href="{settings.DASHBOARD_URL}/subscription" class="button">
                            Manage Subscription
                        </a>
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated message from Customate.ai. Please do not reply to this email.</p>
                    <p>&copy; {datetime.utcnow().year} Customate.ai. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach parts
        email_message.attach(MIMEText(text_content, "plain"))
        email_message.attach(MIMEText(html_content, "html"))
        
        # Send email
        try:
            with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.login(settings.EMAIL_SENDER, settings.EMAIL_PASSWORD)
                server.send_message(email_message)
            
            logger.info(f"Sent email notification to {client.email}")
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise
    
    def _get_notification_specific_content(
        self, 
        notification_type: str, 
        metadata: Optional[Dict[str, Any]]
    ) -> str:
        """Get notification-specific content for email templates."""
        if not metadata:
            return ""
        
        if notification_type == "limit_warning":
            limit_type = metadata.get("limit_type", "")
            percentage = metadata.get("percentage", 0)
            used = metadata.get("used", 0)
            limit = metadata.get("limit", 0)
            
            limit_name = {
                "messages": "Messages",
                "users": "Active Users",
                "storage": "Storage",
                "collections": "Knowledge Collections"
            }.get(limit_type, limit_type.capitalize())
            
            # For storage, format in MB for display
            if limit_type == "storage":
                used_display = f"{used / (1024 * 1024):.2f} MB"
                limit_display = f"{limit / (1024 * 1024):.2f} MB"
            else:
                used_display = str(used)
                limit_display = str(limit)
            
            return f"""
            <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
                <h3>{limit_name} Usage</h3>
                <div style="margin-bottom: 10px;">
                    <div style="width: 100%; background-color: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="width: {min(percentage, 100)}%; background-color: {'#ef4444' if percentage > 90 else '#3b82f6'}; height: 100%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                        <span>0</span>
                        <span>{percentage:.1f}%</span>
                        <span>{limit_display}</span>
                    </div>
                </div>
                <p>Current usage: {used_display} of {limit_display}</p>
            </div>
            """
        
        elif notification_type == "subscription_updated":
            new_plan = metadata.get("new_plan", "")
            previous_plan = metadata.get("previous_plan", "")
            
            plan_display = {
                "free": "Free",
                "basic": "Basic",
                "professional": "Professional",
                "enterprise": "Enterprise"
            }
            
            new_plan_name = plan_display.get(new_plan, new_plan.capitalize())
            prev_plan_name = plan_display.get(previous_plan, previous_plan.capitalize())
            
            return f"""
            <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
                <h3>Subscription Change</h3>
                <p>Your subscription has been changed from <b>{prev_plan_name}</b> to <b>{new_plan_name}</b>.</p>
                <p>Visit your dashboard to view your new limits and features.</p>
            </div>
            """
        
        return ""