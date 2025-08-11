# app/services/knowledge/enhanced_search_service.py (UPDATED)
from typing import List, Dict, Any, Optional
import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.services.llm.llm_service import LLMService
from app.services.knowledge.multilingual_service import MultilingualQueryService
from app.repositories.vector_repository import VectorRepository
from app.domain.knowledge.entities import KnowledgeItem, KnowledgeCollection
from app.core.database.session import get_db_session
from app.core import logger

class EnhancedSearchService:
    """
    Enhanced service for finding relevant knowledge items through 
    hybrid search with multilingual support.
    """
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.vector_repo = VectorRepository()
        self.multilingual_service = MultilingualQueryService()
    
    async def hybrid_search(
        self, 
        client_id: str, 
        query_text: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 5, 
        vector_threshold: float = 0.7,
        collection_id: Optional[str] = None,
        hybrid_ratio: float = 0.7,
        enable_multilingual: bool = True  # NEW: Toggle for multilingual search
    ) -> Dict[str, Any]:
        """
        Perform hybrid search with optional multilingual support.
        
        Args:
            client_id: ID of the client
            query_text: Text to search for
            filters: Optional filters for search results
            limit: Maximum number of results
            vector_threshold: Minimum similarity score for vector search
            collection_id: Optional collection ID to restrict search
            hybrid_ratio: Balance between vector and keyword results (0-1)
            enable_multilingual: Whether to perform cross-language search
            
        Returns:
            Dictionary with search results and metadata
        """
        # Default filters
        if filters is None:
            filters = {}
            
        # Adjust hybrid ratio to valid range
        hybrid_ratio = max(0.0, min(1.0, hybrid_ratio))
        
        # Calculate limits for vector and keyword search - get more results for better selection
        vector_limit = max(5, int(limit * 2.0))  # Increased multiplier for more results
        keyword_limit = max(5, int(limit * 1.5))
        
        # Get database session
        with get_db_session() as db:
            all_results = []
            
            if enable_multilingual:
                # MULTILINGUAL SEARCH: Generate queries in multiple languages
                multilingual_queries = await self.multilingual_service.generate_multilingual_queries(
                    db, query_text, client_id
                )
                
                logger.info(f"Performing multilingual search with {len(multilingual_queries)} queries")
                
                # Search with each translated query
                for query_data in multilingual_queries:
                    query = query_data["query"]
                    is_original = query_data["is_original"]
                    language = query_data["language"]
                    
                    # Generate embeddings for this query
                    query_vector = await self.llm_service.generate_embeddings(query)
                    
                    if not query_vector or len(query_vector) == 0:
                        logger.warning(f"Failed to generate embedding for query in {language}: {query}")
                        continue
                    
                    # 1. Perform vector search
                    vector_results = await self._vector_search(
                        db=db,
                        query_vector=query_vector,
                        client_id=client_id,
                        query_text=query,
                        limit=vector_limit,
                        threshold=vector_threshold,
                        collection_id=collection_id,
                        filters=filters
                    )
                    
                    # 2. Perform keyword search
                    keyword_results = await self._keyword_search(
                        db=db,
                        query_text=query,
                        client_id=client_id,
                        limit=keyword_limit,
                        collection_id=collection_id,
                        filters=filters
                    )
                    
                    # Add metadata about the query used
                    for result in vector_results.get("results", []):
                        result["query_language"] = language
                        result["is_original_query"] = is_original
                        result["translated_query"] = query if not is_original else None
                    
                    for result in keyword_results.get("results", []):
                        result["query_language"] = language
                        result["is_original_query"] = is_original
                        result["translated_query"] = query if not is_original else None
                    
                    # Collect results
                    all_results.extend(vector_results.get("results", []))
                    all_results.extend(keyword_results.get("results", []))
                
            else:
                # ORIGINAL SINGLE-LANGUAGE SEARCH
                query_vector = await self.llm_service.generate_embeddings(query_text)
                
                if not query_vector or len(query_vector) == 0:
                    logger.error("Failed to generate embedding for query text")
                    return {"results": [], "metadata": {"error": "Failed to generate embedding"}}
                
                # 1. Perform vector search
                vector_results = await self._vector_search(
                    db=db,
                    query_vector=query_vector,
                    client_id=client_id,
                    query_text=query_text,
                    limit=vector_limit,
                    threshold=vector_threshold,
                    collection_id=collection_id,
                    filters=filters
                )
                
                # 2. Perform keyword search
                keyword_results = await self._keyword_search(
                    db=db,
                    query_text=query_text,
                    client_id=client_id,
                    limit=keyword_limit,
                    collection_id=collection_id,
                    filters=filters
                )
                
                all_results.extend(vector_results.get("results", []))
                all_results.extend(keyword_results.get("results", []))
            
            # 3. Merge and deduplicate results
            merged_results = self._merge_search_results(
                vector_results=all_results,
                keyword_results=[],  # Already included in all_results
                hybrid_ratio=hybrid_ratio,
                limit=limit
            )
            
            # 4. Return combined results with metadata
            return {
                "results": merged_results,
                "metadata": {
                    "query": query_text,
                    "total_results_found": len(all_results),
                    "final_results_count": len(merged_results),
                    "hybrid_ratio": hybrid_ratio,
                    "multilingual_enabled": enable_multilingual,
                    "filters_applied": filters
                }
            }
    
    async def _vector_search(
        self,
        db: Session,
        query_vector: List[float],
        client_id: str,
        query_text: str,
        limit: int = 5,
        threshold: float = 0.7,
        collection_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Perform vector-based semantic search."""
        search_results = self.vector_repo.semantic_search(
            db=db,
            query_vector=query_vector,
            client_id=client_id,
            query_text=query_text,
            limit=limit,
            threshold=threshold,
            collection_id=collection_id
        )
        
        # Mark results as vector search
        for result in search_results.get("results", []):
            result["search_type"] = "vector"
        
        return search_results
    
    async def _keyword_search(
        self,
        db: Session,
        query_text: str,
        client_id: str,
        limit: int = 5,
        collection_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Perform keyword-based search."""
        # Extract keywords
        keywords = self._extract_keywords(query_text)
        
        if not keywords:
            return {"results": [], "metadata": {"keywords": []}}
        
        # Build search query
        query_conditions = []
        for keyword in keywords:
            query_conditions.append(
                or_(
                    KnowledgeItem.title.ilike(f"%{keyword}%"),
                    KnowledgeItem.content.ilike(f"%{keyword}%")
                )
            )
        
        # Base query
        query = db.query(KnowledgeItem, KnowledgeCollection).join(
            KnowledgeCollection, KnowledgeItem.collection_id == KnowledgeCollection.collection_id
        ).filter(
            KnowledgeCollection.client_id == client_id
        )
        
        # Add collection filter if specified
        if collection_id:
            query = query.filter(KnowledgeItem.collection_id == collection_id)
        
        # Add keyword conditions
        if query_conditions:
            query = query.filter(or_(*query_conditions))
        
        # Execute query
        results = query.limit(limit).all()
        
        # Format results
        formatted_results = []
        for item, collection in results:
            formatted_results.append({
                "item_id": item.item_id,
                "title": item.title,
                "content": item.content,
                "collection_id": item.collection_id,
                "collection_name": collection.name,
                "search_type": "keyword",
                "similarity": 0.8  # Default score for keyword matches
            })
        
        return {
            "results": formatted_results,
            "metadata": {"keywords": keywords}
        }
    
    def _merge_search_results(
        self,
        vector_results: List[Dict[str, Any]],
        keyword_results: List[Dict[str, Any]], 
        hybrid_ratio: float,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Merge vector and keyword results with deduplication."""
        # Combine all results
        all_results = vector_results + keyword_results
        
        # Remove duplicates based on item_id
        seen_items = {}
        for result in all_results:
            item_id = result.get("item_id")
            if item_id:
                if item_id not in seen_items:
                    seen_items[item_id] = result
                else:
                    # Keep the result with higher similarity
                    if result.get("similarity", 0) > seen_items[item_id].get("similarity", 0):
                        seen_items[item_id] = result
        
        # Sort by similarity score
        merged_results = list(seen_items.values())
        merged_results.sort(key=lambda x: x.get("similarity", 0), reverse=True)
        
        return merged_results[:limit]
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text."""
        stop_words = {'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                    'to', 'of', 'in', 'for', 'with', 'by', 'at', 'this', 'that'}
        
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords