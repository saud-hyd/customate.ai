import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship

from app.core.database.session import Base

class KnowledgeCollection(Base):
    """Knowledge collection entity representing a group of related knowledge items."""
    
    __tablename__ = "knowledge_collections"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    collection_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)  # faqs, policies, products, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    items = relationship("KnowledgeItem", back_populates="collection", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<KnowledgeCollection {self.name}>"

# Update the KnowledgeItem class to rename the metadata column
class KnowledgeItem(Base):
    """Knowledge item entity representing a single piece of knowledge."""
    
    __tablename__ = "knowledge_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String(36), ForeignKey("knowledge_collections.collection_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    item_metadata = Column(JSON, nullable=True)  # Changed from 'metadata' to 'item_metadata'
    source_document_id = Column(String(36), ForeignKey("document_sources.document_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    collection = relationship("KnowledgeCollection", back_populates="items")
    document = relationship("DocumentSource", back_populates="knowledge_items")
    embeddings = relationship("VectorEmbedding", back_populates="item", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<KnowledgeItem {self.title}>"
    
class DocumentSource(Base):
    """Document source entity representing an uploaded document."""
    
    __tablename__ = "document_sources"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)  # processed, processing, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    knowledge_items = relationship("KnowledgeItem", back_populates="document")
    
    def __repr__(self):
        return f"<DocumentSource {self.filename}>"

class VectorEmbedding(Base):
    """Vector embedding entity for semantic search."""
    
    __tablename__ = "vector_embeddings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    embedding_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    item_id = Column(String(36), ForeignKey("knowledge_items.item_id", ondelete="CASCADE"), nullable=False)
    vector = Column(String, nullable=False)  # We'll use pgvector extension in production
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    item = relationship("KnowledgeItem", back_populates="embeddings")
    
    def __repr__(self):
        return f"<VectorEmbedding {self.embedding_id}>"