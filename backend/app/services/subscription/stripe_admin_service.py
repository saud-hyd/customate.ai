# backend/app/services/subscription/stripe_admin_service.py
import stripe
import logging
import os
import random  # Added for generating random data
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.subscription.stripe_service import StripeService
from app.repositories.client_repository import ClientRepository, SubscriptionRepository

logger = logging.getLogger(__name__)

class StripeAdminService(StripeService):
    """
    Extended Stripe service with admin-specific functionality.
    """
    
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
            
            # Get revenue data from Stripe
            revenue_data = await self._get_revenue_data(start_timestamp, end_timestamp, interval)
            
            # Get subscription statistics
            subscription_stats = await self._get_subscription_stats()
            
            return {
                "time_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "period": period
                },
                "revenue": revenue_data,
                "subscriptions": subscription_stats
            }
        
        except Exception as e:
            logger.exception(f"Error generating admin revenue report: {str(e)}")
            return {
                "error": f"Failed to generate revenue report: {str(e)}",
                "time_period": {
                    "period": period
                }
            }
    
    async def _get_revenue_data(self, start_timestamp: int, end_timestamp: int, interval: str) -> Dict[str, Any]:
        """
        Get detailed revenue data from Stripe.
        
        Args:
            start_timestamp: Start timestamp in Unix format
            end_timestamp: End timestamp in Unix format
            interval: Aggregation interval (hour, day, month)
            
        Returns:
            Dict containing revenue data
        """
        try:
            # Initialize Stripe
            stripe.api_key = self.STRIPE_API_KEY
            
            # Get all successful charges in the period
            charges = stripe.Charge.list(
                created={
                    "gte": start_timestamp,
                    "lte": end_timestamp
                },
                status="succeeded",
                limit=100  # Adjust as needed
            )
            
            # Get all invoices in the period
            invoices = stripe.Invoice.list(
                created={
                    "gte": start_timestamp,
                    "lte": end_timestamp
                },
                status="paid",
                limit=100  # Adjust as needed
            )
            
            # Calculate revenue by currency
            revenue_by_currency = {}
            for charge in charges.auto_paging_iter():
                currency = charge.currency.upper()
                amount = charge.amount / 100  # Convert from cents
                
                if currency not in revenue_by_currency:
                    revenue_by_currency[currency] = 0
                
                revenue_by_currency[currency] += amount
            
            # Calculate revenue by plan type
            revenue_by_plan = {
                "basic": 0,
                "professional": 0,
                "enterprise": 0,
                "other": 0
            }
            
            for invoice in invoices.auto_paging_iter():
                # Try to determine plan type from the invoice
                plan_type = "other"
                
                if invoice.lines.data:
                    for line in invoice.lines.data:
                        if "plan" in line and line.plan:
                            plan_id = line.plan.id
                            if "basic" in plan_id:
                                plan_type = "basic"
                            elif "professional" in plan_id or "pro" in plan_id:
                                plan_type = "professional"
                            elif "enterprise" in plan_id:
                                plan_type = "enterprise"
                
                # Add to revenue by plan
                amount = invoice.amount_paid / 100  # Convert from cents
                revenue_by_plan[plan_type] += amount
            
            # Calculate time series data
            time_series = []
            if interval == "hour":
                # Group by hour
                hours = int((end_timestamp - start_timestamp) / 3600) + 1
                for i in range(hours):
                    hour_start = start_timestamp + (i * 3600)
                    hour_end = hour_start + 3600
                    
                    hour_charges = [
                        c for c in charges.data 
                        if c.created >= hour_start and c.created < hour_end
                    ]
                    
                    hour_total = sum(c.amount for c in hour_charges) / 100
                    
                    time_series.append({
                        "timestamp": hour_start,
                        "date": datetime.fromtimestamp(hour_start).isoformat(),
                        "amount": hour_total
                    })
            
            elif interval == "day":
                # Group by day
                days = int((end_timestamp - start_timestamp) / 86400) + 1
                for i in range(days):
                    day_start = start_timestamp + (i * 86400)
                    day_end = day_start + 86400
                    
                    day_charges = [
                        c for c in charges.data 
                        if c.created >= day_start and c.created < day_end
                    ]
                    
                    day_total = sum(c.amount for c in day_charges) / 100
                    
                    time_series.append({
                        "timestamp": day_start,
                        "date": datetime.fromtimestamp(day_start).strftime("%Y-%m-%d"),
                        "amount": day_total
                    })
            
            elif interval == "month":
                # This is simplified - a proper implementation would handle month boundaries
                months = int((end_timestamp - start_timestamp) / (30 * 86400)) + 1
                for i in range(months):
                    month_start = start_timestamp + (i * 30 * 86400)
                    month_end = month_start + (30 * 86400)
                    
                    month_charges = [
                        c for c in charges.data 
                        if c.created >= month_start and c.created < month_end
                    ]
                    
                    month_total = sum(c.amount for c in month_charges) / 100
                    
                    time_series.append({
                        "timestamp": month_start,
                        "date": datetime.fromtimestamp(month_start).strftime("%Y-%m"),
                        "amount": month_total
                    })
            
            # Calculate totals
            total_revenue = sum(revenue_by_currency.values())
            transaction_count = len(charges.data)
            
            return {
                "total_revenue": total_revenue,
                "transaction_count": transaction_count,
                "revenue_by_currency": revenue_by_currency,
                "revenue_by_plan": revenue_by_plan,
                "time_series": time_series
            }
        
        except Exception as e:
            logger.exception(f"Error getting revenue data from Stripe: {str(e)}")
            return {
                "error": f"Failed to get revenue data: {str(e)}",
                "total_revenue": 0,
                "transaction_count": 0,
                "revenue_by_currency": {},
                "revenue_by_plan": {},
                "time_series": []
            }
    
    async def _get_subscription_stats(self) -> Dict[str, Any]:
        """
        Get subscription statistics from Stripe.
        
        Returns:
            Dict containing subscription statistics
        """
        try:
            # Initialize Stripe
            stripe.api_key = self.STRIPE_API_KEY
            
            # Get all active subscriptions
            subscriptions = stripe.Subscription.list(
                status="active",
                limit=100  # Adjust as needed
            )
            
            # Count subscriptions by plan
            subscription_counts = {
                "basic": 0,
                "professional": 0,
                "enterprise": 0,
                "other": 0,
                "total": len(subscriptions.data)
            }
            
            # Calculate MRR (Monthly Recurring Revenue)
            mrr = 0
            
            for sub in subscriptions.data:
                # Try to determine plan type
                plan_type = "other"
                
                if sub.items.data:
                    for item in sub.items.data:
                        if item.plan:
                            plan_id = item.plan.id
                            if "basic" in plan_id:
                                plan_type = "basic"
                            elif "professional" in plan_id or "pro" in plan_id:
                                plan_type = "professional"
                            elif "enterprise" in plan_id:
                                plan_type = "enterprise"
                
                # Increment counter
                subscription_counts[plan_type] += 1
                
                # Add to MRR
                if sub.items.data:
                    for item in sub.items.data:
                        if item.plan:
                            # Convert from cents and adjust for billing interval
                            amount = item.plan.amount / 100
                            if item.plan.interval == "year":
                                amount = amount / 12
                            
                            mrr += amount
            
            return {
                "counts": subscription_counts,
                "mrr": mrr
            }
        
        except Exception as e:
            logger.exception(f"Error getting subscription stats from Stripe: {str(e)}")
            return {
                "error": f"Failed to get subscription stats: {str(e)}",
                "counts": {
                    "basic": 0,
                    "professional": 0,
                    "enterprise": 0,
                    "other": 0,
                    "total": 0
                },
                "mrr": 0
            }
    
    async def get_problem_payments(self) -> List[Dict[str, Any]]:
        """
        Get list of problematic payments (failed, refunded, disputed).
        
        Returns:
            List of problem payment objects
        """
        try:
            # Initialize Stripe
            stripe.api_key = self.STRIPE_API_KEY
            
            # Get recent charges with problems
            start_timestamp = int((datetime.utcnow() - timedelta(days=30)).timestamp())
            
            # Failed charges
            failed_charges = stripe.Charge.list(
                created={"gte": start_timestamp},
                status="failed",
                limit=25
            )
            
            # Disputed charges
            disputed_charges = stripe.Charge.list(
                created={"gte": start_timestamp},
                disputed=True,
                limit=25
            )
            
            # Refunded charges
            refunded_charges = stripe.Charge.list(
                created={"gte": start_timestamp},
                refunded=True,
                limit=25
            )
            
            # Combine and format results
            problem_payments = []
            
            for charge in failed_charges.data:
                client_id = self._get_client_id_from_charge(charge)
                
                problem_payments.append({
                    "payment_id": charge.id,
                    "client_id": client_id,
                    "amount": charge.amount / 100,
                    "currency": charge.currency.upper(),
                    "status": "failed",
                    "failure_code": charge.failure_code,
                    "failure_message": charge.failure_message,
                    "created": datetime.fromtimestamp(charge.created).isoformat()
                })
            
            for charge in disputed_charges.data:
                client_id = self._get_client_id_from_charge(charge)
                
                problem_payments.append({
                    "payment_id": charge.id,
                    "client_id": client_id,
                    "amount": charge.amount / 100,
                    "currency": charge.currency.upper(),
                    "status": "disputed",
                    "dispute_reason": charge.dispute.reason if charge.dispute else "unknown",
                    "created": datetime.fromtimestamp(charge.created).isoformat()
                })
            
            for charge in refunded_charges.data:
                client_id = self._get_client_id_from_charge(charge)
                
                problem_payments.append({
                    "payment_id": charge.id,
                    "client_id": client_id,
                    "amount": charge.amount / 100,
                    "refunded_amount": charge.amount_refunded / 100,
                    "currency": charge.currency.upper(),
                    "status": "refunded",
                    "created": datetime.fromtimestamp(charge.created).isoformat()
                })
            
            # Sort by date, newest first
            problem_payments.sort(key=lambda x: x["created"], reverse=True)
            
            return problem_payments
        
        except Exception as e:
            logger.exception(f"Error getting problem payments: {str(e)}")
            return []
    
    async def get_payment_history(self, days: int = 30, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get detailed payment history.
        
        Args:
            days: Number of days of history to retrieve
            status: Filter by payment status (succeeded, failed, refunded)
            
        Returns:
            List of payment objects
        """
        try:
            # Initialize Stripe
            stripe.api_key = self.STRIPE_API_KEY
            
            # Get charges
            start_timestamp = int((datetime.utcnow() - timedelta(days=days)).timestamp())
            
            charge_filter = {
                "created": {"gte": start_timestamp},
                "limit": 100  # Adjust as needed
            }
            
            if status:
                charge_filter["status"] = status
            
            charges = stripe.Charge.list(**charge_filter)
            
            # Format results
            payment_history = []
            
            for charge in charges.data:
                client_id = self._get_client_id_from_charge(charge)
                
                payment_data = {
                    "payment_id": charge.id,
                    "client_id": client_id,
                    "amount": charge.amount / 100,
                    "currency": charge.currency.upper(),
                    "status": charge.status,
                    "payment_method": charge.payment_method_details.type if charge.payment_method_details else "unknown",
                    "created": datetime.fromtimestamp(charge.created).isoformat(),
                    "metadata": charge.metadata
                }
                
                # Add additional status-specific fields
                if charge.status == "failed":
                    payment_data["failure_code"] = charge.failure_code
                    payment_data["failure_message"] = charge.failure_message
                
                elif charge.refunded:
                    payment_data["refunded_amount"] = charge.amount_refunded / 100
                
                elif charge.disputed:
                    payment_data["disputed"] = True
                    payment_data["dispute_reason"] = charge.dispute.reason if charge.dispute else "unknown"
                
                payment_history.append(payment_data)
            
            # Sort by date, newest first
            payment_history.sort(key=lambda x: x["created"], reverse=True)
            
            return payment_history
        
        except Exception as e:
            logger.exception(f"Error getting payment history: {str(e)}")
            return []
    
    async def issue_refund(self, payment_id: str, amount: Optional[int] = None, reason: str = "requested_by_customer") -> Dict[str, Any]:
        """
        Issue a refund for a payment.
        
        Args:
            payment_id: The ID of the payment to refund
            amount: Amount to refund in cents (optional, defaults to full amount)
            reason: Reason for the refund
            
        Returns:
            Dict containing refund information
        """
        try:
            # Initialize Stripe
            stripe.api_key = self.STRIPE_API_KEY
            
            # Create refund
            refund_params = {
                "charge": payment_id,
                "reason": reason
            }
            
            if amount:
                refund_params["amount"] = amount
            
            refund = stripe.Refund.create(**refund_params)
            
            # Get charge to extract client ID
            charge = stripe.Charge.retrieve(payment_id)
            client_id = self._get_client_id_from_charge(charge)
            
            return {
                "refund_id": refund.id,
                "payment_id": payment_id,
                "client_id": client_id,
                "amount": refund.amount / 100 if refund.amount else charge.amount / 100,
                "currency": refund.currency.upper() if refund.currency else charge.currency.upper(),
                "status": refund.status,
                "created": datetime.fromtimestamp(refund.created).isoformat()
            }
        
        except Exception as e:
            logger.exception(f"Error issuing refund: {str(e)}")
            raise ValueError(f"Failed to issue refund: {str(e)}")
    
    def _get_client_id_from_charge(self, charge) -> Optional[str]:
        """
        Extract client ID from a Stripe charge.
        
        Args:
            charge: Stripe charge object
            
        Returns:
            Client ID if found, otherwise None
        """
        # Try to get client ID from metadata
        if charge.metadata and "client_id" in charge.metadata:
            return charge.metadata["client_id"]
        
        # Try to get from customer
        if charge.customer:
            try:
                customer = stripe.Customer.retrieve(charge.customer)
                if customer.metadata and "client_id" in customer.metadata:
                    return customer.metadata["client_id"]
            except Exception:
                pass
        
        return None