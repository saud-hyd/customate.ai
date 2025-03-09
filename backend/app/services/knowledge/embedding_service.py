# backend/app/services/knowledge/embedding_service.py
from typing import List, Dict, Any, Optional
import json
from sqlalchemy.orm import Session

from app.services.llm.llm_service import LLMService
from app.repositories.knowledge_repository import KnowledgeItemRepository, VectorEmbeddingRepository
from app.repositories.vector_repository import VectorRepository
from app.core import logger

class EmbeddingService:
    """Service for generating and managing embeddings for knowledge items."""
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.item_repo = KnowledgeItemRepository()
        self.embedding_repo = VectorEmbeddingRepository()
        self.vector_repo = VectorRepository()
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings for a piece of text."""
        return await self.llm_service.generate_embeddings(text)
    
    async def create_embeddings_for_item(self, db: Session, item_id: str) -> bool:
        """Generate and store embeddings for a knowledge item."""
        # Get item from database
        item = self.item_repo.get_by_item_id(db, item_id)
        if not item:
            logger.error(f"Knowledge item {item_id} not found")
            return False
        
        # Generate embedding from combined title and content
        text = f"{item.title}\n\n{item.content}"
        embedding = await self.generate_embedding(text)
        
        if not embedding or len(embedding) == 0:
            logger.error(f"Failed to generate embedding for item {item_id}")
            return False
        
        # Store embedding in database
        try:
            # Convert embedding to string for storage
            embedding_str = json.dumps(embedding)
            
            # Create or update embedding
            existing_embedding = self.embedding_repo.get_by_item_id(db, item_id)
            if existing_embedding:
                self.embedding_repo.update(db, db_obj=existing_embedding, obj_in={"vector": embedding_str})
            else:
                self.embedding_repo.create(db, obj_in={
                    "item_id": item_id,
                    "vector": embedding_str
                })
            
            return True
        except Exception as e:
            logger.exception(f"Error storing embedding: {str(e)}")
            return False
    
    async def batch_create_embeddings(self, db: Session, client_id: str, collection_id: Optional[str] = None) -> Dict[str, Any]:
        """Create embeddings for all items in a collection or for a client."""
        # Query items to process
        if collection_id:
            items = self.item_repo.get_by_collection_id(db, collection_id)
        else:
            items = self.item_repo.get_items_for_client(db, client_id)
        
        results = {
            "total": len(items),
            "success": 0,
            "failed": 0
        }
        
        # Process each item
        for item in items:
            success = await self.create_embeddings_for_item(db, item.item_id)
            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
        
        return results