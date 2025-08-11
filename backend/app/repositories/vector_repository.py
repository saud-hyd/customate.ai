# app/repositories/vector_repository.py
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, func
import json
import numpy as np
from collections import defaultdict

from app.core import logger
from app.domain.knowledge.entities import VectorEmbedding, KnowledgeItem, KnowledgeCollection, DocumentSource
from app.repositories.knowledge_repository import KnowledgeCollectionRepository

class VectorRepository:
    """Repository for vector operations on embeddings with pgvector optimization."""
    
    def __init__(self):
        """Initialize repository with pgvector support detection."""
        self._pgvector_available = None
    
    def _check_pgvector_available(self, db: Session) -> bool:
        """Check if pgvector extension is available and native vector column exists."""
        if self._pgvector_available is not None:
            return self._pgvector_available
        
        try:
            # Check if pgvector extension exists
            result = db.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension WHERE extname = 'vector'
                )
            """)).scalar()
            
            if result:
                # Check if embedding_vector column exists
                column_result = db.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'vector_embeddings' 
                        AND column_name = 'embedding_vector'
                    )
                """)).scalar()
                
                self._pgvector_available = bool(column_result)
            else:
                self._pgvector_available = False
                
            return self._pgvector_available
        except Exception as e:
            logger.warning(f"Could not check pgvector availability: {e}")
            self._pgvector_available = False
            return False
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        # Convert to numpy for efficient calculation
        a = np.array(vec1)
        b = np.array(vec2)
        
        # Avoid division by zero
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0
            
        return np.dot(a, b) / (norm_a * norm_b)
    
    def find_similar_items(
        self, 
        db: Session, 
        query_vector: List[float], 
        client_id: str, 
        limit: int = 5,
        threshold: float = 0.7,
        collection_id: Optional[str] = None,
        distance_method: str = "cosine"  # cosine, l2, inner_product
    ) -> List[Dict[str, Any]]:
        """
        Find knowledge items similar to a query vector with automatic pgvector optimization.
        
        Uses native pgvector operations when available, falls back to Python calculations.
        """
        # Try pgvector optimization first
        if self._check_pgvector_available(db):
            try:
                return self._find_similar_items_pgvector(
                    db, query_vector, client_id, limit, threshold, collection_id, distance_method
                )
            except Exception as e:
                logger.warning(f"pgvector query failed, falling back to legacy method: {e}")
        
        # Fallback to legacy method
        return self._find_similar_items_legacy(
            db, query_vector, client_id, limit, threshold, collection_id
        )
    
    def _find_similar_items_pgvector(
        self,
        db: Session,
        query_vector: List[float],
        client_id: str,
        limit: int,
        threshold: float,
        collection_id: Optional[str],
        distance_method: str = "cosine"
    ) -> List[Dict[str, Any]]:
        """Find similar items using native pgvector operations for optimal performance."""
        # Get collection IDs for this client
        collection_repo = KnowledgeCollectionRepository()
        
        if collection_id:
            # Verify collection belongs to client
            collection = collection_repo.get_by_collection_id(db, collection_id)
            if not collection or collection.client_id != client_id:
                logger.warning(f"Collection {collection_id} not found or doesn't belong to client {client_id}")
                return []
            collection_ids = [collection_id]
        else:
            # Get all collections for client
            client_collections = collection_repo.get_by_client_id(db, client_id)
            collection_ids = [collection.collection_id for collection in client_collections]
        
        if not collection_ids:
            return []
        
        # Convert query vector to pgvector format
        query_vector_str = f"[{','.join(map(str, query_vector))}]"
        
        # Choose distance operator based on method
        distance_ops = {
            "cosine": "<=>",      # Cosine distance (1 - cosine_similarity)
            "l2": "<->",          # L2 (Euclidean) distance  
            "inner_product": "<#>" # Negative inner product
        }
        operator = distance_ops.get(distance_method, "<=>")
        
        # Use psycopg2 raw SQL to avoid SQLAlchemy parameter binding issues
        from psycopg2.extras import RealDictCursor
        import psycopg2
        
        # Get raw connection from SQLAlchemy
        connection = db.connection()
        raw_connection = connection.connection
        
        try:
            with raw_connection.cursor(cursor_factory=RealDictCursor) as cursor:
                # Build collection filter for IN clause
                collection_placeholders = ','.join(['%s' for _ in collection_ids])
                
                # Build optimized query with native pgvector operations
                query_sql = f"""
                    SELECT 
                        ve.embedding_id,
                        ve.item_id,
                        ki.title,
                        ki.content,
                        ki.collection_id,
                        kc.name as collection_name,
                        ki.item_metadata,
                        ki.source_document_id,
                        ve.embedding_vector {operator} %s::vector as distance
                    FROM vector_embeddings ve
                    JOIN knowledge_items ki ON ve.item_id = ki.item_id
                    JOIN knowledge_collections kc ON ki.collection_id = kc.collection_id
                    WHERE kc.client_id = %s
                      AND ki.collection_id IN ({collection_placeholders})
                      AND ve.embedding_vector IS NOT NULL
                    ORDER BY ve.embedding_vector {operator} %s::vector ASC
                    LIMIT %s
                """
                
                # Prepare parameters
                query_vector_str = f"[{','.join(map(str, query_vector))}]"
                params = [
                    query_vector_str,  # First %s for distance calculation
                    client_id,         # %s for client_id
                    *collection_ids,   # %s for each collection_id
                    query_vector_str,  # Second %s for ORDER BY
                    limit * 2          # %s for LIMIT
                ]
                
                # Execute query
                cursor.execute(query_sql, params)
                raw_results = cursor.fetchall()
                
                # Convert to SQLAlchemy-like results
                results = []
                for row in raw_results:
                    # Create a mock Row object with attribute access
                    class MockRow:
                        def __init__(self, data):
                            for key, value in data.items():
                                setattr(self, key, value)
                    results.append(MockRow(row))
                    
        except Exception as e:
            logger.error(f"pgvector raw SQL query failed: {e}")
            raise
        
        # Convert to desired format and filter by threshold
        formatted_results = []
        for row in results:
            # Convert distance to similarity score based on method
            if distance_method == "cosine":
                similarity = 1.0 - float(row.distance)  # Cosine distance to similarity
            elif distance_method == "l2":
                # For L2, smaller distance = higher similarity
                # Normalize to 0-1 range (simple approach)
                similarity = 1.0 / (1.0 + float(row.distance))
            elif distance_method == "inner_product":
                # Inner product distance is negative dot product
                # Higher values = more similar
                similarity = -float(row.distance)
            else:
                similarity = 1.0 - float(row.distance)
            
            # Apply threshold filter with improved logic
            # For cosine similarity, adjust threshold based on search context
            effective_threshold = threshold
            if distance_method == "cosine":
                if threshold >= 0.5:
                    # High threshold: be more selective but allow some negative similarities
                    effective_threshold = max(-0.2, threshold - 0.3)
                elif threshold >= 0.3:
                    # Medium threshold: balanced approach
                    effective_threshold = max(-0.5, threshold - 0.2)
                else:
                    # Low threshold: more permissive for better recall
                    effective_threshold = -0.8
            
            if similarity >= effective_threshold:
                # Get document information
                document_info = {}
                if row.source_document_id:
                    document_info = {
                        "document_id": row.source_document_id,
                    }
                
                formatted_results.append({
                    "item_id": row.item_id,
                    "title": row.title,
                    "content": row.content,
                    "collection_id": row.collection_id,
                    "collection_name": row.collection_name,
                    "document": document_info,
                    "metadata": row.item_metadata or {},
                    "similarity": float(similarity),
                    "distance": float(row.distance),
                    "method": distance_method
                })
        
        # Limit final results
        return formatted_results[:limit]
    
    def _find_similar_items_legacy(
        self,
        db: Session,
        query_vector: List[float],
        client_id: str,
        limit: int,
        threshold: float,
        collection_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Legacy method using Python-based similarity calculations."""
        # Get collection IDs for this client
        collection_repo = KnowledgeCollectionRepository()
        
        if collection_id:
            # Verify collection belongs to client
            collection = collection_repo.get_by_collection_id(db, collection_id)
            if not collection or collection.client_id != client_id:
                logger.warning(f"Collection {collection_id} not found or doesn't belong to client {client_id}")
                return []
            collection_ids = [collection_id]
        else:
            # Get all collections for client
            client_collections = collection_repo.get_by_client_id(db, client_id)
            collection_ids = [collection.collection_id for collection in client_collections]
        
        if not collection_ids:
            return []
        
        # Get all relevant knowledge items and their embeddings
        query = db.query(
            VectorEmbedding, KnowledgeItem, KnowledgeCollection
        ).join(
            KnowledgeItem, VectorEmbedding.item_id == KnowledgeItem.item_id
        ).join(
            KnowledgeCollection, KnowledgeItem.collection_id == KnowledgeCollection.collection_id
        ).filter(
            KnowledgeItem.collection_id.in_(collection_ids)
        )
        
        results = []
        
        # Calculate similarity for each embedding
        for embedding, item, collection in query:
            try:
                # Get vector using the compatibility method
                item_vector = embedding.get_vector
                
                # Validate vector format
                if not isinstance(item_vector, list) or len(item_vector) != len(query_vector):
                    logger.warning(f"Skipping embedding {embedding.embedding_id}: invalid vector format")
                    continue
                
                # Calculate similarity
                similarity = self.cosine_similarity(query_vector, item_vector)
                
                # Add to results if above threshold
                if similarity >= threshold:
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
                        "similarity": float(similarity)
                    })
            except Exception as e:
                logger.error(f"Error processing embedding {embedding.embedding_id}: {str(e)}")
        
        # Sort by similarity (descending) and limit results
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]
    
    def semantic_search(
        self,
        db: Session,
        query_vector: List[float],
        client_id: str, 
        query_text: str = "",
        limit: int = 5,
        threshold: float = 0.7,
        collection_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enhanced semantic search with document grouping and metadata.
        
        Args:
            db: Database session
            query_vector: Query embedding vector
            client_id: Client ID
            query_text: Original query text (for logging)
            limit: Maximum number of results
            threshold: Minimum similarity threshold
            collection_id: Optional collection ID to restrict search
            
        Returns:
            Dictionary with search results and metadata
        """
        # Find similar items
        similar_items = self.find_similar_items(
            db=db,
            query_vector=query_vector,
            client_id=client_id,
            limit=limit * 2,  # Get more items to allow for grouping
            threshold=threshold,
            collection_id=collection_id
        )
        
        # Group by document if available
        document_groups = defaultdict(list)
        collection_groups = defaultdict(list)
        
        for item in similar_items:
            # Group by document if available
            doc_id = item.get("document", {}).get("document_id", "none")
            document_groups[doc_id].append(item)
            
            # Also group by collection
            collection_groups[item["collection_id"]].append(item)
        
        # Get top items with document diversity
        diverse_results = []
        seen_docs = set()
        
        # First add one item from each document
        for doc_id, items in document_groups.items():
            if doc_id != "none" and doc_id not in seen_docs and len(diverse_results) < limit:
                best_item = max(items, key=lambda x: x["similarity"])
                diverse_results.append(best_item)
                seen_docs.add(doc_id)
        
        # Then fill remaining slots with best items overall
        remaining_items = [
            item for item in similar_items 
            if item not in diverse_results and len(diverse_results) < limit
        ]
        remaining_items.sort(key=lambda x: x["similarity"], reverse=True)
        diverse_results.extend(remaining_items[:limit - len(diverse_results)])
        
        # Construct result with metadata
        return {
            "results": diverse_results[:limit],
            "metadata": {
                "query": query_text,
                "total_matches": len(similar_items),
                "filtered_matches": len(diverse_results),
                "unique_documents": len(document_groups) - (1 if "none" in document_groups else 0),
                "unique_collections": len(collection_groups),
                "max_similarity": max([item["similarity"] for item in similar_items]) if similar_items else 0,
                "min_similarity": min([item["similarity"] for item in similar_items]) if similar_items else 0,
            }
        }

    def batch_update_embeddings(
        self,
        db: Session,
        embeddings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Batch update embeddings using optimized native vector storage."""
        success_count = 0
        error_count = 0
        
        for embedding_data in embeddings:
            try:
                item_id = embedding_data.get("item_id")
                vector = embedding_data.get("vector")
                
                if not item_id or not vector:
                    error_count += 1
                    continue
                
                # Ensure vector is a list and has 512 dimensions
                if not isinstance(vector, list) or len(vector) != 512:
                    logger.error(f"Invalid vector format for item {item_id}: expected 512-dim list, got {type(vector)} with {len(vector) if isinstance(vector, list) else 'unknown'} dimensions")
                    error_count += 1
                    continue
                
                # Check if embedding exists
                existing = db.query(VectorEmbedding).filter(
                    VectorEmbedding.item_id == item_id
                ).first()
                
                if existing:
                    # Update existing using the optimized set_vector method
                    existing.set_vector(vector)
                    db.add(existing)
                else:
                    # Create new embedding using optimized storage
                    new_embedding = VectorEmbedding(item_id=item_id)
                    new_embedding.set_vector(vector)
                    db.add(new_embedding)
                
                success_count += 1
            except Exception as e:
                error_count += 1
                logger.error(f"Error updating embedding for item {embedding_data.get('item_id')}: {str(e)}")
        
        try:
            db.commit()
            logger.info(f"Batch update completed: {success_count} success, {error_count} errors")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to commit batch update: {str(e)}")
            error_count += success_count  # Mark all as failed
            success_count = 0
        
        return {
            "success_count": success_count,
            "error_count": error_count
        }