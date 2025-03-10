# app/services/storage/document_service.py
import os
import uuid
import io
from typing import Dict, Any, Optional, BinaryIO
from fastapi import UploadFile
from sqlalchemy.orm import Session
import aiofiles
import PyPDF2
import docx

from app.core.config.settings import settings
from app.domain.knowledge.entities import DocumentSource
from app.repositories.knowledge_repository import DocumentSourceRepository
from app.core import logger

class DocumentService:
    """Service for handling document storage and text extraction."""
    
    def __init__(self):
        self.repo = DocumentSourceRepository()
        self.storage_base_path = os.environ.get("STORAGE_PATH", "storage")
        # Create storage directory if it doesn't exist
        os.makedirs(self.storage_base_path, exist_ok=True)
    
    async def save_document(
        self, 
        db: Session, 
        file: UploadFile, 
        client_id: str
    ) -> DocumentSource:
        """
        Save an uploaded document to storage and database.
        
        Args:
            db: Database session
            file: Uploaded file
            client_id: Client ID
            
        Returns:
            Saved document entity
        """
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Determine client storage path
        client_path = os.path.join(self.storage_base_path, client_id)
        os.makedirs(client_path, exist_ok=True)
        
        storage_path = os.path.join(client_path, unique_filename)
        
        # Save file to disk
        try:
            content = await file.read()
            file_size = len(content)
            
            async with aiofiles.open(storage_path, 'wb') as out_file:
                await out_file.write(content)
                
            # Reset file cursor for potential further reading
            await file.seek(0)
                
            # Determine file type
            file_type = self._get_file_type(file.filename)
            
            # Create document record
            document_data = {
                "client_id": client_id,
                "filename": file.filename,
                "file_type": file_type,
                "file_size": file_size,
                "storage_path": storage_path,
                "status": "processing"
            }
            
            document = self.repo.create(db, obj_in=document_data)
            return document
            
        except Exception as e:
            logger.exception(f"Error saving document: {str(e)}")
            raise
    
    async def extract_text(self, file_path: str, file_type: str) -> str:
        """
        Extract text from document based on its type.
        
        Args:
            file_path: Path to document
            file_type: Type of document (pdf, docx, etc.)
            
        Returns:
            Extracted text content
        """
        try:
            if file_type.lower() == "pdf":
                return await self._extract_pdf_text(file_path)
            elif file_type.lower() in ["docx", "doc"]:
                return await self._extract_docx_text(file_path)
            elif file_type.lower() in ["txt", "text"]:
                return await self._extract_text_file(file_path)
            else:
                logger.warning(f"Unsupported file type for text extraction: {file_type}")
                return ""
        except Exception as e:
            logger.exception(f"Error extracting text from {file_path}: {str(e)}")
            return ""
    
    def update_document_status(self, db: Session, document_id: str, status: str) -> DocumentSource:
        """Update document status."""
        document = self.repo.get_by_document_id(db, document_id)
        if document:
            return self.repo.update(db, db_obj=document, obj_in={"status": status})
        return None
    
    def get_document(self, db: Session, document_id: str) -> Optional[DocumentSource]:
        """Get document by ID."""
        return self.repo.get_by_document_id(db, document_id)
    
    def _get_file_type(self, filename: Optional[str]) -> str:
        """Determine file type from filename."""
        if not filename:
            return "unknown"
            
        extension = os.path.splitext(filename)[1].lower()
        if extension in ['.pdf']:
            return "pdf"
        elif extension in ['.docx', '.doc']:
            return "docx"
        elif extension in ['.txt']:
            return "text"
        else:
            return extension.lstrip('.')
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file."""
        text = ""
        
        # Run PDF extraction in a thread to avoid blocking
        # the event loop with CPU-bound work
        def extract():
            nonlocal text
            try:
                with open(file_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n\n"
                    return text
            except Exception as e:
                logger.exception(f"Error extracting PDF text: {str(e)}")
                return ""
        
        # Run in executor
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, extract)
        return text
    
    async def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        
        # Run DOCX extraction in a thread to avoid blocking
        def extract():
            try:
                doc = docx.Document(file_path)
                text = ""
                for para in doc.paragraphs:
                    text += para.text + "\n"
                return text
            except Exception as e:
                logger.exception(f"Error extracting DOCX text: {str(e)}")
                return ""
        
        # Run in executor
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, extract)
        return text
    
    async def _extract_text_file(self, file_path: str) -> str:
        """Extract text from plain text file."""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
                return await file.read()
        except UnicodeDecodeError:
            # Try with a different encoding
            try:
                async with aiofiles.open(file_path, 'r', encoding='latin-1') as file:
                    return await file.read()
            except Exception as e:
                logger.exception(f"Error reading text file with latin-1 encoding: {str(e)}")
                return ""
        except Exception as e:
            logger.exception(f"Error reading text file: {str(e)}")
            return ""