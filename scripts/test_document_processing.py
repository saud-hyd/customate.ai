# backend/scripts/test_document_processing.py
"""
Simple script to test document upload and search.

Usage:
    python -m backend.scripts.test_document_processing path/to/document.pdf

This will:
1. Upload the document
2. Wait for processing to complete
3. Perform a search with text from the document name
4. Display the results
"""

import os
import sys
import asyncio
import httpx
import time
from pathlib import Path

# Configuration
API_URL = "http://localhost:8000/api"
EMAIL = "test@example.com"
PASSWORD = "password"  # This should match your test account's API key

async def get_token():
    """Get API token for authentication."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/auth/token",
            data={"username": EMAIL, "password": PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            print(f"Error getting token: {response.text}")
            sys.exit(1)
            
        data = response.json()
        return data["access_token"]

async def upload_document(token, file_path):
    """Upload a document for processing."""
    file_path = Path(file_path)
    print(f"Uploading {file_path.name}...")
    
    async with httpx.AsyncClient() as client:
        with open(file_path, "rb") as f:
            files = {"file": (file_path.name, f, "application/octet-stream")}
            response = await client.post(
                f"{API_URL}/knowledge/documents/upload",
                files=files,
                headers={"Authorization": f"Bearer {token}"}
            )
        
        if response.status_code != 202:
            print(f"Error uploading document: {response.text}")
            sys.exit(1)
            
        data = response.json()
        print(f"Document uploaded with ID: {data['document_id']}")
        return data

async def check_document_status(token, document_id):
    """Check document processing status."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_URL}/knowledge/documents/{document_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            print(f"Error checking document status: {response.text}")
            return None
            
        data = response.json()
        return data

async def search_knowledge(token, query):
    """Search knowledge base."""
    print(f"Searching for: '{query}'")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/knowledge/search",
            json={"query": query},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            print(f"Error searching: {response.text}")
            return None
            
        data = response.json()
        return data

async def get_document_stats(token):
    """Get document statistics."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_URL}/knowledge/documents/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            print(f"Error getting document stats: {response.text}")
            return None
            
        data = response.json()
        return data

async def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python test_document_processing.py path/to/document.pdf")
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
        
    # Get token
    token = await get_token()
    print(f"Authentication successful")
    
    # Upload document
    upload_result = await upload_document(token, file_path)
    document_id = upload_result["document_id"]
    
    # Wait for processing
    print("Waiting for document processing...")
    status = "processing"
    max_attempts = 30
    attempt = 0
    
    while status == "processing" and attempt < max_attempts:
        status_result = await check_document_status(token, document_id)
        status = status_result["status"]
        
        print(f"Status: {status}")
        
        if status == "processed":
            print("Document processing completed!")
            break
            
        if status == "failed":
            print("Document processing failed!")
            sys.exit(1)
            
        attempt += 1
        time.sleep(1)
    
    if status != "processed":
        print("Document processing timed out")
        sys.exit(1)
    
    # Get document stats
    stats = await get_document_stats(token)
    print("\nDocument Statistics:")
    print(f"Total Documents: {stats['total_documents']}")
    print(f"Total Knowledge Items: {stats['knowledge_items']['total']}")
    
    # Extract search query from filename
    file_name = Path(file_path).stem
    search_query = ' '.join(file_name.split('_')).replace('-', ' ')
    
    # Search knowledge base
    search_result = await search_knowledge(token, search_query)
    
    print("\nSearch Results:")
    if search_result and search_result.get("results"):
        for i, result in enumerate(search_result["results"], 1):
            print(f"\n{i}. {result['title']} (Score: {result['similarity']:.4f})")
            print(f"Collection: {result['collection_name']}")
            print(f"Content Preview: {result['content'][:100]}...")
    else:
        print("No search results found")
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())