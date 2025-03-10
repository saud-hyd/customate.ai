import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository
from app.domain.knowledge.entities import KnowledgeCollection, KnowledgeItem
from app.services.knowledge.similarity_service import SimilarityService
from app.services.llm.deepseek_service import DeepSeekService



router = APIRouter(prefix="/knowledge", tags=["knowledge"])

@router.get("/collections", response_model=List[Dict[str, Any]])
async def get_collections(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all knowledge collections for the current client."""
    collection_repo = KnowledgeCollectionRepository()
    collections = collection_repo.get_by_client_id(db, current_client.client_id)
    
    return [
        {
            "collection_id": collection.collection_id,
            "name": collection.name,
            "description": collection.description,
            "type": collection.type,
            "created_at": collection.created_at.isoformat(),
            "updated_at": collection.updated_at.isoformat(),
            "item_count": len(collection.items)
        }
        for collection in collections
    ]

@router.post("/collections", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_collection(
    collection_data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Create a new knowledge collection."""
    if not collection_data.get("name") or not collection_data.get("type"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name and type are required fields"
        )
    
    collection_repo = KnowledgeCollectionRepository()
    
    # Prepare collection data
    create_data = {
        "client_id": current_client.client_id,
        "name": collection_data["name"],
        "description": collection_data.get("description"),
        "type": collection_data["type"],
    }
    
    collection = collection_repo.create(db, obj_in=create_data)
    
    return {
        "collection_id": collection.collection_id,
        "name": collection.name,
        "description": collection.description,
        "type": collection.type,
        "created_at": collection.created_at.isoformat(),
        "message": "Collection created successfully"
    }

@router.get("/collections/{collection_id}/items", response_model=List[Dict[str, Any]])
async def get_collection_items(
    collection_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all items in a knowledge collection."""
    # Verify collection belongs to client
    collection_repo = KnowledgeCollectionRepository()
    collection = collection_repo.get_by_collection_id(db, collection_id)
    
    if not collection or collection.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )
    
    # Get items
    item_repo = KnowledgeItemRepository()
    items = item_repo.get_by_collection_id(db, collection_id)
    
    return [
        {
            "item_id": item.item_id,
            "title": item.title,
            "content": item.content,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
        }
        for item in items
    ]

@router.post("/collections/{collection_id}/items", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_collection_item(
    collection_id: str,
    item_data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Create a new knowledge item in a collection."""
    # Verify collection belongs to client
    collection_repo = KnowledgeCollectionRepository()
    collection = collection_repo.get_by_collection_id(db, collection_id)
    
    if not collection or collection.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )
    
    if not item_data.get("title") or not item_data.get("content"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title and content are required fields"
        )
    
    # Create item
    item_repo = KnowledgeItemRepository()
    create_data = {
        "collection_id": collection_id,
        "title": item_data["title"],
        "content": item_data["content"],
        "metadata": item_data.get("metadata"),
    }
    
    item = item_repo.create(db, obj_in=create_data)
    
    # TODO: Generate embeddings for the new item (Phase 2)
    
    return {
        "item_id": item.item_id,
        "title": item.title,
        "created_at": item.created_at.isoformat(),
        "message": "Knowledge item created successfully"
    }
    
@router.post("/search", response_model=Dict[str, Any])
async def search_knowledge(
    query_data: Dict[str, Any] = Body(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Search knowledge base with semantic search.
    
    Query must include a "query" field with the search text.
    Optional parameters:
    - limit: Maximum number of results (default: 5)
    - threshold: Minimum similarity score (default: 0.7)
    - collection_id: Restrict search to a specific collection
    """
    if "query" not in query_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query field is required"
        )
    
    query = query_data["query"]
    limit = query_data.get("limit", 5)
    threshold = query_data.get("threshold", 0.7)
    collection_id = query_data.get("collection_id")
    
    # Initialize services
    llm_service = DeepSeekService()
    similarity_service = SimilarityService(llm_service)
    
    # Use enhanced semantic search
    search_results = await similarity_service.semantic_search(
        client_id=current_client.client_id,
        query_text=query,
        limit=limit,
        threshold=threshold,
        collection_id=collection_id
    )
    
    return search_results

@router.get("/collections/{collection_id}/search", response_model=Dict[str, Any])
async def search_collection(
    collection_id: str,
    q: str,
    limit: int = 5,
    threshold: float = 0.7,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Search within a specific knowledge collection.
    """
    # Verify collection belongs to client
    from app.repositories.knowledge_repository import KnowledgeCollectionRepository
    collection_repo = KnowledgeCollectionRepository()
    collection = collection_repo.get_by_collection_id(db, collection_id)
    
    if not collection or collection.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )
    
    # Initialize services
    llm_service = DeepSeekService()
    similarity_service = SimilarityService(llm_service)
    
    # Search within collection
    search_results = await similarity_service.semantic_search(
        client_id=current_client.client_id,
        query_text=q,
        limit=limit,
        threshold=threshold,
        collection_id=collection_id
    )
    
    return search_results    

import os
from fastapi import UploadFile, File, Form

# Add this route to your existing file
@router.post("/documents/upload", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    collection_id: str = Form(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)  # Use get_db dependency, not get_db_session
):
    """Upload a document to a knowledge collection."""
    # Verify collection belongs to client
    collection_repo = KnowledgeCollectionRepository()
    collection = collection_repo.get_by_collection_id(db, collection_id)
    
    if not collection or collection.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )
    
    # Process file
    file_content = await file.read()
    file_size = len(file_content)
    file_type = file.content_type
    filename = file.filename
    
    # Save file to storage (simplified)
    storage_path = f"storage/{current_client.client_id}/{collection_id}/{filename}"
    os.makedirs(os.path.dirname(storage_path), exist_ok=True)
    with open(storage_path, "wb") as f:
        f.write(file_content)
    
    # Create document record
    from app.repositories.knowledge_repository import DocumentSourceRepository
    doc_repo = DocumentSourceRepository()
    document = doc_repo.create(db, obj_in={
        "client_id": current_client.client_id,
        "filename": filename,
        "file_type": file_type,
        "file_size": file_size,
        "storage_path": storage_path,
        "status": "processing"
    })
    
    return {
        "document_id": document.document_id,
        "filename": document.filename,
        "status": document.status,
        "message": "Document uploaded successfully and queued for processing"
    }