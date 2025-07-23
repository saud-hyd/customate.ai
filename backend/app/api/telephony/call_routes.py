# backend/app/api/telephony/call_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.telephony.telephony_service_factory import TelephonyServiceFactory
from app.repositories.telephony_repository import CallRepository, CallEventRepository
from app.repositories.telephony_analytics import TelephonyAnalyticsRepository
from app.core import logger

router = APIRouter(prefix="/calls", tags=["calls"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_call_history(
    limit: int = Query(50, le=200, description="Maximum number of calls to return"),
    skip: int = Query(0, ge=0, description="Number of calls to skip"),
    status: Optional[str] = Query(None, description="Filter by call status"),
    direction: Optional[str] = Query(None, description="Filter by call direction (inbound/outbound)"),
    start_date: Optional[str] = Query(None, description="Filter calls after this date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter calls before this date (ISO format)"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get call history for the authenticated client.
    
    - **limit**: Maximum number of calls to return (max 200)
    - **skip**: Number of calls to skip for pagination
    - **status**: Filter by call status (completed, failed, in-progress, etc.)
    - **direction**: Filter by call direction (inbound, outbound)
    - **start_date**: Filter calls after this date (ISO format)
    - **end_date**: Filter calls before this date (ISO format)
    """
    try:
        # Parse date filters if provided
        start_datetime = None
        end_datetime = None
        
        if start_date:
            try:
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
                )
        
        if end_date:
            try:
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
                )
        
        # Validate status and direction filters
        valid_statuses = ["ringing", "in-progress", "completed", "failed", "canceled", "busy", "no-answer"]
        if status and status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Valid options: {', '.join(valid_statuses)}"
            )
        
        valid_directions = ["inbound", "outbound"]
        if direction and direction not in valid_directions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid direction. Valid options: {', '.join(valid_directions)}"
            )
        
        # Get call history using repository
        call_repo = CallRepository()
        calls = call_repo.get_by_client_id(
            db=db,
            client_id=current_client.client_id,
            limit=limit,
            skip=skip,
            direction=direction,
            status=status,
            start_date=start_datetime,
            end_date=end_datetime
        )
        
        # Format response
        call_history = []
        for call in calls:
            call_history.append({
                "call_id": call.call_id,
                "phone_number": call.phone_number,
                "caller_number": call.caller_number,
                "direction": call.direction,
                "status": call.status,
                "started_at": call.started_at.isoformat(),
                "ended_at": call.ended_at.isoformat() if call.ended_at else None,
                "duration_seconds": call.duration_seconds,
                "cost_cents": call.cost_cents,
                "cost_dollars": (call.cost_cents / 100) if call.cost_cents else None,
                "twilio_call_sid": call.twilio_call_sid,
                "recording_url": call.recording_url
            })
        
        return call_history
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call history for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call history"
        )

@router.get("/{call_id}", response_model=Dict[str, Any])
async def get_call_details(
    call_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific call.
    
    - **call_id**: The unique identifier for the call
    """
    try:
        # Get call details
        call_repo = CallRepository()
        call = call_repo.get_by_call_id(db, call_id)
        
        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        # Verify client ownership
        if call.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get call events for timeline
        event_repo = CallEventRepository()
        events = event_repo.get_by_call_id(db, call_id)
        
        # Format events
        call_timeline = []
        for event in events:
            call_timeline.append({
                "event_id": event.event_id,
                "event_type": event.event_type,
                "event_data": event.event_data,
                "occurred_at": event.occurred_at.isoformat()
            })
        
        # Get voice session info if available
        from app.repositories.telephony_repository import VoiceSessionRepository
        voice_repo = VoiceSessionRepository()
        voice_session = voice_repo.get_by_call_id(db, call_id)
        
        voice_session_info = None
        if voice_session:
            voice_session_info = {
                "session_id": voice_session.session_id,
                "chat_session_id": voice_session.chat_session_id,
                "language": voice_session.language,
                "voice_model": voice_session.voice_model,
                "status": voice_session.status
            }
        
        # Build detailed response
        call_details = {
            "call_id": call.call_id,
            "phone_number": call.phone_number,
            "caller_number": call.caller_number,
            "direction": call.direction,
            "status": call.status,
            "started_at": call.started_at.isoformat(),
            "ended_at": call.ended_at.isoformat() if call.ended_at else None,
            "duration_seconds": call.duration_seconds,
            "cost_cents": call.cost_cents,
            "cost_dollars": (call.cost_cents / 100) if call.cost_cents else None,
            "twilio_call_sid": call.twilio_call_sid,
            "recording_url": call.recording_url,
            "voice_session": voice_session_info,
            "events": call_timeline,
            "created_at": call.created_at.isoformat(),
            "updated_at": call.updated_at.isoformat()
        }
        
        return call_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call details for {call_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call details"
        )

@router.get("/active/list", response_model=List[Dict[str, Any]])
async def get_active_calls(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all currently active calls for the client."""
    try:
        # Create telephony service
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        # Get active calls
        active_calls = telephony_service.get_active_calls()
        
        return active_calls
        
    except Exception as e:
        logger.error(f"Failed to get active calls for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve active calls"
        )

@router.post("/{call_id}/end", response_model=Dict[str, Any])
async def end_call(
    call_id: str,
    reason: str = "manual",
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    End an active call.
    
    - **call_id**: The unique identifier for the call
    - **reason**: Reason for ending the call (manual, timeout, error, etc.)
    """
    try:
        # Verify call exists and belongs to client
        call_repo = CallRepository()
        call = call_repo.get_by_call_id(db, call_id)
        
        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        if call.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check if call is active
        if call.status not in ["ringing", "in-progress"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Call is not active (status: {call.status})"
            )
        
        # Create telephony service and end call
        telephony_service = TelephonyServiceFactory.create_telephony_service(
            db=db,
            client_id=current_client.client_id
        )
        
        result = await telephony_service.end_call(
            call_id=call_id,
            end_reason=reason
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to end call: {result.get('error')}"
            )
        
        logger.info(f"Call {call_id} ended manually by client {current_client.client_id}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end call {call_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end call"
        )

@router.get("/{call_id}/timeline", response_model=List[Dict[str, Any]])
async def get_call_timeline(
    call_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get detailed event timeline for a call.
    
    - **call_id**: The unique identifier for the call
    """
    try:
        # Verify call exists and belongs to client
        call_repo = CallRepository()
        call = call_repo.get_by_call_id(db, call_id)
        
        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        if call.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get call timeline
        from app.services.telephony.call_lifecycle_manager import CallLifecycleManager
        lifecycle_manager = CallLifecycleManager(
            db=db,
            client_id=current_client.client_id
        )
        
        timeline = lifecycle_manager.get_call_timeline(call_id)
        
        return timeline
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call timeline for {call_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call timeline"
        )

@router.get("/{call_id}/performance", response_model=Dict[str, Any])
async def get_call_performance(
    call_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get performance statistics for a call.
    
    - **call_id**: The unique identifier for the call
    """
    try:
        # Verify call exists and belongs to client
        call_repo = CallRepository()
        call = call_repo.get_by_call_id(db, call_id)
        
        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        if call.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get performance stats
        from app.services.telephony.call_lifecycle_manager import CallLifecycleManager
        lifecycle_manager = CallLifecycleManager(
            db=db,
            client_id=current_client.client_id
        )
        
        performance_stats = lifecycle_manager.get_call_performance_stats(call_id)
        
        return performance_stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call performance for {call_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call performance"
        )

@router.get("/analytics/trends", response_model=List[Dict[str, Any]])
async def get_call_trends(
    days: int = Query(30, le=365, description="Number of days to analyze"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get call volume and performance trends.
    
    - **days**: Number of days to analyze (max 365)
    """
    try:
        if days < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days must be at least 1"
            )
        
        # Get analytics
        analytics_repo = TelephonyAnalyticsRepository()
        trends = analytics_repo.get_usage_trends(
            db=db,
            client_id=current_client.client_id,
            days=days
        )
        
        return trends
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call trends for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call trends"
        )

@router.get("/phone-numbers/performance", response_model=List[Dict[str, Any]])
async def get_phone_number_performance(
    days: int = Query(30, le=365, description="Number of days to analyze"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get performance metrics by phone number.
    
    - **days**: Number of days to analyze (max 365)
    """
    try:
        if days < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days must be at least 1"
            )
        
        # Get phone number performance
        analytics_repo = TelephonyAnalyticsRepository()
        performance = analytics_repo.get_phone_number_performance(
            db=db,
            client_id=current_client.client_id,
            days=days
        )
        
        return performance
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get phone number performance for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve phone number performance"
        )

@router.get("/quality/metrics", response_model=Dict[str, Any])
async def get_call_quality_metrics(
    days: int = Query(7, le=30, description="Number of days to analyze"),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get call quality and performance metrics.
    
    - **days**: Number of days to analyze (max 30)
    """
    try:
        if days < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days must be at least 1"
            )
        
        # Get quality metrics
        analytics_repo = TelephonyAnalyticsRepository()
        quality_metrics = analytics_repo.get_call_quality_metrics(
            db=db,
            client_id=current_client.client_id,
            days=days
        )
        
        return quality_metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call quality metrics for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call quality metrics"
        )

@router.get("/monitoring/live", response_model=Dict[str, Any])
async def get_live_monitoring(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get real-time monitoring data for active calls and recent activity."""
    try:
        # Get analytics
        analytics_repo = TelephonyAnalyticsRepository()
        monitoring_data = analytics_repo.get_active_call_summary(
            db=db,
            client_id=current_client.client_id
        )
        
        return monitoring_data
        
    except Exception as e:
        logger.error(f"Failed to get live monitoring data for client {current_client.client_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve monitoring data"
        )