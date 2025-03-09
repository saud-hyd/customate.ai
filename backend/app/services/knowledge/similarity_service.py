# backend/app/services/knowledge/similarity_service.py
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.llm.llm_service import LLMService
from app.repositories.vector_repository import VectorRepository
from app.core.database.session import get_db_session
from app.core import logger

class SimilarityService:
    """Service for finding similar knowledge items."""
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.vector_repo = VectorRepository()
    
    async def find_similar(
        self, 
        client_id: str, 
        query_text: str, 
        limit: int = 5, 
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Find knowledge items similar to a query text.
        
        Args:
            client_id: ID of the client
            query_text: Text to find similar items for
            limit: Maximum number of results
            threshold: Minimum similarity score
            
        Returns:
            List of similar items with metadata
        """
        # Generate embeddings for query text
        query_vector = await self.llm_service.generate_embeddings(query_text)
        
        if not query_vector or len(query_vector) == 0:
            logger.error("Failed to generate embedding for query text")
            return []
        
        # Get database session
        with get_db_session() as db:
            # Find similar items
            similar_items = self.vector_repo.find_similar_items(
                db=db,
                query_vector=query_vector,
                client_id=client_id,
                limit=limit,
                threshold=threshold
            )
            
            return similar_items