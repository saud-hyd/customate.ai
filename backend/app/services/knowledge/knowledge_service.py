# backend/app/services/knowledge/knowledge_service.py
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.knowledge.similarity_service import SimilarityService
from app.core import logger

class KnowledgeService:
    """
    Service for managing knowledge base collections and items.
    
    This service:
    - Manages knowledge collections and items
    - Coordinates embedding generation
    - Handles search across knowledge items
    """
    
    def __init__(
        self,
        db: Session,
        embedding_service: Optional[EmbeddingService] = None,
        similarity_service: Optional[SimilarityService] = None
    ):
        self.db = db
        self.collection_repo = KnowledgeCollectionRepository()
        self.item_repo = KnowledgeItemRepository()
        self.embedding_service = embedding_service
        self.similarity_service = similarity_service
    
    def create_collection(self, client_id: str, name: str, description: str, collection_type: str) -> Dict[str, Any]:
        """Create a new knowledge collection."""
        try:
            collection = self.collection_repo.create(self.db, obj_in={
                "client_id": client_id,
                "name": name,
                "description": description,
                "type": collection_type
            })
            
            return {
                "collection_id": collection.collection_id,
                "name": collection.name,
                "description": collection.description,
                "type": collection.type,
                "created_at": collection.created_at.isoformat(),
                "updated_at": collection.updated_at.isoformat()
            }
        except Exception as e:
            logger.error(f"Error creating knowledge collection: {str(e)}")
            raise
    
    def create_knowledge_item(
        self, 
        collection_id: str, 
        title: str, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None,
        source_document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new knowledge item."""
        try:
            # Verify collection exists
            collection = self.collection_repo.get_by_collection_id(self.db, collection_id)
            if not collection:
                raise ValueError(f"Collection not found: {collection_id}")
            
            # Create knowledge item
            item = self.item_repo.create(self.db, obj_in={
                "collection_id": collection_id,
                "title": title,
                "content": content,
                "item_metadata": metadata or {},
                "source_document_id": source_document_id
            })
            
            # Generate embeddings if embedding service is available
            if self.embedding_service:
                self.embedding_service.create_embeddings_for_item(self.db, item.item_id)
            
            return {
                "item_id": item.item_id,
                "collection_id": item.collection_id,
                "title": item.title,
                "content": item.content,
                "metadata": item.item_metadata,
                "source_document_id": item.source_document_id,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat()
            }
        except Exception as e:
            logger.error(f"Error creating knowledge item: {str(e)}")
            raise
    
    def get_collections(self, client_id: str) -> List[Dict[str, Any]]:
        """Get all collections for a client."""
        try:
            collections = self.collection_repo.get_by_client_id(self.db, client_id)
            
            return [{
                "collection_id": collection.collection_id,
                "name": collection.name,
                "description": collection.description,
                "type": collection.type,
                "created_at": collection.created_at.isoformat(),
                "updated_at": collection.updated_at.isoformat()
            } for collection in collections]
        except Exception as e:
            logger.error(f"Error getting collections: {str(e)}")
            raise
    
    def get_knowledge_items(self, collection_id: str) -> List[Dict[str, Any]]:
        """Get all knowledge items in a collection."""
        try:
            collection = self.collection_repo.get_by_collection_id(self.db, collection_id)
            if not collection:
                raise ValueError(f"Collection not found: {collection_id}")
                
            items = self.item_repo.get_by_collection_id(self.db, collection_id)
            
            return [{
                "item_id": item.item_id,
                "collection_id": item.collection_id,
                "title": item.title,
                "content": item.content,
                "metadata": item.item_metadata,
                "source_document_id": item.source_document_id,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat()
            } for item in items]
        except Exception as e:
            logger.error(f"Error getting knowledge items: {str(e)}")
            raise