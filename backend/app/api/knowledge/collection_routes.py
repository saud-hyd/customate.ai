# backend/app/api/knowledge/collection_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository

# Create router WITHOUT a prefix - we'll add the full prefix in main.py
router = APIRouter()

# Note: routes defined without the /knowledge prefix here - that will be added in main.py
@router.get("/collections")
async def get_collections(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all collections for the current client."""
    repo = KnowledgeCollectionRepository()
    collections = repo.get_by_client_id(db, current_client.client_id)
    
    return [
        {
            "collection_id": collection.collection_id,
            "name": collection.name,
            "description": collection.description,
            "type": collection.type,
            "created_at": collection.created_at.isoformat(),
            "updated_at": collection.updated_at.isoformat(),
            "item_count": len(collection.items) if hasattr(collection, 'items') else 0
        }
        for collection in collections
    ]

@router.post("/collections", status_code=status.HTTP_201_CREATED)
async def create_collection(
    collection_data: Dict[str, Any] = Body(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Create a new collection."""
    repo = KnowledgeCollectionRepository()
    
    # Add client_id to collection data
    collection_data["client_id"] = current_client.client_id
    
    # Create collection
    collection = repo.create(db, obj_in=collection_data)
    
    return {
        "collection_id": collection.collection_id,
        "name": collection.name,
        "description": collection.description,
        "type": collection.type,
        "created_at": collection.created_at.isoformat(),
        "updated_at": collection.updated_at.isoformat()
    }

@router.get("/collections/{collection_id}/items")
async def get_collection_items(
    collection_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all items in a collection."""
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
            "source_document_id": item.source_document_id,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        }
        for item in items
    ]

@router.post("/collections/{collection_id}/items", status_code=status.HTTP_201_CREATED)
async def create_collection_item(
    collection_id: str,
    item_data: Dict[str, Any] = Body(...),
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Create a new item in a collection."""
    # Verify collection belongs to client
    collection_repo = KnowledgeCollectionRepository()
    collection = collection_repo.get_by_collection_id(db, collection_id)
    
    if not collection or collection.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )
    
    # Add collection_id to item data
    item_data["collection_id"] = collection_id
    
    # Create item
    item_repo = KnowledgeItemRepository()
    item = item_repo.create(db, obj_in=item_data)
    
    return {
        "item_id": item.item_id,
        "title": item.title,
        "content": item.content,
        "source_document_id": item.source_document_id,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat()
    }