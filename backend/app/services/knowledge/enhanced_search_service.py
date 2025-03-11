# app/services/knowledge/enhanced_search_service.py
from typing import List, Dict, Any, Optional
import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.services.llm.llm_service import LLMService
from app.repositories.vector_repository import VectorRepository
from app.domain.knowledge.entities import KnowledgeItem, KnowledgeCollection
from app.core.database.session import get_db_session
from app.core import logger

class EnhancedSearchService:
    """
    Enhanced service for finding relevant knowledge items through 
    hybrid search (combining vector and keyword search).
    """
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.vector_repo = VectorRepository()
    
    async def hybrid_search(
        self, 
        client_id: str, 
        query_text: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 5, 
        vector_threshold: float = 0.7,
        collection_id: Optional[str] = None,
        hybrid_ratio: float = 0.7  # Balance between vector (higher) and keyword (lower) results
    ) -> Dict[str, Any]:
        """
        Perform hybrid search combining vector similarity and keyword matching.
        
        Args:
            client_id: ID of the client
            query_text: Text to search for
            filters: Optional filters for search results
            limit: Maximum number of results
            vector_threshold: Minimum similarity score for vector search
            collection_id: Optional collection ID to restrict search
            hybrid_ratio: Balance between vector and keyword results (0-1)
            
        Returns:
            Dictionary with search results and metadata
        """
        # Default filters
        if filters is None:
            filters = {}
            
        # Adjust hybrid ratio to valid range
        hybrid_ratio = max(0.0, min(1.0, hybrid_ratio))
        
        # Calculate limits for vector and keyword search
        vector_limit = max(3, int(limit * 1.5))  # Get more vector results for better ranking
        keyword_limit = max(3, int(limit * 1.5))  # Same for keywords
        
        # Generate embeddings for query text
        query_vector = await self.llm_service.generate_embeddings(query_text)
        
        if not query_vector or len(query_vector) == 0:
            logger.error("Failed to generate embedding for query text")
            return {"results": [], "metadata": {"error": "Failed to generate embedding"}}
        
        # Get database session
        with get_db_session() as db:
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
            
            # 3. Merge results with hybrid ranking
            merged_results = self._merge_search_results(
                vector_results=vector_results.get("results", []),
                keyword_results=keyword_results.get("results", []),
                hybrid_ratio=hybrid_ratio,
                limit=limit
            )
            
            # 4. Return combined results with metadata
            return {
                "results": merged_results,
                "metadata": {
                    "query": query_text,
                    "vector_results_count": len(vector_results.get("results", [])),
                    "keyword_results_count": len(keyword_results.get("results", [])),
                    "hybrid_results_count": len(merged_results),
                    "hybrid_ratio": hybrid_ratio,
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
        # Use the vector repo's semantic search
        search_results = self.vector_repo.semantic_search(
            db=db,
            query_vector=query_vector,
            client_id=client_id,
            query_text=query_text,
            limit=limit,
            threshold=threshold,
            collection_id=collection_id
        )
        
        # Apply filters if provided
        if filters and search_results.get("results"):
            filtered_results = []
            for item in search_results["results"]:
                if self._matches_filters(item, filters):
                    filtered_results.append(item)
            
            search_results["results"] = filtered_results
            search_results["metadata"]["filtered_count"] = len(filtered_results)
        
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
        # Extract keywords from query
        keywords = self._extract_keywords(query_text)
        
        if not keywords:
            return {"results": [], "metadata": {"error": "No valid keywords extracted"}}
        
        try:
            # Build base query to get client's collections
            collection_query = db.query(KnowledgeCollection).filter(
                KnowledgeCollection.client_id == client_id
            )
            
            if collection_id:
                collection_query = collection_query.filter(
                    KnowledgeCollection.collection_id == collection_id
                )
            
            # Get collection IDs
            collections = collection_query.all()
            collection_ids = [c.collection_id for c in collections]
            
            if not collection_ids:
                return {"results": [], "metadata": {"error": "No collections found"}}
            
            # Build search conditions for each keyword
            search_conditions = []
            for keyword in keywords:
                # Avoid single character or very short keywords
                if len(keyword) <= 2:
                    continue
                    
                keyword_pattern = f"%{keyword}%"
                condition = or_(
                    KnowledgeItem.title.ilike(keyword_pattern),
                    KnowledgeItem.content.ilike(keyword_pattern)
                )
                search_conditions.append(condition)
            
            # If no valid search conditions, return empty results
            if not search_conditions:
                return {"results": [], "metadata": {"error": "No valid search conditions"}}
            
            # Build the query
            query = db.query(KnowledgeItem, KnowledgeCollection).join(
                KnowledgeCollection,
                KnowledgeItem.collection_id == KnowledgeCollection.collection_id
            ).filter(
                KnowledgeItem.collection_id.in_(collection_ids),
                or_(*search_conditions)
            )
            
            # Execute query and build results
            items = query.limit(limit).all()
            
            results = []
            for item, collection in items:
                # Skip items that don't match filters
                if filters and not self._matches_filters({"item_id": item.item_id}, filters):
                    continue
                    
                # Calculate a basic text relevance score
                relevance = self._calculate_text_relevance(query_text, item.title, item.content)
                
                # Extract metadata for context
                metadata = {}
                if hasattr(item, 'item_metadata') and item.item_metadata:
                    metadata = item.item_metadata
                
                # Get document information
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
                    "search_type": "keyword"
                })
            
            # Sort by relevance
            results.sort(key=lambda x: x["relevance"], reverse=True)
            
            return {
                "results": results[:limit],
                "metadata": {
                    "total_matches": len(results),
                    "keywords": keywords
                }
            }
            
        except Exception as e:
            logger.exception(f"Error in keyword search: {str(e)}")
            return {"results": [], "metadata": {"error": str(e)}}
    
    def _extract_keywords(self, query_text: str) -> List[str]:
        """Extract meaningful keywords from query text."""
        # Remove common stop words
        stop_words = {
            'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what',
            'when', 'where', 'how', 'why', 'is', 'are', 'am', 'was', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could',
            'should', 'would', 'may', 'might', 'must', 'will', 'shall', 'in', 'on', 'at',
            'to', 'from', 'by', 'for', 'with', 'about', 'of', 'that', 'this', 'these', 'those'
        }
        
        # Convert to lowercase and extract words
        words = re.findall(r'\b\w+\b', query_text.lower())
        
        # Filter out stop words and short words
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords
        
    def _calculate_text_relevance(self, query: str, title: str, content: str) -> float:
        """
        Calculate a basic text relevance score based on keyword presence and position.
        
        Args:
            query: Search query
            title: Item title
            content: Item content
            
        Returns:
            Relevance score from 0.0 to 1.0
        """
        # Extract keywords
        keywords = self._extract_keywords(query)
        
        if not keywords:
            return 0.0
            
        # Convert to lowercase for case-insensitive matching
        title_lower = title.lower()
        content_lower = content.lower()
        
        # Calculate matches
        title_matches = sum(1 for kw in keywords if kw in title_lower)
        content_matches = sum(1 for kw in keywords if kw in content_lower)
        
        # Calculate scores with title matches weighted more
        max_possible_score = len(keywords) * 1.5  # Title matches count 1.5x
        actual_score = (title_matches * 1.5) + content_matches
        
        # Normalize to 0-1 range
        relevance = min(1.0, actual_score / max_possible_score if max_possible_score > 0 else 0)
        
        return relevance
        
    def _merge_search_results(
        self, 
        vector_results: List[Dict[str, Any]],
        keyword_results: List[Dict[str, Any]],
        hybrid_ratio: float = 0.7,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Merge and rank results from vector and keyword search.
        
        Args:
            vector_results: Results from vector search
            keyword_results: Results from keyword search
            hybrid_ratio: Balance between vector and keyword results (0-1)
            limit: Maximum number of results to return
            
        Returns:
            Merged and ranked list of results
        """
        # Create a map of item IDs to prevent duplicates
        result_map = {}
        
        # Process vector results
        for item in vector_results:
            item_id = item["item_id"]
            # Convert similarity to hybrid score, weighted by hybrid_ratio
            hybrid_score = item.get("similarity", 0) * hybrid_ratio
            item["hybrid_score"] = hybrid_score
            item["search_type"] = "vector"
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
                hybrid_score = item.get("relevance", 0) * (1 - hybrid_ratio)
                item["hybrid_score"] = hybrid_score
                item["search_type"] = "keyword"
                result_map[item_id] = item
        
        # Convert map to list and sort by hybrid score
        merged_results = list(result_map.values())
        merged_results.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)
        
        return merged_results[:limit]
    
    def _matches_filters(self, item: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Check if an item matches the provided filters."""
        for key, value in filters.items():
            # Special case for metadata filters
            if key.startswith("metadata."):
                metadata_key = key.split(".", 1)[1]
                item_metadata = item.get("metadata", {})
                
                if not item_metadata or item_metadata.get(metadata_key) != value:
                    return False
            # Collection filter
            elif key == "collection_id" and item.get("collection_id") != value:
                return False
            # Document filter
            elif key == "document_id":
                doc_info = item.get("document", {})
                if not doc_info or doc_info.get("document_id") != value:
                    return False
        
        return True