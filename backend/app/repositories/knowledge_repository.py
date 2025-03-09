# app/repositories/knowledge_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session

from app.domain.knowledge.entities import KnowledgeCollection, KnowledgeItem, VectorEmbedding
from app.repositories.base_repository import BaseRepository

class KnowledgeCollectionRepository(BaseRepository[KnowledgeCollection, dict, dict]):
    """Repository for KnowledgeCollection entity."""
    
    def __init__(self):
        super().__init__(KnowledgeCollection)
    
    def get_by_collection_id(self, db: Session, collection_id: str) -> Optional[KnowledgeCollection]:
        """Get collection by collection_id."""
        return db.query(KnowledgeCollection).filter(KnowledgeCollection.collection_id == collection_id).first()
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[KnowledgeCollection]:
        """Get all collections for a client."""
        return db.query(KnowledgeCollection).filter(KnowledgeCollection.client_id == client_id).all()
    
    def get_by_name(self, db: Session, name: str) -> Optional[KnowledgeCollection]:
        """Get collection by name."""
        return db.query(KnowledgeCollection).filter(KnowledgeCollection.name == name).first()

class KnowledgeItemRepository(BaseRepository[KnowledgeItem, dict, dict]):
    """Repository for KnowledgeItem entity."""
    
    def __init__(self):
        super().__init__(KnowledgeItem)
    
    def get_by_item_id(self, db: Session, item_id: str) -> Optional[KnowledgeItem]:
        """Get item by item_id."""
        return db.query(KnowledgeItem).filter(KnowledgeItem.item_id == item_id).first()
    
    def get_by_collection_id(self, db: Session, collection_id: str) -> List[KnowledgeItem]:
        """Get all items in a collection."""
        return db.query(KnowledgeItem).filter(KnowledgeItem.collection_id == collection_id).all()
    
    def get_items_for_client(self, db: Session, client_id: str) -> List[KnowledgeItem]:
        """Get all items for a client across all collections."""
        return db.query(KnowledgeItem).join(
            KnowledgeCollection, KnowledgeItem.collection_id == KnowledgeCollection.collection_id
        ).filter(
            KnowledgeCollection.client_id == client_id
        ).all()

class VectorEmbeddingRepository(BaseRepository[VectorEmbedding, dict, dict]):
    """Repository for VectorEmbedding entity."""
    
    def __init__(self):
        super().__init__(VectorEmbedding)
    
    def get_by_embedding_id(self, db: Session, embedding_id: str) -> Optional[VectorEmbedding]:
        """Get embedding by embedding_id."""
        return db.query(VectorEmbedding).filter(VectorEmbedding.embedding_id == embedding_id).first()
    
    def get_by_item_id(self, db: Session, item_id: str) -> Optional[VectorEmbedding]:
        """Get embedding for a knowledge item."""
        return db.query(VectorEmbedding).filter(VectorEmbedding.item_id == item_id).first()