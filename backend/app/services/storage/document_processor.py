# app/services/storage/document_processor.py
import os
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.domain.knowledge.entities import DocumentSource, KnowledgeCollection, KnowledgeItem
from app.repositories.knowledge_repository import KnowledgeItemRepository, KnowledgeCollectionRepository
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.storage.document_service import DocumentService
from app.core import logger

class DocumentProcessor:
    """
    Service for processing document uploads.
    
    Handles:
    1. File storage
    2. Text extraction
    3. Content chunking
    4. Knowledge item creation
    5. Embedding generation
    """
    
    def __init__(
        self,
        document_service: DocumentService,
        embedding_service: EmbeddingService,
    ):
        self.document_service = document_service
        self.embedding_service = embedding_service
        self.item_repo = KnowledgeItemRepository()
        self.collection_repo = KnowledgeCollectionRepository()
    
    async def process_document(
        self, 
        db: Session, 
        file: UploadFile, 
        client_id: str,
        collection_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a document from upload to searchable knowledge items.
        
        Args:
            db: Database session
            file: Uploaded file
            client_id: Client ID
            collection_id: Optional collection ID
            
        Returns:
            Dictionary with processing results
        """
        try:
            # 1. Save the file
            document = await self.document_service.save_document(db, file, client_id)
            
            # 2. Extract text from document
            text_content = await self.document_service.extract_text(document.storage_path, document.file_type)
            
            # 3. Get or create knowledge collection
            collection = None
            if collection_id:
                collection = self.collection_repo.get_by_collection_id(db, collection_id)
                
            if not collection:
                # Create default collection for document
                collection_name = os.path.splitext(file.filename)[0] if file.filename else "Uploaded Document"
                collection = self.collection_repo.create(db, obj_in={
                    "client_id": client_id,
                    "name": collection_name,
                    "description": f"Knowledge collection from {file.filename}",
                    "type": "document"
                })
            
            # 4. Chunk content and create knowledge items
            chunks = self._chunk_text(text_content)
            created_items = []
            
            for i, chunk in enumerate(chunks):
                # Create knowledge item
                item_data = {
                    "collection_id": collection.collection_id,
                    "title": f"{document.filename} - Section {i+1}",
                    "content": chunk,
                    "source_document_id": document.document_id,
                    "item_metadata": {
                        "document_id": document.document_id,
                        "chunk_index": i,
                        "chunk_count": len(chunks)
                    }
                }
                
                item = self.item_repo.create(db, obj_in=item_data)
                created_items.append(item)
            
            # 5. Generate embeddings for all items
            embedding_tasks = []
            for item in created_items:
                embedding_tasks.append(
                    self.embedding_service.create_embeddings_for_item(db, item.item_id)
                )
            
            # Process embeddings concurrently
            embedding_results = await asyncio.gather(*embedding_tasks)
            
            # Mark document as processed
            self.document_service.update_document_status(db, document.document_id, "processed")
            
            # Return processing results
            return {
                "document_id": document.document_id,
                "collection_id": collection.collection_id,
                "items_created": len(created_items),
                "embeddings_created": sum(1 for result in embedding_results if result),
                "status": "processed"
            }
            
        except Exception as e:
            logger.exception(f"Error processing document: {str(e)}")
            
            # Mark document as failed if it was created
            if document and hasattr(document, 'document_id'):
                self.document_service.update_document_status(db, document.document_id, "failed")
                
            # Re-raise the exception
            raise
    
    def _chunk_text(
        self, 
        text: str, 
        max_chunk_size: int = 1000, 
        overlap: int = 100
    ) -> List[str]:
        """
        Split text into chunks with optional overlap.
        
        Args:
            text: Text to chunk
            max_chunk_size: Maximum size of each chunk
            overlap: Number of characters to overlap
            
        Returns:
            List of text chunks
        """
        chunks = []
        
        if not text or len(text) <= max_chunk_size:
            chunks.append(text)
            return chunks
        
        # Split text into paragraphs
        paragraphs = text.split('\n\n')
        
        current_chunk = ""
        for paragraph in paragraphs:
            # If adding this paragraph would exceed max size, save current chunk and start new one
            if len(current_chunk) + len(paragraph) > max_chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                
                # Start new chunk with overlap if possible
                if overlap > 0 and len(current_chunk) > overlap:
                    # Get the last few sentences for overlap
                    overlap_text = current_chunk[-overlap:]
                    # Try to find sentence boundary
                    last_period = overlap_text.rfind('.')
                    if last_period > 0:
                        overlap_text = current_chunk[-(overlap - last_period):]
                    current_chunk = overlap_text
                else:
                    current_chunk = ""
            
            # Add paragraph to current chunk
            if current_chunk:
                current_chunk += "\n\n" + paragraph
            else:
                current_chunk = paragraph
        
        # Add the last chunk if not empty
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks