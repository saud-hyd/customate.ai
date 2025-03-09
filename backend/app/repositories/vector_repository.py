# backend/app/repositories/vector_repository.py
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import json
import numpy as np

from app.core import logger
from app.domain.knowledge.entities import VectorEmbedding, KnowledgeItem
from app.repositories.base_repository import BaseRepository
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
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Find knowledge items similar to a query vector."""
        # Get collection IDs for this client
        collection_repo = KnowledgeCollectionRepository()
        client_collections = collection_repo.get_by_client_id(db, client_id)
        collection_ids = [collection.collection_id for collection in client_collections]
        
        if not collection_ids:
            return []
        
        # Get all relevant knowledge items and their embeddings
        query = db.query(
            VectorEmbedding, KnowledgeItem
        ).join(
            KnowledgeItem, VectorEmbedding.item_id == KnowledgeItem.item_id
        ).filter(
            KnowledgeItem.collection_id.in_(collection_ids)
        )
        
        results = []
        
        # Calculate similarity for each embedding
        for embedding, item in query:
            try:
                # Parse stored vector from JSON string
                item_vector = json.loads(embedding.vector)
                
                # Calculate similarity
                similarity = self.cosine_similarity(query_vector, item_vector)
                
                # Add to results if above threshold
                if similarity >= threshold:
                    results.append({
                        "item_id": item.item_id,
                        "title": item.title,
                        "content": item.content,
                        "collection_id": item.collection_id,
                        "similarity": float(similarity)
                    })
            except Exception as e:
                logger.error(f"Error processing embedding {embedding.embedding_id}: {str(e)}")
        
        # Sort by similarity (descending) and limit results
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]

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