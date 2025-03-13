# app/api/knowledge/document_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import asyncio
import os

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.knowledge_repository import DocumentSourceRepository
from app.services.storage.document_service import DocumentService
from app.services.storage.document_processor import DocumentProcessor
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.llm.deepseek_service import DeepSeekService
from app.core import logger
from app.repositories.knowledge_repository import KnowledgeItemRepository, KnowledgeCollectionRepository
from app.domain.knowledge.entities import DocumentSource, KnowledgeItem, KnowledgeCollection
from app.core.database.session import SessionLocal


router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_id: Optional[str] = Form(None),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Upload a document for processing and knowledge extraction.
    """
    # Validate file type
    allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
    file_ext = '.' + file.filename.split('.')[-1].lower() if file.filename else ''
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Validate collection if provided and not empty string
    if collection_id and collection_id.strip() != "string":  # Skip validation for "string" placeholder
        collection_repo = KnowledgeCollectionRepository()
        collection = collection_repo.get_by_collection_id(db, collection_id)
        
        if not collection or collection.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )
    else:
        # If no valid collection ID provided, set it to None
        collection_id = None
    
    # Initialize services
    document_service = DocumentService()
    
    try:
        # Save document
        document = await document_service.save_document(db, file, current_client.client_id)
        
        # Capture necessary variables for the background task
        doc_id = document.document_id
        client_id = current_client.client_id
        collection_id_value = collection_id  # Properly capture collection_id
        
        # Define background processing task with explicit parameter capture
        async def process_document_task():
            """Background task to process the document and update its status."""
            logger.info(f"Starting background processing for document {doc_id}")
            
            try:
                # Create a new database session for the background task
                async_db = SessionLocal()
                
                try:
                    # Initialize necessary services
                    llm_service = DeepSeekService()
                    embedding_service = EmbeddingService(llm_service)
                    document_processor = DocumentProcessor(document_service, embedding_service)
                    
                    # Get the document from the database
                    doc_repo = DocumentSourceRepository()
                    stored_doc = doc_repo.get_by_document_id(async_db, doc_id)
                    
                    if not stored_doc:
                        logger.error(f"Document {doc_id} not found in database")
                        return
                    
                    # Extract text from document
                    text_content = await document_service.extract_text(
                        stored_doc.storage_path, 
                        stored_doc.file_type
                    )
                    
                    # Get or create knowledge collection
                    collection_repo = KnowledgeCollectionRepository()
                    collection = None
                    
                    if collection_id_value:
                        collection = collection_repo.get_by_collection_id(async_db, collection_id_value)
                            
                    if not collection:
                        # Create default collection for document
                        collection_name = os.path.splitext(stored_doc.filename)[0]
                        collection = collection_repo.create(async_db, obj_in={
                            "client_id": client_id,
                            "name": collection_name,
                            "description": f"Knowledge collection from {stored_doc.filename}",
                            "type": "document"
                        })
                    
                    # Chunk content and create knowledge items
                    item_repo = KnowledgeItemRepository()
                    chunks = document_processor._chunk_text(text_content)
                    created_items = []
                    
                    for i, chunk in enumerate(chunks):
                        # Create knowledge item
                        item_data = {
                            "collection_id": collection.collection_id,
                            "title": f"{stored_doc.filename} - Section {i+1}",
                            "content": chunk,
                            "source_document_id": stored_doc.document_id,
                            "item_metadata": {
                                "document_id": stored_doc.document_id,
                                "chunk_index": i,
                                "chunk_count": len(chunks)
                            }
                        }
                        
                        item = item_repo.create(async_db, obj_in=item_data)
                        created_items.append(item)
                    
                    # Generate embeddings for all items
                    embedding_tasks = []
                    for item in created_items:
                        embedding_tasks.append(
                            embedding_service.create_embeddings_for_item(async_db, item.item_id)
                        )
                    
                    # Process embeddings concurrently
                    embedding_results = await asyncio.gather(*embedding_tasks)
                    
                    # Mark document as processed - CRITICAL LINE that was missing/failing
                    document_service.update_document_status(async_db, doc_id, "processed")
                    
                    logger.info(f"Document {doc_id} processed successfully: created {len(created_items)} items")
                    
                except Exception as processing_error:
                    logger.exception(f"Error processing document: {str(processing_error)}")
                    # Ensure we update status to failed
                    document_service.update_document_status(async_db, doc_id, "failed")
                finally:
                    async_db.close()
            except Exception as e:
                logger.exception(f"Error in background task: {str(e)}")
                # Try to update status to failed in case of any error
                try:
                    error_db = SessionLocal()
                    try:
                        document_service.update_document_status(error_db, doc_id, "failed")
                    finally:
                        error_db.close()
                except Exception as update_error:
                    logger.exception(f"Error updating document status: {str(update_error)}")
        
        # Add task to background tasks
        background_tasks.add_task(process_document_task)
        
        return {
            "document_id": document.document_id,
            "filename": document.filename,
            "status": "processing",
            "message": "Document uploaded and processing started"
        }
        
    except Exception as e:
        logger.exception(f"Error uploading document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading document: {str(e)}"
        )