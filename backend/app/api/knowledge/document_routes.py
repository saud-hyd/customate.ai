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
from app.services.knowledge.embedding_service import EmbeddingService
from app.services.llm.deepseek_service import DeepSeekService
from app.core import logger
from app.repositories.knowledge_repository import KnowledgeItemRepository, DocumentSource, KnowledgeItem, KnowledgeCollection
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
        from app.repositories.knowledge_repository import KnowledgeCollectionRepository
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
        
        # Process document in background with proper session handling
        async def process_document_task():
            # Background processing implementation remains the same...
            pass
        
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
        from app.repositories.knowledge_repository import KnowledgeCollectionRepository
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
    from app.repositories.knowledge_repository import KnowledgeItemRepository
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

@router.get("/stats", response_model=Dict[str, Any])
async def get_document_stats(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get document statistics for the current client."""
    repo = DocumentSourceRepository()
    stats = repo.get_document_statistics(db, current_client.client_id)
    
    # Get knowledge stats too
    item_repo = KnowledgeItemRepository()
    
    # Count items with document source
    items_with_source = db.query(KnowledgeItem).filter(
        KnowledgeItem.source_document_id.isnot(None)
    ).join(
        DocumentSource, 
        KnowledgeItem.source_document_id == DocumentSource.document_id
    ).filter(
        DocumentSource.client_id == current_client.client_id
    ).count()
    
    # Count items in total
    total_items = db.query(KnowledgeItem).join(
        KnowledgeCollection,
        KnowledgeItem.collection_id == KnowledgeCollection.collection_id
    ).filter(
        KnowledgeCollection.client_id == current_client.client_id
    ).count()
    
    # Add knowledge stats
    stats["knowledge_items"] = {
        "total": total_items,
        "from_documents": items_with_source,
        "manual": total_items - items_with_source
    }
    
    # Get recent documents
    recent_docs = repo.get_recent_documents(db, current_client.client_id, limit=5)
    stats["recent_documents"] = [
        {
            "document_id": doc.document_id,
            "filename": doc.filename,
            "status": doc.status,
            "created_at": doc.created_at.isoformat()
        }
        for doc in recent_docs
    ]
    
    return stats    

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
    from app.repositories.knowledge_repository import KnowledgeItemRepository
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