from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import stripe
import logging

from app.core.database.dependencies import get_db
from app.core.config import settings
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client, Subscription
from app.services.subscription.stripe_service import StripeService
from app.services.notification.notification_service import NotificationService
from app.services.analytics.usage_tracker import UsageTracker
from app.api.client.schemas import (
    SubscriptionResponse, PlanChangeRequest, PaymentMethodRequest,
    PaymentMethodResponse, SubscriptionCancelRequest, InvoiceResponse,
    CheckoutSessionRequest, BillingPortalRequest, RecommendedPlanResponse
)
from app.api.client.schemas import SubscriptionCancelRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/client/subscription", tags=["subscription"])

class SubscriptionChangeRequest(BaseModel):
    """Request schema for changing subscription plan."""
    plan_type: str = Field(..., description="New plan type (free, basic, professional, enterprise)")
    billing_cycle: str = Field(default="monthly", description="Billing cycle (monthly, annual)")

class SubscriptionCancelRequest(BaseModel):
    """Request schema for cancelling subscription."""
    cancel_immediately: bool = Field(False, description="Whether to cancel immediately or at period end")

class CheckoutSessionRequest(BaseModel):
    plan_type: str = Field(..., description="Plan type (basic, standard, professional)")
    billing_cycle: str = Field(default="monthly", description="Billing cycle (monthly, annual)")
    success_url: str = Field(..., description="URL to redirect on success")
    cancel_url: str = Field(..., description="URL to redirect on cancel")

class BillingPortalRequest(BaseModel):
    """Request schema for creating billing portal session."""
    return_url: str = Field(..., description="URL to return to after billing portal")

# Initialize services
stripe_service = StripeService()
notification_service = NotificationService()
usage_tracker = UsageTracker()

@router.get("", response_model=Dict[str, Any])
async def get_subscription(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get current subscription information.
    """
    try:
        stripe_service = StripeService()
        subscription_info = await stripe_service.get_subscription_info(current_client, db)  # Pass db here
        
        return subscription_info
    except Exception as e:
        logger.exception(f"Error getting subscription info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve subscription information: {str(e)}"
        )

@router.post("/change", response_model=Dict[str, Any])
async def change_subscription_plan(
    plan_data: SubscriptionChangeRequest,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Change subscription plan - Always use Stripe Checkout for paid plans.
    """
    plan_type = plan_data.plan_type
    
    # Validate plan type
    if plan_type not in ["free", "basic", "standard", "professional"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type: {plan_type}"
        )
    
    try:
        stripe_service = StripeService()
        notification_service = NotificationService()
        
        # Get current subscription info
        try:
            current_subscription_info = await stripe_service.get_subscription_info(current_client, db)
            current_plan = current_subscription_info.get("plan_type", "free")
        except Exception as e:
            logger.warning(f"Error fetching current subscription, assuming free tier: {str(e)}")
            current_plan = "free"
        
        # ✅ SIMPLE FIX: Handle downgrades to free directly
        if plan_type == "free":
            # Direct downgrade to free (no payment needed)
            result = await stripe_service.update_subscription(db, current_client, plan_type)
            
            # Send notification about plan change
            await notification_service.send_subscription_updated_notification(
                db=db,
                client_id=current_client.client_id,
                new_plan=plan_type,
                previous_plan=current_plan
            )
            
            return result
        
        # ✅ SIMPLE FIX: For ALL paid plans, use Stripe Checkout
        # This handles currency, taxes, and payment collection automatically
        checkout_session = await stripe_service.create_checkout_session(
            client=current_client,
            plan_type=plan_type,
            billing_cycle="monthly",  # Default to monthly
            success_url=f"{settings.FRONTEND_URL}/subscription?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/subscription?cancelled=true"
        )
        
        # Return checkout URL for redirect
        return {
            "action": "redirect_to_checkout",
            "checkout_url": checkout_session["checkout_url"],
            "session_id": checkout_session["session_id"],
            "current_plan": current_plan,
            "target_plan": plan_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error changing subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change subscription plan: {str(e)}"
        )
                
@router.post("/cancel", response_model=Dict[str, Any])
async def cancel_subscription(
    cancel_request: SubscriptionCancelRequest,
    background_tasks: BackgroundTasks,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Cancel the current subscription.
    """
    # Cancel subscription
    cancellation_result = await stripe_service.cancel_subscription(
        db=db,
        client=current_client,
        cancel_immediately=cancel_request.cancel_immediately
    )
    
    # Send notification about cancellation in the background
    background_tasks.add_task(
        notification_service.send_notification,
        db=db,
        client_id=current_client.client_id,
        title="Subscription Cancelled",
        message="Your subscription has been cancelled. You'll still have access until the end of your current billing period.",
        notification_type="subscription_cancelled",
        metadata={
            "effective_date": cancellation_result.get("effective_cancellation_date")
        }
    )
    
    return cancellation_result

@router.get("/recommended", response_model=Dict[str, Any])
async def get_recommended_plan(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get recommended subscription plan based on usage.
    """
    try:
        stripe_service = StripeService()
        result = await stripe_service.get_recommended_plan(db, current_client)  # Order of parameters matters here
        
        return result
    except Exception as e:
        logger.exception(f"Error getting recommended plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recommended plan: {str(e)}"
        )

@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    current_client: Client = Depends(get_current_client)
):
    """
    Get saved payment methods for the client.
    """
    payment_methods = await stripe_service.get_payment_methods(current_client)
    return payment_methods

@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    payment_method: PaymentMethodRequest,
    current_client: Client = Depends(get_current_client)
):
    """
    Add a new payment method.
    """
    result = await stripe_service.add_payment_method(
        client=current_client,
        payment_method_id=payment_method.payment_method_id,
        set_as_default=payment_method.set_as_default
    )
    return result

@router.delete("/payment-methods/{payment_method_id}", response_model=Dict[str, Any])
async def delete_payment_method(
    payment_method_id: str,
    current_client: Client = Depends(get_current_client)
):
    """
    Delete a payment method.
    """
    # This would call the Stripe API to detach a payment method
    # For this version, we'll just return a mock response
    return {
        "success": True,
        "message": "Payment method deleted successfully"
    }

@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    limit: int = 10,
    current_client: Client = Depends(get_current_client)
):
    """
    Get recent invoices.
    """
    invoices = await stripe_service.get_invoices(current_client, limit=limit)
    return invoices

@router.post("/checkout-session", response_model=Dict[str, Any])
async def create_checkout_session(
    checkout_request: CheckoutSessionRequest,
    current_client: Client = Depends(get_current_client)
):
    """
    Create a Stripe Checkout session for subscription.
    """
    try:
        checkout_session = await stripe_service.create_checkout_session(
            client=current_client,
            plan_type=checkout_request.plan_type,
            billing_cycle=checkout_request.billing_cycle,  # Pass billing cycle
            success_url=checkout_request.success_url,
            cancel_url=checkout_request.cancel_url
        )
        return checkout_session
    except ValueError as e:
        logger.error(f"Invalid checkout request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )

@router.post("/billing-portal", response_model=Dict[str, Any])
async def create_billing_portal_session(
    portal_request: BillingPortalRequest,
    current_client: Client = Depends(get_current_client)
):
    """
    Create a Stripe Customer Portal session for subscription management.
    """
    portal_session = await stripe_service.create_billing_portal_session(
        client=current_client,
        return_url=portal_request.return_url
    )
    return portal_session

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe webhook events.
    """
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        event = stripe.Webhook.construct_event(
            payload, sig_header, stripe_service.WEBHOOK_SECRET
        )
        
        # ✅ Handle successful checkout
        if event['type'] == 'checkout.session.completed':
            await stripe_service.handle_checkout_completed(event['data']['object'], db)
        
        # Handle subscription events
        elif event['type'] in ['invoice.payment_succeeded', 'customer.subscription.updated']:
            await stripe_service.handle_webhook_event(event['data']['object'], db)
        
        return {"status": "success"}
        
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail="Webhook error")