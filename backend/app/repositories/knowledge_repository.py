# app/repositories/knowledge_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session

from app.domain.knowledge.entities import KnowledgeCollection, KnowledgeItem, VectorEmbedding, DocumentSource
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

class DocumentSourceRepository(BaseRepository[DocumentSource, dict, dict]):
    """Repository for DocumentSource entity."""
    
    def __init__(self):
        super().__init__(DocumentSource)
    
    def get_by_document_id(self, db: Session, document_id: str) -> Optional[DocumentSource]:
        """Get document by document_id."""
        return db.query(DocumentSource).filter(DocumentSource.document_id == document_id).first()
    
    def get_by_client_id(self, db: Session, client_id: str) -> List[DocumentSource]:
        """Get all documents for a client."""
        return db.query(DocumentSource).filter(DocumentSource.client_id == client_id).all()
    
    def get_by_status(self, db: Session, status: str) -> List[DocumentSource]:
        """Get documents by status."""
        return db.query(DocumentSource).filter(DocumentSource.status == status).all()
    
    def get_documents_for_collection(self, db: Session, collection_id: str) -> List[DocumentSource]:
        """Get all documents associated with a collection through knowledge items."""
        return db.query(DocumentSource).join(
            KnowledgeItem, DocumentSource.document_id == KnowledgeItem.source_document_id
        ).filter(
            KnowledgeItem.collection_id == collection_id
        ).distinct().all()
        
    def get_processing_documents(self, db: Session, limit: int = 10) -> List[DocumentSource]:
        """Get documents with 'processing' status for background worker."""
        return db.query(DocumentSource).filter(
            DocumentSource.status == "processing"
        ).limit(limit).all()
        
    def get_document_statistics(self, db: Session, client_id: str) -> dict:
        """Get document statistics for a client."""
        # Get total documents
        total_docs = db.query(self.model).filter(
            self.model.client_id == client_id
        ).count()
        
        # Get documents by status
        status_counts = {}
        statuses = ["processed", "processing", "failed"]
        
        for status in statuses:
            count = db.query(self.model).filter(
                self.model.client_id == client_id,
                self.model.status == status
            ).count()
            status_counts[status] = count
        
        # Get document types
        type_counts = {}
        file_types = db.query(self.model.file_type, 
                              db.func.count(self.model.id).label('count')
                             ).filter(
            self.model.client_id == client_id
        ).group_by(self.model.file_type).all()
        
        for file_type, count in file_types:
            type_counts[file_type] = count
        
        # Get total storage size
        total_size = db.query(db.func.sum(self.model.file_size)).filter(
            self.model.client_id == client_id
        ).scalar() or 0
        
        return {
            "total_documents": total_docs,
            "by_status": status_counts,
            "by_type": type_counts,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2)
        }

    def get_recent_documents(self, db: Session, client_id: str, limit: int = 5) -> List[DocumentSource]:
        """Get most recently uploaded documents."""
        return db.query(self.model).filter(
            self.model.client_id == client_id
        ).order_by(self.model.created_at.desc()).limit(limit).all()

    def get_document_knowledge_items(self, db: Session, document_id: str) -> List[KnowledgeItem]:
        """Get all knowledge items extracted from a document."""
        return db.query(KnowledgeItem).filter(
            KnowledgeItem.source_document_id == document_id
        ).all()