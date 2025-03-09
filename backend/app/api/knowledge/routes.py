from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database.session import get_db_session
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository
from app.domain.knowledge.entities import KnowledgeCollection, KnowledgeItem

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

@router.get("/collections", response_model=List[Dict[str, Any]])
async def get_collections(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db_session)
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
    db: Session = Depends(get_db_session)
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
    db: Session = Depends(get_db_session)
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
    db: Session = Depends(get_db_session)
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