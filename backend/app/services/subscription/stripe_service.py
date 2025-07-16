# backend/app/services/subscription/stripe_service.py
import stripe
import logging
import random
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


from app.core.config.settings import settings
from app.domain.client.entities import Client, Subscription
from app.repositories.client_repository import SubscriptionRepository
from app.services.analytics.usage_tracker import UsageTracker

logger = logging.getLogger(__name__)

# Initialize Stripe with API key
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = "2023-10-16"  

PLAN_MAPPING = {
    "free": {
        "monthly": settings.STRIPE_FREE_PLAN_ID,
        "annually": settings.STRIPE_FREE_PLAN_ID
    },
    "basic": {
        "monthly": settings.STRIPE_BASIC_MONTHLY_PLAN_ID,
        "annually": settings.STRIPE_BASIC_ANNUAL_PLAN_ID
    },
    "standard": {
        "monthly": settings.STRIPE_STANDARD_MONTHLY_PLAN_ID,
        "annually": settings.STRIPE_STANDARD_ANNUAL_PLAN_ID
    },
    "professional": {
        "monthly": settings.STRIPE_PROFESSIONAL_MONTHLY_PLAN_ID,
        "annually": settings.STRIPE_PROFESSIONAL_ANNUAL_PLAN_ID
    }
}

PLAN_LIMITS = {
    "free": {
        "message_limit": 100,
        "storage_limit_mb": 0.5,  # 500 KB
        "features": ["basic_chat", "knowledge_integration"]
    },
    "basic": {
        "message_limit": 3000,  
        "storage_limit_mb": 5,  # 5 MB
        "features": ["basic_chat", "knowledge_integration", "analytics"]
    },
    "standard": {
        "message_limit": 10000,  
        "storage_limit_mb": 25,  # 25 MB
        "features": ["basic_chat", "knowledge_integration", "analytics", "integrations"]
    },
    "professional": {
        "message_limit": 40000,  
        "storage_limit_mb": 35,  
        "features": ["advanced_chat", "knowledge_integration", "analytics", "integrations", "priority_support"]
    }
}


class StripeService:
    """Service for managing Stripe subscriptions and payments."""
    
    # Static webhook secret for stripe verification
    WEBHOOK_SECRET = settings.STRIPE_WEBHOOK_SECRET
    
    def __init__(self):
        """Initialize Stripe service."""
        self.subscription_repo = SubscriptionRepository()
        self.usage_tracker = UsageTracker()
    
    async def create_customer(self, client: Client) -> Dict[str, Any]:
        """
        Create a Stripe customer for a client.
        
        Args:
            client: Client entity
            
        Returns:
            Stripe customer object
        """
        try:
            customer = stripe.Customer.create(
                email=client.email,
                name=client.name,
                metadata={
                    "client_id": client.client_id,
                    "created_at": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Created Stripe customer for client {client.client_id}: {customer.id}")
            return customer
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer for {client.client_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create Stripe customer: {str(e)}"
            )
    
    async def create_subscription(
        self, 
        db,
        client: Client, 
        plan_type: str,
        payment_method_id: Optional[str] = None,
        trial_days: int = 0
    ) -> Dict[str, Any]:
        """
        Create a Stripe subscription for a client.
        
        Args:
            db: Database session
            client: Client entity
            plan_type: Subscription plan type
            payment_method_id: Payment method ID for the subscription
            trial_days: Number of trial days (0 for no trial)
            
        Returns:
            Subscription details
        """
        if plan_type not in PLAN_MAPPING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {plan_type}"
            )
        
        try:
            # Check if client has a Stripe customer ID
            stripe_customer_id = await self._ensure_customer_id(client)
            
            # If payment method provided, attach it to the customer
            if payment_method_id and plan_type != "free":
                try:
                    stripe.PaymentMethod.attach(
                        payment_method_id,
                        customer=stripe_customer_id
                    )
                    
                    # Set as default payment method
                    stripe.Customer.modify(
                        stripe_customer_id,
                        invoice_settings={
                            "default_payment_method": payment_method_id
                        }
                    )
                except stripe.error.StripeError as e:
                    logger.error(f"Error attaching payment method: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Payment method error: {str(e)}"
                    )
            
            # For free plans, we don't need to create a Stripe subscription
            if plan_type == "free":
                # Create free plan in our database
                current_time = datetime.utcnow()
                plan_limits = PLAN_LIMITS[plan_type]
                
                subscription = self.subscription_repo.create(db, obj_in={
                    "client_id": client.client_id,
                    "plan_type": "free",
                    "status": "active",
                    "message_limit": plan_limits["message_limit"],
                    "user_limit": plan_limits["user_limit"],
                    "starts_at": current_time,
                    "expires_at": None,  # Free plan doesn't expire
                    "is_trial": False
                })
                
                logger.info(f"Created free subscription for client {client.client_id}")
                
                # Initialize usage counters
                self.usage_tracker.initialize_subscription_usage(db, client.client_id)
                
                return {
                    "subscription_id": subscription.id,
                    "plan_type": "free",
                    "status": "active",
                    "stripe_subscription_id": None,
                    "customer_id": stripe_customer_id
                }
            
            # Create the subscription for paid plans
            subscription_data = {
                "customer": stripe_customer_id,
                "items": [
                    {
                        "price": PLAN_MAPPING[plan_type]["monthly"],  # Default to monthly plan
                    }
                ],
                "metadata": {
                    "client_id": client.client_id,
                    "plan_type": plan_type
                },
                "expand": ["latest_invoice.payment_intent"]
            }
            
            # Add trial period if specified
            if trial_days > 0:
                subscription_data["trial_period_days"] = trial_days
            
            # Create the subscription in Stripe
            stripe_subscription = stripe.Subscription.create(**subscription_data)
            
            # Get limits for the plan
            plan_limits = PLAN_LIMITS[plan_type]
            
            # Create subscription in our database
            current_time = datetime.utcnow()
            expires_at = current_time + timedelta(days=30)  # Default to 30 days
            
            # If subscription has a trial, use trial end as expiry
            if stripe_subscription.trial_end:
                expires_at = datetime.fromtimestamp(stripe_subscription.trial_end)
            # If not a trial but has current period end, use that
            elif stripe_subscription.current_period_end:
                expires_at = datetime.fromtimestamp(stripe_subscription.current_period_end)
            
            # Create subscription in our database
            subscription = self.subscription_repo.create(db, obj_in={
                "client_id": client.client_id,
                "plan_type": plan_type,
                "status": "active",
                "message_limit": plan_limits["message_limit"],
                "user_limit": plan_limits["user_limit"],
                "starts_at": current_time,
                "expires_at": expires_at,
                "payment_id": stripe_subscription.id,
                "stripe_data": {
                    "subscription_id": stripe_subscription.id,
                    "customer_id": stripe_customer_id,
                    "status": stripe_subscription.status
                }
            })
            
            logger.info(f"Created subscription for client {client.client_id}: {stripe_subscription.id}")
            
            # Initialize usage counters
            self.usage_tracker.initialize_subscription_usage(db, client.client_id)
            
            return {
                "subscription_id": subscription.id,
                "plan_type": plan_type,
                "status": "active",
                "stripe_subscription_id": stripe_subscription.id,
                "customer_id": stripe_customer_id,
                "trial_end": stripe_subscription.trial_end,
                "current_period_end": stripe_subscription.current_period_end,
                "requires_action": self._check_if_requires_action(stripe_subscription)
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription for {client.client_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create subscription: {str(e)}"
            )
    
    async def update_subscription(
        self,
        db,
        client: Client,
        new_plan_type: str,
        proration_behavior: str = "create_prorations"
    ) -> Dict[str, Any]:
        """
        Update a client's subscription to a new plan.
        
        Args:
            db: Database session
            client: Client entity
            new_plan_type: New subscription plan type
            proration_behavior: How to handle proration ("create_prorations" or "none")
            
        Returns:
            Updated subscription details
        """
        if new_plan_type not in PLAN_MAPPING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {new_plan_type}"
            )
        
        try:
            # Get active subscription
            active_sub = self.subscription_repo.get_active_subscription(db, client.client_id)
            
            # If no active subscription found, create a free tier subscription first
            if not active_sub:
                logger.info(f"No active subscription found for client {client.client_id}, creating free tier first")
                
                # Create free tier subscription in our database
                plan_limits = PLAN_LIMITS["free"]
                active_sub = self.subscription_repo.create(db, obj_in={
                    "client_id": client.client_id,
                    "plan_type": "free",
                    "status": "active",
                    "message_limit": plan_limits["message_limit"],
                    "user_limit": plan_limits["user_limit"],
                    "starts_at": datetime.utcnow(),
                    "expires_at": None,  # Free plan doesn't expire
                    "is_trial": False
                })
                
                logger.info(f"Created free tier subscription for client {client.client_id}")
                
                # If upgrading to same free plan, just return it
                if new_plan_type == "free":
                    return {
                        "subscription_id": active_sub.id,
                        "plan_type": "free",
                        "status": "active",
                        "message_limit": plan_limits["message_limit"],
                        "user_limit": plan_limits["user_limit"]
                    }
                
                # For non-free plans, proceed to create a new subscription
                if new_plan_type != "free":
                    return await self.create_subscription(db, client, new_plan_type)
            
            # If current plan is free and upgrading to paid plan
            if active_sub.plan_type == "free" and new_plan_type != "free":
                # Create a new Stripe subscription
                return await self.create_subscription(db, client, new_plan_type)
            
            # If downgrading to free plan
            if new_plan_type == "free":
                # If they have a Stripe subscription ID, cancel it
                if active_sub.payment_id:
                    try:
                        stripe.Subscription.delete(active_sub.payment_id)
                    except stripe.error.StripeError as e:
                        logger.error(f"Error cancelling Stripe subscription: {str(e)}")
                
                # Update to free plan in database
                plan_limits = PLAN_LIMITS["free"]
                updated_sub = self.subscription_repo.update(db, db_obj=active_sub, obj_in={
                    "plan_type": "free",
                    "status": "active",
                    "message_limit": plan_limits["message_limit"],
                    "storage_limit_bytes": plan_limits["storage_limit_bytes"],
                    "user_limit": plan_limits["user_limit"],
                    "expires_at": None,  # Free plan doesn't expire
                    "payment_id": None  # Clear Stripe subscription ID
                })
                
                return {
                    "subscription_id": updated_sub.id,
                    "plan_type": "free",
                    "status": "active"
                }
            
            # For paid plan changes
            # Get Stripe subscription ID or create one if it's missing
            stripe_subscription_id = active_sub.payment_id
            if not stripe_subscription_id:
                # No Stripe subscription yet, create one
                return await self.create_subscription(db, client, new_plan_type)
            
            # Update existing Stripe subscription
            try:
                # Fetch the subscription from Stripe
                stripe_subscription = stripe.Subscription.retrieve(stripe_subscription_id)
                
                # Update the subscription items
                stripe.Subscription.modify(
                    stripe_subscription_id,
                    cancel_at_period_end=False,
                    proration_behavior=proration_behavior,
                    items=[{
                        "id": stripe_subscription["items"]["data"][0].id,
                        "price": PLAN_MAPPING[new_plan_type]["monthly"]  # Default to monthly plan
                    }],
                    metadata={
                        "client_id": client.client_id,
                        "plan_type": new_plan_type
                    }
                )
                
                # Get updated subscription details
                updated_stripe_sub = stripe.Subscription.retrieve(stripe_subscription_id)
                
                # Get limits for the new plan
                plan_limits = PLAN_LIMITS[new_plan_type]
                
                # Update our database
                expires_at = datetime.fromtimestamp(updated_stripe_sub.current_period_end)
                
                updated_sub = self.subscription_repo.update(db, db_obj=active_sub, obj_in={
                    "plan_type": new_plan_type,
                    "message_limit": plan_limits["message_limit"],
                    "storage_limit_bytes": plan_limits["storage_limit_bytes"],
                    "user_limit": plan_limits["user_limit"],
                    "expires_at": expires_at
                })
                
                logger.info(f"Updated subscription for client {client.client_id} to {new_plan_type}")
                
                return {
                    "subscription_id": updated_sub.id,
                    "plan_type": new_plan_type,
                    "status": "active",
                    "stripe_subscription_id": stripe_subscription_id,
                    "current_period_end": updated_stripe_sub.current_period_end
                }
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error updating subscription: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to update subscription: {str(e)}"
                )
            
        except Exception as e:
            logger.exception(f"Error updating subscription: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update subscription plan: {str(e)}"
            )
    
    async def cancel_subscription(
        self,
        db,
        client: Client,
        cancel_immediately: bool = False
    ) -> Dict[str, Any]:
        """
        Cancel a client's subscription.
        
        Args:
            db: Database session
            client: Client entity
            cancel_immediately: If True, cancel immediately; otherwise, cancel at period end
            
        Returns:
            Cancellation details
        """
        try:
            # Get active subscription
            active_sub = self.subscription_repo.get_active_subscription(db, client.client_id)
            if not active_sub:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active subscription found"
                )
            
            # Get Stripe subscription ID
            stripe_subscription_id = active_sub.payment_id
            if not stripe_subscription_id:
                # This is a subscription not linked to Stripe, just update our DB
                active_sub.status = "cancelled"
                db.add(active_sub)
                db.commit()
                db.refresh(active_sub)
                
                logger.info(f"Cancelled non-Stripe subscription for client {client.client_id}")
                
                return {
                    "subscription_id": active_sub.id,
                    "status": "cancelled",
                    "cancelled_at": datetime.utcnow().isoformat()
                }
            
            # Cancel in Stripe
            if cancel_immediately:
                # Immediately cancel
                cancelled_subscription = stripe.Subscription.delete(stripe_subscription_id)
            else:
                # Cancel at period end
                cancelled_subscription = stripe.Subscription.modify(
                    stripe_subscription_id,
                    cancel_at_period_end=True
                )
            
            # Update our database
            active_sub.status = "cancelled" if cancel_immediately else "pending_cancellation"
            db.add(active_sub)
            db.commit()
            db.refresh(active_sub)
            
            logger.info(f"Cancelled subscription for client {client.client_id}: {stripe_subscription_id}")
            
            return {
                "subscription_id": active_sub.id,
                "status": active_sub.status,
                "stripe_subscription_id": stripe_subscription_id,
                "cancelled_at": datetime.utcnow().isoformat(),
                "effective_cancellation_date": datetime.fromtimestamp(cancelled_subscription.current_period_end).isoformat() if not cancel_immediately else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling subscription for {client.client_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to cancel subscription: {str(e)}"
            )
    
    async def get_payment_methods(self, client: Client) -> List[Dict[str, Any]]:
        """
        Get a client's saved payment methods.
        
        Args:
            client: Client entity
            
        Returns:
            List of payment methods
        """
        try:
            # Check if client has a Stripe customer ID
            stripe_customer_id = await self._ensure_customer_id(client)
            
            # Get payment methods
            payment_methods = stripe.PaymentMethod.list(
                customer=stripe_customer_id,
                type="card"
            )
            
            # Format the response
            formatted_methods = []
            for method in payment_methods.data:
                card = method.card
                formatted_methods.append({
                    "id": method.id,
                    "type": method.type,
                    "card": {
                        "brand": card.brand,
                        "last4": card.last4,
                        "exp_month": card.exp_month,
                        "exp_year": card.exp_year
                    },
                    "billing_details": method.billing_details,
                    "created": datetime.fromtimestamp(method.created).isoformat()
                })
            
            return formatted_methods
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting payment methods for {client.client_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to get payment methods: {str(e)}"
            )
    
    async def add_payment_method(
        self,
        client: Client,
        payment_method_id: str,
        set_as_default: bool = True
    ) -> Dict[str, Any]:
        """
        Add a payment method for a client.
        
        Args:
            client: Client entity
            payment_method_id: Stripe payment method ID
            set_as_default: Whether to set this payment method as default
            
        Returns:
            Added payment method details
        """
        try:
            # Check if client has a Stripe customer ID
            stripe_customer_id = await self._ensure_customer_id(client)
            
            # Attach the payment method to the customer
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=stripe_customer_id
            )
            
            # Set as default if requested
            if set_as_default:
                stripe.Customer.modify(
                    stripe_customer_id,
                    invoice_settings={
                        "default_payment_method": payment_method_id
                    }
                )
            
            # Format the response
            card = payment_method.card
            return {
                "id": payment_method.id,
                "type": payment_method.type,
                "card": {
                    "brand": card.brand,
                    "last4": card.last4,
                    "exp_month": card.exp_month,
                    "exp_year": card.exp_year
                },
                "billing_details": payment_method.billing_details,
                "created": datetime.fromtimestamp(payment_method.created).isoformat(),
                "is_default": set_as_default
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error adding payment method for {client.client_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to add payment method: {str(e)}"
            )
    
    # backend/app/services/subscription/stripe_service.py
    async def get_subscription_info(self, client: Client, db: Session) -> Dict[str, Any]:
        """
        Get subscription information with real usage data.
        """
        try:
            # Get subscription from database
            subscription = self.subscription_repo.get_active_subscription(db, client.client_id)
            
            # USE REAL MESSAGE COUNT from chat_messages table
            from app.domain.chat.entities import ChatSession, ChatMessage
            from sqlalchemy import func
            from datetime import datetime
            
            current_month = datetime.utcnow().strftime("%Y-%m")
            month_start = f"{current_month}-01"
            
            # Get REAL message count from actual chat_messages
            total_messages = db.query(func.count(ChatMessage.id))\
                .join(ChatSession, ChatSession.session_id == ChatMessage.session_id)\
                .filter(
                    ChatSession.client_id == client.client_id,
                    ChatMessage.role == 'assistant',
                    ChatMessage.created_at >= month_start
                ).scalar() or 0
            
            # Get storage usage (this part is already working)
            from app.repositories.knowledge_repository import DocumentSourceRepository
            docs_repo = DocumentSourceRepository()
            storage_bytes = 0
            
            try:
                stats = docs_repo.get_document_statistics(db, client.client_id)
                storage_bytes = stats.get("total_size_bytes", 0)
            except Exception as e:
                logger.error(f"Error getting storage statistics: {str(e)}")
            
            # Set plan limits based on subscription
            plan_type = subscription.plan_type if subscription else "free"
            
            if plan_type == "free":
                message_limit = 100
                storage_limit = 512 * 1024  # 512 KB
            elif plan_type == "basic":
                message_limit = 5000
                storage_limit = 500 * 1024 * 1024  # 500 MB
            elif plan_type == "professional":
                message_limit = 20000
                storage_limit = 2 * 1024 * 1024 * 1024  # 2 GB
            else:
                message_limit = 100000
                storage_limit = 10 * 1024 * 1024 * 1024  # 10 GB
            
            # Calculate percentages
            message_percentage = (total_messages / message_limit) * 100 if message_limit > 0 else 0
            storage_percentage = (storage_bytes / storage_limit) * 100 if storage_limit > 0 else 0
            
            # Return subscription info with REAL usage data
            return {
                "subscription_id": subscription.id if subscription else None,
                "plan_type": plan_type,
                "status": subscription.status if subscription else "active",
                "start_date": subscription.starts_at.isoformat() if subscription and subscription.starts_at else None,
                "end_date": subscription.expires_at.isoformat() if subscription and subscription.expires_at else None,
                "usage": {
                    "messages": {
                        "used": total_messages,  # REAL count from database
                        "limit": message_limit,
                        "percentage": min(100, message_percentage)
                    },
                    "storage": {
                        "used_bytes": storage_bytes,
                        "limit_bytes": storage_limit,
                        "percentage": min(100, storage_percentage)
                    }
                }
            }
            
        except Exception as e:
            logger.exception(f"Error getting subscription info: {str(e)}")
            # Return default free plan data
            return {
                "subscription_id": None,
                "plan_type": "free",
                "status": "active",
                "start_date": None,
                "end_date": None,
                "usage": {
                    "messages": {
                        "used": 0,
                        "limit": 100,
                        "percentage": 0
                    },
                    "storage": {
                        "used_bytes": 0,
                        "limit_bytes": 512 * 1024,
                        "percentage": 0
                    }
                }
            }                
    async def get_invoices(self, client: Client, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get a client's invoices.
        
        Args:
            client: Client entity
            limit: Maximum number of invoices to retrieve
            
        Returns:
            List of invoices
        """
        try:
            # Check if client has a Stripe customer ID
            stripe_customer_id = await self._ensure_customer_id(client)
            
            # Get invoices
            invoices = stripe.Invoice.list(
                customer=stripe_customer_id,
                limit=limit
            )
            
            # Format the response
            formatted_invoices = []
            for invoice in invoices.data:
                formatted_invoices.append({
                    "id": invoice.id,
                    "number": invoice.number,
                    "amount_due": invoice.amount_due / 100,  # Convert from cents to dollars
                    "amount_paid": invoice.amount_paid / 100,
                    "currency": invoice.currency,
                    "status": invoice.status,
                    "created": datetime.fromtimestamp(invoice.created).isoformat(),
                    "period_start": datetime.fromtimestamp(invoice.period_start).isoformat(),
                    "period_end": datetime.fromtimestamp(invoice.period_end).isoformat(),
                    "pdf_url": invoice.invoice_pdf
                })
            
            return formatted_invoices
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting invoices for {client.client_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to get invoices: {str(e)}"
            )
    
    async def create_checkout_session(
        self, 
        client: Client, 
        plan_type: str, 
        billing_cycle: str = "monthly",
        success_url: str = None, 
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """
        Create checkout session - handle currency conflicts by using fresh customers.
        """
        try:
            price_id = PLAN_MAPPING[plan_type][billing_cycle]
            
            # ✅ WORKING SOLUTION: Always create fresh checkout without customer conflicts
            checkout_session = stripe.checkout.Session.create(
                # Don't specify customer - let Stripe handle customer creation
                customer_email=client.email,  # Pre-fill email
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                
                # Essential features
                automatic_tax={'enabled': True},
                tax_id_collection={'enabled': True},
                billing_address_collection='required',
                
                success_url=success_url or f"{settings.FRONTEND_URL}/subscription?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=cancel_url or f"{settings.FRONTEND_URL}/subscription?cancelled=true",
                
                # Critical: Pass client info in metadata
                metadata={
                    "client_id": client.client_id,
                    "plan_type": plan_type,
                    "billing_cycle": billing_cycle,
                    "original_email": client.email
                }
            )
            
            return {
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create checkout session: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create checkout session: {str(e)}"
            )
            
    async def handle_checkout_completed(self, session_data: Dict[str, Any], db) -> Dict[str, Any]:
        """
        Handle successful checkout and consolidate customer accounts.
        """
        try:
            metadata = session_data.get("metadata", {})
            client_id = metadata.get("client_id")
            original_email = metadata.get("original_email")
            
            if not client_id:
                logger.warning("No client_id in checkout session metadata")
                return {}
            
            # Get the new subscription created by checkout
            new_customer_id = session_data.get("customer")
            new_subscription_id = session_data.get("subscription")
            
            if not new_customer_id or not new_subscription_id:
                logger.error("Missing customer or subscription from checkout session")
                return {}
            
            # ✅ Cancel old subscriptions from any previous customers
            await self._cancel_old_subscriptions_for_client(client_id, original_email)
            
            # Update our database with new subscription info
            subscription_repo = SubscriptionRepository()
            
            # Check if we already have a subscription record for this client
            existing_sub = subscription_repo.get_active_subscription(db, client_id)
            
            if existing_sub:
                # Update existing record
                subscription_repo.update(db, db_obj=existing_sub, obj_in={
                    "payment_id": new_subscription_id,
                    "plan_type": metadata.get("plan_type"),
                    "status": "active",
                    "stripe_data": {
                        "subscription_id": new_subscription_id,
                        "customer_id": new_customer_id
                    }
                })
            else:
                # Create new subscription record
                plan_limits = PLAN_LIMITS[metadata.get("plan_type", "basic")]
                subscription_repo.create(db, obj_in={
                    "client_id": client_id,
                    "plan_type": metadata.get("plan_type"),
                    "status": "active",
                    "payment_id": new_subscription_id,
                    "message_limit": plan_limits["message_limit"],
                    "storage_limit_bytes": plan_limits["storage_limit_bytes"],
                    "starts_at": datetime.utcnow(),
                    "stripe_data": {
                        "subscription_id": new_subscription_id,
                        "customer_id": new_customer_id
                    }
                })
            
            logger.info(f"Successfully consolidated subscription for client {client_id}")
            return {"status": "success", "client_id": client_id}
            
        except Exception as e:
            logger.error(f"Error handling checkout completion: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _cancel_old_subscriptions_for_client(self, client_id: str, email: str):
        """Cancel any existing subscriptions for this client."""
        try:
            # Find customers by email
            customers = stripe.Customer.list(email=email, limit=10)
            
            for customer in customers.data:
                # Get active subscriptions for this customer
                subscriptions = stripe.Subscription.list(
                    customer=customer.id,
                    status='active'
                )
                
                for subscription in subscriptions.data:
                    # Cancel with proration
                    stripe.Subscription.delete(subscription.id, prorate=True)
                    logger.info(f"Cancelled old subscription {subscription.id} for client {client_id}")
                    
        except Exception as e:
            logger.error(f"Error cancelling old subscriptions for {client_id}: {str(e)}")            
            
    async def create_billing_portal_session(
        self,
        client: Client,
        return_url: str
    ) -> Dict[str, Any]:
        """
        Create a billing portal session for subscription management.
        
        Args:
            client: Client entity
            return_url: URL to return to after billing portal
            
        Returns:
            Billing portal session details
        """
        try:
            # Check if client has a Stripe customer ID
            stripe_customer_id = await self._ensure_customer_id(client)
            
            # Create the billing portal session
            portal_session = stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url=return_url
            )
            
            return {
                "portal_url": portal_session.url
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating billing portal for {client.client_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create billing portal: {str(e)}"
            )
    
    async def get_recommended_plan(self, db, client: Client) -> Dict[str, Any]:
        """
        Get a recommended plan based on client's usage patterns.
        
        Args:
            db: Database session
            client: Client entity
            
        Returns:
            Recommended plan details
        """
        # Get current subscription
        current_sub = self.subscription_repo.get_active_subscription(db, client.client_id)
        current_plan = current_sub.plan_type if current_sub else "free"
        
        # Get usage data
        usage_data = self.usage_tracker.check_subscription_limits(db, client.client_id)
        
        # Initialize with current plan
        recommended_plan = current_plan
        recommendation_reason = "Your current plan meets your needs."
        
        # Check message usage percentage
        message_percentage = usage_data.get("current", {}).get("messages", {}).get("percentage", 0)
        user_percentage = usage_data.get("current", {}).get("users", {}).get("percentage", 0)
        storage_percentage = usage_data.get("current", {}).get("storage", {}).get("percentage", 0)
        
        # Determine if upgrade needed
        # If usage consistently over 80% of any limit, suggest an upgrade
        if message_percentage > 80 or user_percentage > 80 or storage_percentage > 80:
            # Logic to determine which plan to recommend
            if current_plan == "free":
                recommended_plan = "basic"
                if message_percentage > user_percentage and message_percentage > storage_percentage:
                    recommendation_reason = f"You're using {message_percentage:.1f}% of your message limit. Upgrading will give you 10x more messages."
                elif user_percentage > message_percentage and user_percentage > storage_percentage:
                    recommendation_reason = f"You're using {user_percentage:.1f}% of your user limit. Upgrading will give you 5x more users."
                else:
                    recommendation_reason = f"You're using {storage_percentage:.1f}% of your storage limit. Upgrading will give you 10x more storage."
            elif current_plan == "basic":
                recommended_plan = "professional"
                if message_percentage > user_percentage and message_percentage > storage_percentage:
                    recommendation_reason = f"You're using {message_percentage:.1f}% of your message limit. Upgrading will give you 4x more messages."
                elif user_percentage > message_percentage and user_percentage > storage_percentage:
                    recommendation_reason = f"You're using {user_percentage:.1f}% of your user limit. Upgrading will give you 4x more users."
                else:
                    recommendation_reason = f"You're using {storage_percentage:.1f}% of your storage limit. Upgrading will give you 4x more storage."
            elif current_plan == "professional":
                recommended_plan = "enterprise"
                if message_percentage > user_percentage and message_percentage > storage_percentage:
                    recommendation_reason = f"You're using {message_percentage:.1f}% of your message limit. Upgrading will give you 5x more messages."
                elif user_percentage > message_percentage and user_percentage > storage_percentage:
                    recommendation_reason = f"You're using {user_percentage:.1f}% of your user limit. Upgrading will give you 5x more users."
                else:
                    recommendation_reason = f"You're using {storage_percentage:.1f}% of your storage limit. Upgrading will give you 5x more storage."
        
        # Check if downgrade might be appropriate (usage less than 20% for 3 consecutive months)
        elif message_percentage < 20 and user_percentage < 20 and storage_percentage < 20:
            # Check historical data for consistent low usage
            # Simplified for now, in real implementation would check multiple months
            if current_plan == "enterprise":
                recommended_plan = "professional"
                recommendation_reason = "Your usage is consistently below 20% of limits. You could save money by downgrading to Professional plan."
            elif current_plan == "professional":
                recommended_plan = "basic"
                recommendation_reason = "Your usage is consistently below 20% of limits. You could save money by downgrading to Basic plan."
            elif current_plan == "basic":
                # Only recommend downgrade to free if they're using very little
                if message_percentage < 10 and user_percentage < 10 and storage_percentage < 10:
                    recommended_plan = "free"
                    recommendation_reason = "Your usage is very low. You could switch to the Free plan."
        
        return {
            "current_plan": current_plan,
            "recommended_plan": recommended_plan,
            "recommendation_reason": recommendation_reason,
            "current_limits": PLAN_LIMITS.get(current_plan, {}),
            "recommended_limits": PLAN_LIMITS.get(recommended_plan, {}),
            "usage_data": usage_data
        }
    
    async def _ensure_customer_id(self, client: Client) -> str:
        """
        Ensure client has a Stripe customer ID, creating one if not.
        
        Args:
            client: Client entity
            
        Returns:
            Stripe customer ID
        """
        # Check if client has a Stripe customer ID stored in metadata or a related table
        # This is a simplified version; in a real implementation, you'd store this in the database
        
        # For this example, let's search for an existing customer by email
        customers = stripe.Customer.list(email=client.email, limit=1)
        
        if customers and customers.data:
            return customers.data[0].id
        
        # Create a new customer if none exists
        customer = await self.create_customer(client)
        return customer["id"]
    
    def _check_if_requires_action(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check if a subscription requires additional action for payment.
        
        Args:
            subscription: Stripe subscription object
            
        Returns:
            Action details if required, None otherwise
        """
        if (
            hasattr(subscription, "latest_invoice") and
            subscription.latest_invoice and
            hasattr(subscription.latest_invoice, "payment_intent") and
            subscription.latest_invoice.payment_intent
        ):
            pi = subscription.latest_invoice.payment_intent
            
            if pi.status == "requires_action":
                return {
                    "requires_action": True,
                    "payment_intent_client_secret": pi.client_secret
                }
        
        return None
    
    async def handle_webhook_event(self, event_data: Dict[str, Any], db) -> Dict[str, Any]:
        """
        Handle a webhook event from Stripe.
        
        Args:
            event_data: Webhook event data
            db: Database session
            
        Returns:
            Processing result
        """
        try:
            event_type = event_data["type"]
            event_object = event_data["data"]["object"]
            
            logger.info(f"Processing Stripe webhook: {event_type}")
            
            # Handle subscription events
            if event_type == "customer.subscription.created":
                await self._handle_subscription_created(event_object, db)
            elif event_type == "customer.subscription.updated":
                await self._handle_subscription_updated(event_object, db)
            elif event_type == "customer.subscription.deleted":
                await self._handle_subscription_deleted(event_object, db)
            # Handle invoice events
            elif event_type == "invoice.payment_succeeded":
                await self._handle_payment_succeeded(event_object, db)
            elif event_type == "invoice.payment_failed":
                await self._handle_payment_failed(event_object, db)
            
            return {"status": "success", "event_type": event_type}
            
        except Exception as e:
            logger.error(f"Error handling webhook event: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error handling webhook event: {str(e)}"
            )
    
    async def _handle_subscription_created(self, subscription_data: Dict[str, Any], db) -> None:
        """Handle subscription.created webhook event."""
        # Get client_id from metadata
        client_id = subscription_data.get("metadata", {}).get("client_id")
        if not client_id:
            logger.warning("No client_id in subscription metadata")
            return
        
        # Get existing subscription from our DB
        existing_sub = self.subscription_repo.get_active_subscription(db, client_id)
        
        # If we already have this subscription, just update it
        if existing_sub and existing_sub.payment_id == subscription_data["id"]:
            logger.info(f"Subscription already exists for {client_id}")
            return
        
        # Otherwise, create a new subscription
        plan_type = subscription_data.get("metadata", {}).get("plan_type", "basic")
        plan_limits = PLAN_LIMITS[plan_type]
        
        # Create new subscription in our database
        current_time = datetime.utcnow()
        expires_at = current_time + timedelta(days=30)  # Default
        
        # Use Stripe data if available
        if subscription_data.get("current_period_end"):
            expires_at = datetime.fromtimestamp(subscription_data["current_period_end"])
        
        # Create or update subscription
        if existing_sub:
            # Update existing subscription
            self.subscription_repo.update(db, db_obj=existing_sub, obj_in={
                "plan_type": plan_type,
                "status": "active",
                "message_limit": plan_limits["message_limit"],
                "storage_limit_bytes": plan_limits["storage_limit_bytes"],
                "user_limit": plan_limits["user_limit"],
                "payment_id": subscription_data["id"],
                "expires_at": expires_at
            })
        else:
            # Create new subscription
            self.subscription_repo.create(db, obj_in={
                "client_id": client_id,
                "plan_type": plan_type,
                "status": "active",
                "message_limit": plan_limits["message_limit"],
                "user_limit": plan_limits["user_limit"],
                "starts_at": current_time,
                "expires_at": expires_at,
                "payment_id": subscription_data["id"]
            })
        
        logger.info(f"Created subscription for client {client_id} from webhook")
    
    async def _handle_subscription_updated(self, subscription_data: Dict[str, Any], db) -> None:
        """Handle subscription.updated webhook event."""
        # Get client_id from metadata
        client_id = subscription_data.get("metadata", {}).get("client_id")
        if not client_id:
            logger.warning("No client_id in subscription metadata")
            return
        
        # Get existing subscription from our DB
        existing_sub = self.subscription_repo.get_by_payment_id(db, subscription_data["id"])
        if not existing_sub:
            logger.warning(f"No subscription found for Stripe subscription ID: {subscription_data['id']}")
            return
        
        # Get plan type from metadata or use existing
        plan_type = subscription_data.get("metadata", {}).get("plan_type", existing_sub.plan_type)
        plan_limits = PLAN_LIMITS[plan_type]
        
        # Update status based on Stripe status
        stripe_status = subscription_data["status"]
        status_mapping = {
            "active": "active",
            "past_due": "past_due",
            "unpaid": "unpaid",
            "canceled": "cancelled",
            "incomplete": "pending",
            "incomplete_expired": "failed",
            "trialing": "active"
        }
        status = status_mapping.get(stripe_status, existing_sub.status)
        
        # Update subscription in our DB
        expires_at = existing_sub.expires_at
        if subscription_data.get("current_period_end"):
            expires_at = datetime.fromtimestamp(subscription_data["current_period_end"])
        
        self.subscription_repo.update(db, db_obj=existing_sub, obj_in={
            "plan_type": plan_type,
            "status": status,
            "message_limit": plan_limits["message_limit"],
            "storage_limit_bytes": plan_limits["storage_limit_bytes"],
            "user_limit": plan_limits["user_limit"],
            "expires_at": expires_at
        })
        
        logger.info(f"Updated subscription for client {client_id} from webhook")
    
    async def _handle_subscription_deleted(self, subscription_data: Dict[str, Any], db) -> None:
        """Handle subscription.deleted webhook event."""
        # Get existing subscription from our DB by Stripe ID
        existing_sub = self.subscription_repo.get_by_payment_id(db, subscription_data["id"])
        if not existing_sub:
            logger.warning(f"No subscription found for Stripe subscription ID: {subscription_data['id']}")
            return
        
        # Update subscription in our DB
        self.subscription_repo.update(db, db_obj=existing_sub, obj_in={
            "status": "cancelled"
        })
        
        logger.info(f"Marked subscription as cancelled for client {existing_sub.client_id} from webhook")
    
    async def _handle_payment_succeeded(self, invoice_data: Dict[str, Any], db) -> None:
        """Handle invoice.payment_succeeded webhook event."""
        # Get subscription ID from invoice
        subscription_id = invoice_data.get("subscription")
        if not subscription_id:
            logger.info("Invoice not related to a subscription")
            return
        
        # Get existing subscription from our DB
        existing_sub = self.subscription_repo.get_by_payment_id(db, subscription_id)
        if not existing_sub:
            logger.warning(f"No subscription found for Stripe subscription ID: {subscription_id}")
            return
        
        # Update subscription in our DB if needed
        if existing_sub.status != "active":
            self.subscription_repo.update(db, db_obj=existing_sub, obj_in={
                "status": "active"
            })
        
        # If this payment extends the subscription period, update expires_at
        if invoice_data.get("period_end"):
            new_period_end = datetime.fromtimestamp(invoice_data["period_end"])
            if new_period_end > existing_sub.expires_at:
                self.subscription_repo.update(db, db_obj=existing_sub, obj_in={
                    "expires_at": new_period_end
                })
        
        logger.info(f"Payment succeeded for client {existing_sub.client_id}")
    
    async def _handle_payment_failed(self, invoice_data: Dict[str, Any], db) -> None:
        """Handle invoice.payment_failed webhook event."""
        # Get subscription ID from invoice
        subscription_id = invoice_data.get("subscription")
        if not subscription_id:
            logger.info("Invoice not related to a subscription")
            return
        
        # Get existing subscription from our DB
        existing_sub = self.subscription_repo.get_by_payment_id(db, subscription_id)
        if not existing_sub:
            logger.warning(f"No subscription found for Stripe subscription ID: {subscription_id}")
            return
        
        # Update subscription status in our DB
        self.subscription_repo.update(db, db_obj=existing_sub, obj_in={
            "status": "past_due"
        })
        
        logger.info(f"Payment failed for client {existing_sub.client_id}")
        


    async def get_admin_revenue_report(self, period: str = "month") -> Dict[str, Any]:
        """
        Get revenue report for the admin dashboard.
        
        Args:
            period: The time period for aggregation (day, week, month, year)
            
        Returns:
            Dict containing revenue data and statistics
        """
        try:
            # Set up date range based on period
            end_date = datetime.utcnow()
            
            if period == "day":
                start_date = end_date - timedelta(days=1)
                interval = "hour"
            elif period == "week":
                start_date = end_date - timedelta(days=7)
                interval = "day"
            elif period == "month":
                start_date = end_date - timedelta(days=30)
                interval = "day"
            elif period == "year":
                start_date = end_date - timedelta(days=365)
                interval = "month"
            else:
                # Default to month
                start_date = end_date - timedelta(days=30)
                interval = "day"
            
            # Convert to Unix timestamps for Stripe API
            start_timestamp = int(start_date.timestamp())
            end_timestamp = int(end_date.timestamp())
            
            # Use subscription data to estimate revenue
            sub_repo = SubscriptionRepository()
            revenue_data = sub_repo.get_revenue_data(db=None, days=30)  # We'll handle the missing db parameter
            
            # Get subscription statistics
            subscription_counts = sub_repo.count_by_plan_type(db=None)  # We'll handle the missing db parameter
            
            # Generate mock time series data for now
            time_series = []
            if interval == "day":
                days = int((end_timestamp - start_timestamp) / 86400) + 1
                for i in range(days):
                    day_start = start_timestamp + (i * 86400)
                    time_series.append({
                        "timestamp": day_start,
                        "date": datetime.fromtimestamp(day_start).strftime("%Y-%m-%d"),
                        "amount": revenue_data["total_day"] * (0.8 + 0.4 * random.random())  # Randomize a bit
                    })
            
            return {
                "time_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "period": period
                },
                "total_revenue": revenue_data["total_month"],
                "transaction_count": subscription_counts.get("total", sum(subscription_counts.values())),
                "revenue_by_currency": {"USD": revenue_data["total_month"]},
                "revenue_by_plan": {
                    "basic": subscription_counts.get("basic", 0) * 29,
                    "professional": subscription_counts.get("professional", 0) * 99,
                    "enterprise": subscription_counts.get("enterprise", 0) * 299,
                    "other": 0
                },
                "time_series": time_series,
                "subscriptions": {
                    "counts": subscription_counts,
                    "mrr": revenue_data["total_mrr"]
                }
            }
        
        except Exception as e:
            logger.exception(f"Error generating admin revenue report: {str(e)}")
            return {
                "error": f"Failed to generate revenue report: {str(e)}",
                "time_period": {
                    "period": period
                }
            }        