# backend/app/repositories/telephony_analytics.py
"""
Specialized analytics repository for telephony data with optimized queries.

This module provides complex analytics queries for call data, usage reporting,
and performance monitoring. Separated from main repositories for performance
optimization and to avoid cluttering core CRUD operations.
"""

from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, text, desc, asc, case, extract
from datetime import datetime, timedelta
import logging

from app.domain.telephony.entities import Call, VoiceSession, PhoneNumber, CallEvent

logger = logging.getLogger(__name__)


class TelephonyAnalyticsRepository:
    """Specialized repository for telephony analytics and reporting."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    # Usage Analytics (for subscription management)
    def get_client_usage_summary(
        self, 
        db: Session, 
        client_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get comprehensive usage summary for a client."""
        if not start_date:
            # Default to current month
            now = datetime.utcnow()
            start_date = datetime(now.year, now.month, 1)
        
        if not end_date:
            end_date = datetime.utcnow()
        
        # Base query for the period
        base_query = db.query(Call).filter(
            Call.client_id == client_id,
            Call.started_at >= start_date,
            Call.started_at <= end_date
        )
        
        # Call counts by status
        call_stats = db.query(
            Call.status,
            func.count(Call.id).label('count'),
            func.sum(Call.duration_seconds).label('total_duration'),
            func.sum(Call.cost_cents).label('total_cost')
        ).filter(
            Call.client_id == client_id,
            Call.started_at >= start_date,
            Call.started_at <= end_date
        ).group_by(Call.status).all()
        
        # Phone number count
        phone_count = db.query(func.count(PhoneNumber.id)).filter(
            PhoneNumber.client_id == client_id,
            PhoneNumber.status == 'active'
        ).scalar() or 0
        
        # Process results
        total_calls = 0
        total_minutes = 0
        total_cost = 0
        
        status_breakdown = {}
        
        for stat in call_stats:
            total_calls += stat.count
            if stat.total_duration:
                total_minutes += int(stat.total_duration / 60)
            if stat.total_cost:
                total_cost += stat.total_cost
            
            status_breakdown[stat.status] = {
                'count': stat.count,
                'duration_minutes': int((stat.total_duration or 0) / 60),
                'cost_cents': stat.total_cost or 0
            }
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_calls': total_calls,
                'total_minutes': total_minutes,
                'total_cost_cents': total_cost,
                'active_phone_numbers': phone_count
            },
            'status_breakdown': status_breakdown,
            'success_rate': (
                status_breakdown.get('completed', {}).get('count', 0) / total_calls * 100
                if total_calls > 0 else 0
            )
        }
    
    def get_usage_trends(
        self, 
        db: Session, 
        client_id: str, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get daily usage trends for charts."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Query with proper date grouping
        results = db.query(
            func.date(Call.started_at).label('date'),
            func.count(Call.id).label('calls'),
            func.sum(
                case(
                    (Call.status == 'completed', Call.duration_seconds),
                    else_=0
                )
            ).label('duration_seconds'),
            func.sum(Call.cost_cents).label('cost_cents'),
            func.count(
                case(
                    (Call.status == 'completed', 1),
                    else_=None
                )
            ).label('completed_calls'),
            func.count(
                case(
                    (Call.status == 'failed', 1),
                    else_=None
                )
            ).label('failed_calls')
        ).filter(
            Call.client_id == client_id,
            Call.started_at >= start_date
        ).group_by(
            func.date(Call.started_at)
        ).order_by(
            func.date(Call.started_at)
        ).all()
        
        trend_data = []
        for result in results:
            total_calls = result.calls
            success_rate = (result.completed_calls / total_calls * 100) if total_calls > 0 else 0
            
            trend_data.append({
                'date': result.date.isoformat(),
                'total_calls': total_calls,
                'completed_calls': result.completed_calls,
                'failed_calls': result.failed_calls,
                'success_rate': round(success_rate, 2),
                'duration_minutes': int((result.duration_seconds or 0) / 60),
                'cost_cents': result.cost_cents or 0
            })
        
        return trend_data
    
    # Call Quality Analytics
    def get_call_quality_metrics(
        self, 
        db: Session, 
        client_id: str,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get call quality and performance metrics."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Call duration distribution (for quality analysis)
        duration_stats = db.query(
            func.min(Call.duration_seconds).label('min_duration'),
            func.max(Call.duration_seconds).label('max_duration'),
            func.avg(Call.duration_seconds).label('avg_duration'),
            func.percentile_cont(0.5).within_group(
                Call.duration_seconds.asc()
            ).label('median_duration')
        ).filter(
            Call.client_id == client_id,
            Call.status == 'completed',
            Call.started_at >= start_date,
            Call.duration_seconds.isnot(None)
        ).first()
        
        # Call failure analysis
        failure_reasons = db.query(
            CallEvent.event_data['reason'].astext.label('reason'),
            func.count(CallEvent.id).label('count')
        ).join(Call).filter(
            Call.client_id == client_id,
            CallEvent.event_type == 'call_failed',
            CallEvent.occurred_at >= start_date
        ).group_by(
            CallEvent.event_data['reason'].astext
        ).all()
        
        # Response time analysis (time from call start to first voice response)
        response_times = db.query(
            func.avg(
                extract('epoch', CallEvent.occurred_at) - 
                extract('epoch', Call.started_at)
            ).label('avg_response_time')
        ).join(Call).filter(
            Call.client_id == client_id,
            CallEvent.event_type == 'first_response',
            Call.started_at >= start_date
        ).scalar()
        
        return {
            'period_days': days,
            'duration_stats': {
                'min_seconds': int(duration_stats.min_duration or 0),
                'max_seconds': int(duration_stats.max_duration or 0),
                'avg_seconds': int(duration_stats.avg_duration or 0),
                'median_seconds': int(duration_stats.median_duration or 0)
            },
            'failure_analysis': [
                {'reason': reason, 'count': count}
                for reason, count in failure_reasons
            ],
            'avg_response_time_seconds': round(response_times or 0, 2)
        }
    
    # Phone Number Analytics
    def get_phone_number_performance(
        self, 
        db: Session, 
        client_id: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get performance metrics by phone number."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        results = db.query(
            PhoneNumber.phone_number,
            PhoneNumber.number_id,
            func.count(Call.id).label('total_calls'),
            func.count(
                case(
                    (Call.status == 'completed', 1),
                    else_=None
                )
            ).label('completed_calls'),
            func.sum(
                case(
                    (Call.status == 'completed', Call.duration_seconds),
                    else_=0
                )
            ).label('total_duration'),
            func.sum(Call.cost_cents).label('total_cost')
        ).outerjoin(
            Call, PhoneNumber.number_id == Call.phone_number
        ).filter(
            PhoneNumber.client_id == client_id,
            PhoneNumber.status == 'active'
        ).filter(
            or_(
                Call.started_at >= start_date,
                Call.started_at.is_(None)  # Include numbers with no calls
            )
        ).group_by(
            PhoneNumber.phone_number,
            PhoneNumber.number_id
        ).all()
        
        performance_data = []
        for result in results:
            total_calls = result.total_calls or 0
            success_rate = (
                result.completed_calls / total_calls * 100 
                if total_calls > 0 else 0
            )
            
            performance_data.append({
                'phone_number': result.phone_number,
                'number_id': result.number_id,
                'total_calls': total_calls,
                'completed_calls': result.completed_calls or 0,
                'success_rate': round(success_rate, 2),
                'total_duration_minutes': int((result.total_duration or 0) / 60),
                'total_cost_cents': result.total_cost or 0
            })
        
        return sorted(performance_data, key=lambda x: x['total_calls'], reverse=True)
    
    # Cost Analytics
    def get_cost_breakdown(
        self, 
        db: Session, 
        client_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get detailed cost breakdown for billing."""
        if not start_date:
            now = datetime.utcnow()
            start_date = datetime(now.year, now.month, 1)
        
        if not end_date:
            end_date = datetime.utcnow()
        
        # Cost by call direction
        direction_costs = db.query(
            Call.direction,
            func.count(Call.id).label('call_count'),
            func.sum(Call.duration_seconds).label('total_duration'),
            func.sum(Call.cost_cents).label('total_cost')
        ).filter(
            Call.client_id == client_id,
            Call.started_at >= start_date,
            Call.started_at <= end_date,
            Call.cost_cents.isnot(None)
        ).group_by(Call.direction).all()
        
        # Daily cost trends
        daily_costs = db.query(
            func.date(Call.started_at).label('date'),
            func.sum(Call.cost_cents).label('daily_cost'),
            func.count(Call.id).label('daily_calls')
        ).filter(
            Call.client_id == client_id,
            Call.started_at >= start_date,
            Call.started_at <= end_date,
            Call.cost_cents.isnot(None)
        ).group_by(
            func.date(Call.started_at)
        ).order_by(
            func.date(Call.started_at)
        ).all()
        
        # Process results
        direction_breakdown = {}
        total_cost = 0
        
        for direction_cost in direction_costs:
            cost_cents = direction_cost.total_cost or 0
            total_cost += cost_cents
            
            direction_breakdown[direction_cost.direction] = {
                'call_count': direction_cost.call_count,
                'duration_minutes': int((direction_cost.total_duration or 0) / 60),
                'cost_cents': cost_cents,
                'cost_dollars': cost_cents / 100
            }
        
        daily_trends = [
            {
                'date': daily_cost.date.isoformat(),
                'cost_cents': daily_cost.daily_cost or 0,
                'cost_dollars': (daily_cost.daily_cost or 0) / 100,
                'call_count': daily_cost.daily_calls
            }
            for daily_cost in daily_costs
        ]
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'total_cost_cents': total_cost,
            'total_cost_dollars': total_cost / 100,
            'direction_breakdown': direction_breakdown,
            'daily_trends': daily_trends
        }
    
    # Real-time Monitoring
    def get_active_call_summary(self, db: Session, client_id: str) -> Dict[str, Any]:
        """Get real-time summary of active calls."""
        active_calls = db.query(Call).filter(
            Call.client_id == client_id,
            Call.status.in_(['ringing', 'in-progress'])
        ).all()
        
        # Get recent call events for active calls
        if active_calls:
            call_ids = [call.call_id for call in active_calls]
            recent_events = db.query(CallEvent).filter(
                CallEvent.call_id.in_(call_ids),
                CallEvent.occurred_at >= datetime.utcnow() - timedelta(minutes=5)
            ).all()
        else:
            recent_events = []
        
        return {
            'active_call_count': len(active_calls),
            'active_calls': [
                {
                    'call_id': call.call_id,
                    'phone_number': call.phone_number,
                    'caller_number': call.caller_number,
                    'status': call.status,
                    'started_at': call.started_at.isoformat(),
                    'duration_seconds': (
                        datetime.utcnow() - call.started_at
                    ).total_seconds()
                }
                for call in active_calls
            ],
            'recent_events': [
                {
                    'event_id': event.event_id,
                    'call_id': event.call_id,
                    'event_type': event.event_type,
                    'occurred_at': event.occurred_at.isoformat()
                }
                for event in recent_events
            ]
        }


# Dependency injection function
def get_telephony_analytics_repository() -> TelephonyAnalyticsRepository:
    """Dependency for TelephonyAnalyticsRepository."""
    return TelephonyAnalyticsRepository()