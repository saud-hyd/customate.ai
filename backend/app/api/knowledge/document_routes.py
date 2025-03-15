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
from app.repositories.knowledge_repository import KnowledgeItemRepository, KnowledgeCollectionRepository, KnowledgeItem
from app.core.database.session import SessionLocal
from app.services.analytics.usage_tracker import UsageTracker

# Create router without prefix - this will be added in main.py
router = APIRouter()

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
    if collection_id and collection_id.strip() not in ["", "string"]:  # Skip validation for "string" placeholder
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
        
        # Store variables needed for background task
        doc_id = document.document_id
        client_id = current_client.client_id
        collection_id_value = collection_id
        filename = file.filename
        
        # Define background task with explicit variables
        async def process_document_task():
            """Background task to process the document."""
            logger.info(f"Starting background processing for document {doc_id}")
            try:
                async_db = SessionLocal()
                try:
                    # Get the document
                    doc_repo = DocumentSourceRepository()
                    doc = doc_repo.get_by_document_id(async_db, doc_id)
                    
                    if not doc:
                        logger.error(f"Document {doc_id} not found")
                        return
                    
                    # Initialize services within the task scope
                    doc_service = DocumentService()
                    llm_service = DeepSeekService()
                    embedding_service = EmbeddingService(llm_service)
                    document_processor = DocumentProcessor(doc_service, embedding_service)
                    
                    # Extract text
                    text_content = await doc_service.extract_text(doc.storage_path, doc.file_type)
                    
                    # Find or create collection
                    collection_repo = KnowledgeCollectionRepository()
                    collection = None
                    
                    if collection_id_value:
                        collection = collection_repo.get_by_collection_id(async_db, collection_id_value)
                    
                    if not collection:
                        # Create a default collection
                        collection_name = os.path.splitext(filename)[0] if filename else "Uploaded Document"
                        collection = collection_repo.create(async_db, obj_in={
                            "client_id": client_id,
                            "name": collection_name,
                            "description": f"Knowledge collection from {filename}",
                            "type": "document"
                        })
                    
                    # Process content
                    chunks = document_processor._chunk_text(text_content)
                    created_items = []
                    
                    # Create knowledge items
                    item_repo = KnowledgeItemRepository()
                    for i, chunk in enumerate(chunks):
                        item_data = {
                            "collection_id": collection.collection_id,
                            "title": f"{doc.filename} - Section {i+1}",
                            "content": chunk,
                            "source_document_id": doc.document_id,
                            "item_metadata": {
                                "document_id": doc.document_id,
                                "chunk_index": i,
                                "chunk_count": len(chunks)
                            }
                        }
                        
                        item = item_repo.create(async_db, obj_in=item_data)
                        created_items.append(item)
                    
                    # Generate embeddings
                    embedding_tasks = []
                    for item in created_items:
                        embedding_tasks.append(
                            embedding_service.create_embeddings_for_item(async_db, item.item_id)
                        )
                    
                    # Wait for all embeddings to complete
                    embedding_results = await asyncio.gather(*embedding_tasks)
                    
                    # Update document status to processed
                    doc_service.update_document_status(async_db, doc_id, "processed")
                    logger.info(f"Document {doc_id} processed successfully")
                    
                    # Update analytics after document processing
                    try:
                        usage_tracker = UsageTracker()
                        usage_tracker.update_knowledge_counts(async_db, client_id)
                        usage_tracker._update_storage_usage(async_db, client_id)
                        usage_tracker._update_daily_stats(async_db, client_id)
                        logger.info(f"Successfully updated analytics after document processing for client {client_id}")
                    except Exception as tracking_error:
                        logger.error(f"Error updating analytics after document processing: {str(tracking_error)}", exc_info=True)
                    
                except Exception as inner_error:
                    logger.exception(f"Error in document processing: {str(inner_error)}")
                    # Update status to failed
                    try:
                        doc_service = DocumentService()
                        doc_service.update_document_status(async_db, doc_id, "failed")
                        logger.info(f"Document {doc_id} marked as failed")
                    except Exception as status_error:
                        logger.exception(f"Error updating document status: {str(status_error)}")
                finally:
                    async_db.close()
            except Exception as outer_error:
                logger.exception(f"Outer error in background task: {str(outer_error)}")
                try:
                    # Final attempt to mark document as failed
                    error_db = SessionLocal()
                    try:
                        error_service = DocumentService()
                        error_service.update_document_status(error_db, doc_id, "failed")
                    finally:
                        error_db.close()
                except Exception:
                    # If this fails, we've done all we can
                    pass
        
        # Add task to background tasks
        background_tasks.add_task(process_document_task)
        
        # Add tracking for document upload
        try:
            usage_tracker = UsageTracker()
            usage_tracker.update_knowledge_counts(db, current_client.client_id)
            usage_tracker._update_storage_usage(db, current_client.client_id)
            usage_tracker._update_daily_stats(db, current_client.client_id)
            logger.info(f"Successfully tracked document upload for client {current_client.client_id}")
        except Exception as e:
            logger.error(f"Error tracking document upload: {str(e)}", exc_info=True)
        
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

@router.get("", response_model=List[Dict[str, Any]])
async def get_documents(
    status: Optional[str] = None,
    collection_id: Optional[str] = None,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get all documents for the current client.
    
    Can be filtered by status and/or collection.
    """
    repo = DocumentSourceRepository()
    
    if collection_id:
        # Check if collection belongs to client
        collection_repo = KnowledgeCollectionRepository()
        collection = collection_repo.get_by_collection_id(db, collection_id)
        
        if not collection or collection.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )
        
        documents = repo.get_documents_for_collection(db, collection_id)
    elif status:
        # Get documents by status for this client
        all_docs = repo.get_by_client_id(db, current_client.client_id)
        documents = [doc for doc in all_docs if doc.status == status]
    else:
        # Get all documents for this client
        documents = repo.get_by_client_id(db, current_client.client_id)
    
    return [
        {
            "document_id": doc.document_id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "status": doc.status,
            "created_at": doc.created_at.isoformat()
        }
        for doc in documents
    ]

@router.get("/stats", response_model=Dict[str, Any])
async def get_document_stats(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get document statistics for the current client."""
    try:
        repo = DocumentSourceRepository()
        stats = repo.get_document_statistics(db, current_client.client_id)
        return stats
    except Exception as e:
        logger.exception(f"Error getting document stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving document statistics: {str(e)}"
        )

@router.get("/{document_id}", response_model=Dict[str, Any])
async def get_document(
    document_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get document details by ID."""
    repo = DocumentSourceRepository()
    document = repo.get_by_document_id(db, document_id)
    
    if not document or document.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get associated knowledge items
    item_repo = KnowledgeItemRepository()
    items = db.query(KnowledgeItem).filter(
        KnowledgeItem.source_document_id == document_id
    ).all()
    
    return {
        "document_id": document.document_id,
        "filename": document.filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "status": document.status,
        "created_at": document.created_at.isoformat(),
        "updated_at": document.updated_at.isoformat(),
        "knowledge_items": len(items)
    }

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Delete a document and associated knowledge items."""
    repo = DocumentSourceRepository()
    document = repo.get_by_document_id(db, document_id)
    
    if not document or document.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete associated knowledge items first
    item_repo = KnowledgeItemRepository()
    items = db.query(KnowledgeItem).filter(
        KnowledgeItem.source_document_id == document_id
    ).all()
    
    for item in items:
        item_repo.delete(db, id=item.id)
    
    # Delete document file
    try:
        if os.path.exists(document.storage_path):
            os.remove(document.storage_path)
    except Exception as e:
        logger.error(f"Error deleting document file: {str(e)}")
    
    # Delete document record
    repo.delete(db, id=document.id)
    
    return None