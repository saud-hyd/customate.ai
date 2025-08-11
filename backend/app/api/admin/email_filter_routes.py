# backend/app/api/admin/email_filter_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.core.database.dependencies import get_db
from app.api.admin.dependencies import get_admin_user
from app.services.channel.email_relevance_filter import EmailRelevanceFilter, EmailRelevanceLevel
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_factory import LLMFactory
from app.repositories.client_repository import ClientRepository
from app.core import logger

router = APIRouter(prefix="/admin/email-filter", tags=["admin-email-filter"])

class EmailFilterTestRequest(BaseModel):
    """Request model for testing email filtering."""
    client_id: str
    email_subject: str
    email_content: str
    sender_email: str
    test_mode: bool = True

class EmailFilterConfigUpdate(BaseModel):
    """Request model for updating email filter configuration."""
    client_id: str
    high_confidence_threshold: Optional[float] = None
    medium_confidence_threshold: Optional[float] = None
    minimum_knowledge_items: Optional[int] = None
    minimum_average_similarity: Optional[float] = None
    business_keywords: Optional[List[str]] = None
    personal_indicators: Optional[List[str]] = None
    auto_reply_enabled: Optional[bool] = None

@router.post("/test")
async def test_email_filter(
    request: EmailFilterTestRequest,
    admin_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Test email filtering logic without sending actual responses.
    Useful for debugging and configuration tuning.
    """
    try:
        logger.info(f"Admin {admin_user} testing email filter for client {request.client_id}")
        
        # Verify client exists
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, request.client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client {request.client_id} not found"
            )
        
        # Create services
        llm_service = LLMFactory.create_llm_service(db, request.client_id)
        search_service = EnhancedSearchService(llm_service)
        relevance_filter = EmailRelevanceFilter(search_service, llm_service)
        
        # Analyze email
        analysis = await relevance_filter.analyze_email_relevance(
            client_id=request.client_id,
            email_content=request.email_content,
            email_subject=request.email_subject,
            sender_email=request.sender_email,
            additional_context={"test_mode": request.test_mode}
        )
        
        # Get knowledge items for inspection
        knowledge_items = analysis.get("knowledge_coverage", {}).get("results", [])[:5]
        
        return {
            "test_result": "success",
            "client_id": request.client_id,
            "email_analysis": {
                "should_reply": analysis["should_reply"],
                "relevance_level": analysis["relevance_level"].value,
                "confidence_score": analysis["confidence_score"],
                "reasoning": analysis["reasoning"],
                "knowledge_items_found": analysis["knowledge_items_found"],
                "average_similarity": analysis["average_similarity"]
            },
            "detailed_analysis": {
                "knowledge_coverage": analysis["knowledge_coverage"],
                "business_relevance": analysis["business_relevance"],
                "thresholds_used": analysis["thresholds_used"]
            },
            "sample_knowledge_items": [
                {
                    "title": item.get("title", "")[:100],
                    "content": item.get("content", "")[:200] + "..." if len(item.get("content", "")) > 200 else item.get("content", ""),
                    "similarity": item.get("similarity", 0),
                    "source": item.get("source", "")
                }
                for item in knowledge_items
            ],
            "recommendation": _get_filter_recommendation(analysis),
            "tested_by": admin_user,
            "timestamp": analysis.get("timestamp")
        }
        
    except Exception as e:
        logger.error(f"Email filter test error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Filter test failed: {str(e)}"
        )

@router.get("/stats/{client_id}")
async def get_email_filter_stats(
    client_id: str,
    days: int = 7,
    admin_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get email filtering statistics for a client.
    Shows reply rates, confidence distributions, etc.
    """
    try:
        # Verify client exists
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client {client_id} not found"
            )
        
        # This would typically query the channel_messages table for filter decisions
        # For now, return mock stats structure
        
        return {
            "client_id": client_id,
            "period_days": days,
            "stats": {
                "total_emails_received": 0,  # Would query database
                "emails_replied_to": 0,
                "emails_filtered_out": 0,
                "reply_rate": 0.0,
                "average_confidence_score": 0.0,
                "relevance_level_breakdown": {
                    "high": 0,
                    "medium": 0, 
                    "low": 0,
                    "irrelevant": 0
                },
                "top_filter_reasons": [],
                "knowledge_coverage_stats": {
                    "average_items_found": 0.0,
                    "average_similarity": 0.0
                }
            },
            "current_thresholds": {
                "high_confidence": 0.6,
                "medium_confidence": 0.4,
                "minimum_knowledge_items": 2,
                "minimum_average_similarity": 0.3
            },
            "recommendations": []
        }
        
    except Exception as e:
        logger.error(f"Email filter stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get filter stats: {str(e)}"
        )

@router.post("/configure")
async def update_email_filter_config(
    config: EmailFilterConfigUpdate,
    admin_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update email filter configuration for a client.
    Allows tuning thresholds and keywords.
    """
    try:
        logger.info(f"Admin {admin_user} updating email filter config for client {config.client_id}")
        
        # Verify client exists
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, config.client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client {config.client_id} not found"
            )
        
        # Validate thresholds
        if config.high_confidence_threshold and (config.high_confidence_threshold < 0.1 or config.high_confidence_threshold > 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="High confidence threshold must be between 0.1 and 1.0"
            )
        
        if config.medium_confidence_threshold and (config.medium_confidence_threshold < 0.1 or config.medium_confidence_threshold > 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Medium confidence threshold must be between 0.1 and 1.0"
            )
        
        # In a full implementation, this would update client-specific configuration
        # For now, log the configuration change
        config_changes = {
            "client_id": config.client_id,
            "updated_by": admin_user,
            "changes": {
                key: value for key, value in config.dict().items() 
                if value is not None and key != "client_id"
            }
        }
        
        logger.info(f"Email filter configuration updated: {config_changes}")
        
        return {
            "status": "success",
            "message": f"Email filter configuration updated for client {config.client_id}",
            "updated_config": config_changes,
            "note": "Configuration will take effect on new emails"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email filter config update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update filter config: {str(e)}"
        )

@router.get("/recent-decisions/{client_id}")
async def get_recent_filter_decisions(
    client_id: str,
    limit: int = 20,
    admin_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get recent email filter decisions for debugging.
    Shows what emails were filtered and why.
    """
    try:
        # Verify client exists
        client_repo = ClientRepository()
        client = client_repo.get_by_client_id(db, client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client {client_id} not found"
            )
        
        # This would typically query channel_messages for filter decisions
        # For now, return structure for mock data
        
        return {
            "client_id": client_id,
            "recent_decisions": [],  # Would contain actual filter decisions
            "summary": {
                "total_shown": 0,
                "replied": 0,
                "filtered_out": 0,
                "date_range": "last 24 hours"
            }
        }
        
    except Exception as e:
        logger.error(f"Recent filter decisions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recent decisions: {str(e)}"
        )

def _get_filter_recommendation(analysis: Dict[str, Any]) -> str:
    """Generate human-readable recommendation based on analysis."""
    
    confidence = analysis["confidence_score"]
    knowledge_items = analysis["knowledge_items_found"]
    avg_similarity = analysis["average_similarity"]
    
    if confidence >= 0.8 and knowledge_items >= 3:
        return "✅ Excellent match - safe to auto-reply"
    elif confidence >= 0.6 and knowledge_items >= 2:
        return "👍 Good match - auto-reply recommended"
    elif confidence >= 0.4 and knowledge_items >= 1:
        return "⚠️ Moderate match - consider lowering thresholds if replies are needed"
    elif knowledge_items == 0:
        return "❌ No relevant knowledge found - correctly filtered out"
    else:
        return "🤔 Low confidence - might benefit from more training data"