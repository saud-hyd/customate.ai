# app/repositories/vector_repository.py
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
import json
import numpy as np
from collections import defaultdict

from app.core import logger
from app.domain.knowledge.entities import VectorEmbedding, KnowledgeItem, KnowledgeCollection, DocumentSource
from app.repositories.knowledge_repository import KnowledgeCollectionRepository

class VectorRepository:
    """Repository for vector operations on embeddings."""
    
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
        collection_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Find knowledge items similar to a query vector."""
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
                # Parse stored vector from JSON string
                item_vector = json.loads(embedding.vector)
                
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
        """Batch update embeddings in the database."""
        success_count = 0
        error_count = 0
        
        for embedding_data in embeddings:
            try:
                item_id = embedding_data.get("item_id")
                vector = embedding_data.get("vector")
                
                if not item_id or not vector:
                    error_count += 1
                    continue
                
                # Check if embedding exists
                existing = db.query(VectorEmbedding).filter(
                    VectorEmbedding.item_id == item_id
                ).first()
                
                if existing:
                    # Update existing
                    existing.vector = json.dumps(vector)
                    db.add(existing)
                else:
                    # Create new
                    new_embedding = VectorEmbedding(
                        item_id=item_id,
                        vector=json.dumps(vector)
                    )
                    db.add(new_embedding)
                
                success_count += 1
            except Exception as e:
                error_count += 1
                logger.error(f"Error updating embedding for item {embedding_data.get('item_id')}: {str(e)}")
        
        db.commit()
        
        return {
            "success_count": success_count,
            "error_count": error_count
        }