# app/api/knowledge/enhanced_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.deepseek_service import DeepSeekService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enhanced", tags=["enhanced_knowledge"])

@router.post("/search", response_model=Dict[str, Any])
async def hybrid_search(
    query_data: Dict[str, Any] = Body(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Enhanced hybrid search combining vector and keyword search.
    
    Query parameters:
    - query (required): Search text
    - collection_id (optional): Restrict search to a specific collection
    - limit (optional): Maximum number of results (default: 5)
    - hybrid_ratio (optional): Balance between vector (higher) and keyword (lower) results (default: 0.7)
    - filters (optional): Additional filters as dictionary
    
    Returns detailed search results with metadata about the search process.
    """
    if "query" not in query_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query field is required"
        )
    
    # Extract search parameters
    query = query_data["query"]
    limit = query_data.get("limit", 5)
    collection_id = query_data.get("collection_id")
    hybrid_ratio = query_data.get("hybrid_ratio", 0.7)
    filters = query_data.get("filters", {})
    
    # Initialize OpenAI services
    from app.services.llm.llm_factory import LLMFactory

    try:
        llm_service = LLMFactory.create_llm_service(db, current_client.client_id)
        search_service = EnhancedSearchService(llm_service)
        logger.info(f"Initialized OpenAI services for client: {current_client.client_id}")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI services: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service initialization failed. Please try again later."
        )    
    # Perform hybrid search
    search_results = await search_service.hybrid_search(
        client_id=current_client.client_id,
        query_text=query,
        limit=limit,
        collection_id=collection_id,
        hybrid_ratio=hybrid_ratio,
        filters=filters
    )
    
    return search_results

@router.get("/search", response_model=Dict[str, Any])
async def simple_search(
    query: str,
    collection_id: Optional[str] = None,
    limit: int = 5,
    hybrid_ratio: float = 0.7,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Simple hybrid search endpoint for GET requests.
    
    Parameters:
    - query (required): Search text
    - collection_id (optional): Restrict search to a specific collection
    - limit (optional): Maximum number of results (default: 5)
    - hybrid_ratio (optional): Balance between vector and keyword results (default: 0.7)
    """
    # Initialize OpenAI services
    from app.services.llm.llm_factory import LLMFactory

    try:
        llm_service = LLMFactory.create_llm_service(db, current_client.client_id)
        search_service = EnhancedSearchService(llm_service)
        logger.info(f"Initialized OpenAI services for client: {current_client.client_id}")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI services: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service initialization failed. Please try again later."
        )
    
    # Perform hybrid search
    search_results = await search_service.hybrid_search(
        client_id=current_client.client_id,
        query_text=query,
        limit=limit,
        collection_id=collection_id,
        hybrid_ratio=hybrid_ratio,
        filters={}
    )
    
    return search_results