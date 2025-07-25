# backend/tests/services/test_document_processor.py
import os
import pytest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.services.storage.document_service import DocumentService
from app.services.storage.document_processor import DocumentProcessor
from app.services.knowledge.embedding_service import EmbeddingService
from app.repositories.knowledge_repository import KnowledgeItemRepository, KnowledgeCollectionRepository
from app.domain.knowledge.entities import DocumentSource, KnowledgeCollection, KnowledgeItem

# Sample test content
SAMPLE_TEXT = """
This is a test document for the document processor.
It contains multiple paragraphs that will be split into chunks.

This is the second paragraph with some additional text.
We need to make sure the chunking works correctly.

And here's another paragraph for good measure.
"""

@pytest.fixture
def mock_db():
    """Mock database session."""
    return MagicMock(spec=Session)

@pytest.fixture
def mock_document_service():
    """Mock document service."""
    service = MagicMock(spec=DocumentService)
    service.extract_text.return_value = asyncio.Future()
    service.extract_text.return_value.set_result(SAMPLE_TEXT)
    return service

@pytest.fixture
def mock_embedding_service():
    """Mock embedding service."""
    service = MagicMock(spec=EmbeddingService)
    service.create_embeddings_for_item.return_value = asyncio.Future()
    service.create_embeddings_for_item.return_value.set_result(True)
    return service

@pytest.fixture
def document_processor(mock_document_service, mock_embedding_service):
    """Create document processor with mocked dependencies."""
    processor = DocumentProcessor(
        document_service=mock_document_service,
        embedding_service=mock_embedding_service,
    )
    
    # Mock repositories
    processor.item_repo = MagicMock(spec=KnowledgeItemRepository)
    processor.collection_repo = MagicMock(spec=KnowledgeCollectionRepository)
    
    return processor

@pytest.mark.asyncio
async def test_process_document(document_processor, mock_db):
    """Test processing a document."""
    # Mock file
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test_document.pdf"
    
    # Mock document
    mock_document = MagicMock(spec=DocumentSource)
    mock_document.document_id = "test-doc-id"
    mock_document.storage_path = "/tmp/test_document.pdf"
    mock_document.file_type = "pdf"
    
    # Set up service mocks
    document_processor.document_service.save_document.return_value = asyncio.Future()
    document_processor.document_service.save_document.return_value.set_result(mock_document)
    
    # Mock collection
    mock_collection = MagicMock(spec=KnowledgeCollection)
    mock_collection.collection_id = "test-collection-id"
    document_processor.collection_repo.get_by_collection_id.return_value = mock_collection
    
    # Mock item creation
    document_processor.item_repo.create.return_value = MagicMock(spec=KnowledgeItem)
    document_processor.item_repo.create.return_value.item_id = "test-item-id"
    
    # Process document
    result = await document_processor.process_document(
        db=mock_db,
        file=mock_file,
        client_id="test-client-id",
        collection_id="test-collection-id"
    )
    
    # Verify results
    assert result["document_id"] == "test-doc-id"
    assert result["collection_id"] == "test-collection-id"
    assert result["status"] == "processed"
    assert result["items_created"] > 0
    assert result["embeddings_created"] > 0
    
    # Verify method calls
    document_processor.document_service.save_document.assert_called_once()
    document_processor.document_service.extract_text.assert_called_once()
    document_processor.collection_repo.get_by_collection_id.assert_called_once()
    assert document_processor.item_repo.create.call_count > 0
    assert document_processor.embedding_service.create_embeddings_for_item.call_count > 0
    document_processor.document_service.update_document_status.assert_called_once_with(
        mock_db, "test-doc-id", "processed"
    )

@pytest.mark.asyncio
async def test_process_document_without_collection(document_processor, mock_db):
    """Test processing a document without a specified collection."""
    # Mock file
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test_document.pdf"
    
    # Mock document
    mock_document = MagicMock(spec=DocumentSource)
    mock_document.document_id = "test-doc-id"
    mock_document.storage_path = "/tmp/test_document.pdf"
    mock_document.file_type = "pdf"
    
    # Set up service mocks
    document_processor.document_service.save_document.return_value = asyncio.Future()
    document_processor.document_service.save_document.return_value.set_result(mock_document)
    
    # Collection should be created since none is specified
    document_processor.collection_repo.get_by_collection_id.return_value = None
    
    # Mock collection creation
    mock_collection = MagicMock(spec=KnowledgeCollection)
    mock_collection.collection_id = "new-collection-id"
    document_processor.collection_repo.create.return_value = mock_collection
    
    # Mock item creation
    document_processor.item_repo.create.return_value = MagicMock(spec=KnowledgeItem)
    document_processor.item_repo.create.return_value.item_id = "test-item-id"
    
    # Process document
    result = await document_processor.process_document(
        db=mock_db,
        file=mock_file,
        client_id="test-client-id",
        collection_id=None
    )
    
    # Verify results
    assert result["document_id"] == "test-doc-id"
    assert result["collection_id"] == "new-collection-id"
    assert result["status"] == "processed"
    
    # Verify collection creation
    document_processor.collection_repo.create.assert_called_once()
    
@pytest.mark.parametrize("text,max_size,overlap,expected_chunks", [
    # Simple text under max size - should be one chunk
    ("Short text", 100, 0, 1),
    # Text just over max size - should be two chunks
    ("A" * 101, 100, 0, 2),
    # Text with multiple paragraphs
    ("Para 1\n\nPara 2\n\nPara 3", 20, 0, 2),
    # Test with overlap
    ("A" * 100 + "\n\n" + "B" * 100, 120, 20, 2),
])
def test_chunk_text(document_processor, text, max_size, overlap, expected_chunks):
    """Test text chunking with different scenarios."""
    chunks = document_processor._chunk_text(text, max_size, overlap)
    assert len(chunks) == expected_chunks