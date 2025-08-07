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
from app.services.llm.llm_service import LLMService
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
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
        file_ext = '.' + file.filename.split('.')[-1].lower() if file.filename else ''
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # GET SUBSCRIPTION PLAN LIMITS FIRST
        try:
            from app.services.subscription.stripe_service import PLAN_LIMITS
            from app.repositories.client_repository import SubscriptionRepository
            
            # Get subscription info
            sub_repo = SubscriptionRepository()
            subscription = sub_repo.get_active_subscription(db, current_client.client_id)
            plan_type = subscription.plan_type if subscription else "free"
            
            # Get plan storage limit
            plan_limits = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"])
            storage_limit_bytes = int(plan_limits["storage_limit_mb"] * 1024 * 1024)
            max_file_size_bytes = storage_limit_bytes  # Use plan storage limit as max file size
            
        except Exception as plan_error:
            logger.error(f"Error getting plan limits: {str(plan_error)}")
            # Fallback to free plan limits
            plan_type = "free"
            plan_limits = {"storage_limit_mb": 0.5}
            storage_limit_bytes = int(0.5 * 1024 * 1024)  # 500KB
            max_file_size_bytes = storage_limit_bytes

        # READ FILE CONTENT TO GET ACTUAL SIZE
        try:
            file_content = await file.read()
            file_size = len(file_content)
        except Exception as read_error:
            logger.error(f"Error reading file content: {str(read_error)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not read file content. Please try again with a valid file."
            )
        
        # Validate file size (basic check)
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File appears to be empty. Please upload a valid document."
            )
        
        # Use plan-specific file size limit
        if file_size > max_file_size_bytes:
            file_size_mb = file_size / (1024 * 1024)
            limit_mb = plan_limits["storage_limit_mb"]
            
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"File too large for your {plan_type} plan. Maximum file size is {limit_mb:.1f}MB, your file is {file_size_mb:.2f}MB. Please compress your file or upgrade your plan."
            )
        
        # CRITICAL: Validate storage limits BEFORE processing (plan limits already fetched above)
        try:
            # Get current storage usage
            usage_tracker = UsageTracker()
            usage_tracker._update_storage_usage(db, current_client.client_id)
            
            from app.repositories.analytics_repository import StorageUsageRepository
            storage_repo = StorageUsageRepository()
            current_storage = storage_repo.get_latest(db, current_client.client_id)
            current_usage_bytes = current_storage.total_bytes if current_storage else 0
            
            # Check if upload would exceed storage limit
            new_total_usage = current_usage_bytes + file_size

            if new_total_usage > storage_limit_bytes:
                current_usage_mb = current_usage_bytes / (1024 * 1024)
                limit_mb = plan_limits['storage_limit_mb']
                file_size_mb = file_size / (1024 * 1024)
                remaining_mb = (storage_limit_bytes - current_usage_bytes) / (1024 * 1024)
                
                # FIXED: Always return simple string message - NO OBJECTS
                error_message = (
                    f"Storage limit exceeded for {plan_type} plan. "
                    f"Current usage: {current_usage_mb:.2f}MB of {limit_mb:.2f}MB limit. "
                    f"File size: {file_size_mb:.2f}MB. "
                    f"Remaining space: {remaining_mb:.2f}MB. "
                    f"Please delete some files or upgrade your plan to continue."
                )
                
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=error_message  # ALWAYS string, never object
                )
                
        except HTTPException:
            # Re-raise HTTPExceptions as-is
            raise
        except Exception as storage_error:
            logger.error(f"Error checking storage limits: {str(storage_error)}")
            # If storage check fails, allow upload but log error
            logger.warning(f"Storage validation failed for client {current_client.client_id}, allowing upload")
        
        # Reset file pointer for processing
        try:
            await file.seek(0)
        except Exception as seek_error:
            logger.error(f"Error resetting file pointer: {str(seek_error)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error processing file. Please try uploading again."
            )
        
        # Validate collection if provided and not empty string
        if collection_id and collection_id.strip() not in ["", "string"]:  # Skip validation for "string" placeholder
            collection_repo = KnowledgeCollectionRepository()
            collection = collection_repo.get_by_collection_id(db, collection_id)
            
            if not collection or collection.client_id != current_client.client_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Collection not found or does not belong to your account."
                )
        else:
            # If no valid collection ID provided, set it to None
            collection_id = None
        
        # Initialize services
        document_service = DocumentService()
        
        try:
            # Save document (now with pre-validated storage)
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
                        from app.services.llm.llm_factory import LLMFactory
                        doc_service = DocumentService()
                        llm_service = LLMFactory.create_llm_service(async_db, client_id)
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
            
            # Return success response
            return {
                "document_id": document.document_id,
                "filename": document.filename,
                "status": "processing",
                "message": "Document uploaded and processing started",
                "file_size_mb": round(file_size / (1024 * 1024), 2)
            }
            
        except Exception as doc_error:
            logger.exception(f"Error saving document: {str(doc_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save document. Please try again."
            )
            
    except HTTPException:
        # Re-raise HTTPExceptions as-is (they already have proper string messages)
        raise
    except Exception as e:
        logger.exception(f"Unexpected error uploading document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during upload. Please try again."
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
    try:
        repo = DocumentSourceRepository()
        
        if collection_id:
            # Check if collection belongs to client
            collection_repo = KnowledgeCollectionRepository()
            collection = collection_repo.get_by_collection_id(db, collection_id)
            
            if not collection or collection.client_id != current_client.client_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Collection not found or does not belong to your account."
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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents. Please try again."
        )

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
            detail="Failed to retrieve document statistics. Please try again."
        )

@router.get("/{document_id}", response_model=Dict[str, Any])
async def get_document(
    document_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get document details by ID."""
    try:
        repo = DocumentSourceRepository()
        document = repo.get_by_document_id(db, document_id)
        
        if not document or document.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or does not belong to your account."
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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving document {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document details. Please try again."
        )

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Delete a document and associated knowledge items."""
    try:
        repo = DocumentSourceRepository()
        document = repo.get_by_document_id(db, document_id)
        
        if not document or document.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or does not belong to your account."
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
            # Don't fail the entire operation if file deletion fails
        
        # Delete document record
        repo.delete(db, id=document.id)
        
        # Update storage usage after deletion
        try:
            usage_tracker = UsageTracker()
            usage_tracker._update_storage_usage(db, current_client.client_id)
            usage_tracker.update_knowledge_counts(db, current_client.client_id)
            usage_tracker._update_daily_stats(db, current_client.client_id)
        except Exception as tracking_error:
            logger.error(f"Error updating analytics after document deletion: {str(tracking_error)}")
            # Don't fail the operation if analytics update fails
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting document {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document. Please try again."
        )
        
@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Delete a document and all its associated knowledge items."""
    try:
        from app.repositories.knowledge_repository import (
            DocumentSourceRepository, 
            KnowledgeItemRepository
        )
        from app.services.storage.document_service import DocumentService
        from app.core import logger
        
        doc_repo = DocumentSourceRepository()
        item_repo = KnowledgeItemRepository()
        
        # Verify document belongs to client
        document = doc_repo.get_by_document_id(db, document_id)
        if not document or document.client_id != current_client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Delete associated knowledge items
        items = item_repo.get_by_source_document_id(db, document_id)
        for item in items:
            item_repo.delete(db, item.item_id)
        
        # Delete file from storage
        document_service = DocumentService()
        try:
            await document_service.delete_file(document.file_path)
        except Exception as e:
            logger.warning(f"Failed to delete file from storage: {e}")
        
        # Delete document record
        doc_repo.delete(db, document_id)
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )        