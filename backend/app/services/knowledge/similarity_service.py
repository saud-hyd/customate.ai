# app/services/knowledge/similarity_service.py
import re
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.domain.knowledge.entities import KnowledgeItem, KnowledgeCollection
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
        limit: int = 3, 
        threshold: float = 0.75,
        collection_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Find knowledge items similar to a query text.
        
        Args:
            client_id: ID of the client
            query_text: Text to find similar items for
            limit: Maximum number of results
            threshold: Minimum similarity score
            collection_id: Optional collection ID to restrict search
            
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
            # Use the standard search method for backward compatibility
            similar_items = self.vector_repo.find_similar_items(
                db=db,
                query_vector=query_vector,
                client_id=client_id,
                limit=limit,
                threshold=threshold,
                collection_id=collection_id
            )
            
            return similar_items
    
    async def semantic_search(
        self,
        client_id: str,
        query_text: str,
        limit: int = 5,
        threshold: float = 0.7,
        collection_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enhanced semantic search with document grouping and metadata.
        
        Args:
            client_id: ID of the client
            query_text: Text to search for
            limit: Maximum number of results
            threshold: Minimum similarity threshold
            collection_id: Optional collection ID to restrict search
            
        Returns:
            Dictionary with search results and metadata
        """
        # Generate embeddings for query text
        query_vector = await self.llm_service.generate_embeddings(query_text)
        
        if not query_vector or len(query_vector) == 0:
            logger.error("Failed to generate embedding for query text")
            return {"results": [], "metadata": {"error": "Failed to generate embedding"}}
        
        # Get database session
        with get_db_session() as db:
            # Use enhanced semantic search
            search_results = self.vector_repo.semantic_search(
                db=db,
                query_vector=query_vector,
                client_id=client_id,
                query_text=query_text,
                limit=limit,
                threshold=threshold,
                collection_id=collection_id
            )
            
            return search_results
    

    async def hybrid_search(
        self,
        client_id: str,
        query_text: str,
        limit: int = 5,
        threshold: float = 0.7,
        collection_id: Optional[str] = None,
        hybrid_ratio: float = 0.7  # Balance between vector and keyword search
    ) -> Dict[str, Any]:
        """
        Perform hybrid search combining vector similarity and keyword matching.
        
        Args:
            client_id: ID of the client
            query_text: Text to search for
            limit: Maximum number of results
            threshold: Minimum similarity score
            collection_id: Optional collection ID to restrict search
            hybrid_ratio: Balance between vector and keyword results (0-1)
            
        Returns:
            Dictionary with search results and metadata
        """
        # Generate query vector
        query_vector = await self.llm_service.generate_embeddings(query_text)
        
        if not query_vector or len(query_vector) == 0:
            logger.error("Failed to generate embedding for query")
            return {"results": [], "metadata": {"error": "Failed to generate embedding"}}
        
        # Extract keywords for text search
        keywords = self._extract_keywords(query_text)
        
        # Get database session
        with self.get_db_session() as db:
            # 1. Perform vector search
            vector_results = self._vector_search(
                db, query_vector, client_id, limit, threshold, collection_id
            )
            
            # 2. Perform keyword search if we have keywords
            keyword_results = []
            if keywords:
                keyword_results = self._keyword_search(
                    db, keywords, client_id, limit, collection_id
                )
            
            # 3. Merge results with hybrid ranking
            merged_results = self._merge_results(
                vector_results, keyword_results, hybrid_ratio, limit
            )
            
            # Return combined results with metadata
            return {
                "results": merged_results,
                "metadata": {
                    "query": query_text,
                    "vector_results_count": len(vector_results),
                    "keyword_results_count": len(keyword_results),
                    "hybrid_results_count": len(merged_results),
                    "keywords": keywords
                }
            }

    # Helper methods to add to SimilarityService
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text."""
        # Remove common stop words (simplified list)
        stop_words = {'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                    'to', 'of', 'in', 'for', 'with', 'by', 'at', 'this', 'that'}
        
        # Extract words and convert to lowercase
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Filter out stop words and short words
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords

    def _vector_search(
        self, db: Session, query_vector: List[float], client_id: str, 
        limit: int, threshold: float, collection_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Perform vector-based search using existing methods."""
        # Call the existing find_similar_items method from vector repository
        results = self.vector_repo.find_similar_items(
            db=db,
            query_vector=query_vector,
            client_id=client_id,
            limit=limit,
            threshold=threshold,
            collection_id=collection_id
        )
        
        # Mark the search type
        for item in results:
            item["search_type"] = "vector"
        
        return results

    def _keyword_search(
        self, db: Session, keywords: List[str], client_id: str, 
        limit: int, collection_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Perform keyword-based search."""
        results = []
        
        # Get collection IDs for this client
        if collection_id:
            collection_ids = [collection_id]
        else:
            from app.repositories.knowledge_repository import KnowledgeCollectionRepository
            collection_repo = KnowledgeCollectionRepository()
            collections = collection_repo.get_by_client_id(db, client_id)
            collection_ids = [c.collection_id for c in collections]
        
        if not collection_ids:
            return []
        
        # Build the search query for each keyword
        for keyword in keywords:
            # Skip very short keywords
            if len(keyword) <= 2:
                continue
                
            keyword_pattern = f"%{keyword}%"
            
            # Search for the keyword in titles and content
            items = db.query(KnowledgeItem, KnowledgeCollection).join(
                KnowledgeCollection,
                KnowledgeItem.collection_id == KnowledgeCollection.collection_id
            ).filter(
                KnowledgeItem.collection_id.in_(collection_ids),
                (KnowledgeItem.title.ilike(keyword_pattern) | 
                KnowledgeItem.content.ilike(keyword_pattern))
            ).limit(limit).all()
            
            # Add items to results
            for item, collection in items:
                # Calculate relevance based on title/content match
                relevance = 0.0
                if keyword.lower() in item.title.lower():
                    relevance += 0.7  # Higher weight for title matches
                if keyword.lower() in item.content.lower():
                    relevance += 0.3  # Lower weight for content matches
                
                # Extract metadata
                metadata = {}
                if hasattr(item, 'item_metadata') and item.item_metadata:
                    metadata = item.item_metadata
                
                # Get document info
                document_info = {}
                if item.source_document_id:
                    document_info = {
                        "document_id": item.source_document_id,
                    }
                
                results.append({
                    "item_id": item.item_id,
                    "title": item.title,
                    "content": item.content,
                    "collection_id": item.collection_id,
                    "collection_name": collection.name,
                    "document": document_info,
                    "metadata": metadata,
                    "relevance": relevance,
                    "search_type": "keyword",
                    "keyword": keyword
                })
        
        # Remove duplicates based on item_id
        unique_results = {}
        for item in results:
            item_id = item["item_id"]
            if item_id not in unique_results or item["relevance"] > unique_results[item_id]["relevance"]:
                unique_results[item_id] = item
        
        # Sort by relevance
        sorted_results = sorted(unique_results.values(), key=lambda x: x["relevance"], reverse=True)
        
        return sorted_results[:limit]

    def _merge_results(
        self, vector_results: List[Dict[str, Any]], keyword_results: List[Dict[str, Any]],
        hybrid_ratio: float, limit: int
    ) -> List[Dict[str, Any]]:
        """Merge vector and keyword search results with appropriate weighting."""
        # Create a map to prevent duplicates
        result_map = {}
        
        # Process vector results
        for item in vector_results:
            item_id = item["item_id"]
            # Convert similarity to hybrid score, weighted by hybrid_ratio
            hybrid_score = item.get("similarity", 0) * hybrid_ratio
            item["hybrid_score"] = hybrid_score
            result_map[item_id] = item
        
        # Process keyword results
        for item in keyword_results:
            item_id = item["item_id"]
            if item_id in result_map:
                # Item already exists from vector search, adjust score
                existing_item = result_map[item_id]
                keyword_score = item.get("relevance", 0) * (1 - hybrid_ratio)
                existing_item["hybrid_score"] += keyword_score
                existing_item["search_type"] = "hybrid"
            else:
                # New item from keyword search
                keyword_score = item.get("relevance", 0) * (1 - hybrid_ratio)
                item["hybrid_score"] = keyword_score
                result_map[item_id] = item
        
        # Convert map to list and sort by hybrid score
        merged_results = list(result_map.values())
        merged_results.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)
        
        return merged_results[:limit]    
    