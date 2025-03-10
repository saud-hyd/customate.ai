# backend/tests/e2e/test_document_processing.py
import os
import asyncio
import pytest
import httpx
import tempfile
from pathlib import Path

# Constants
API_URL = "http://localhost:8000/api"
TEST_CLIENT_EMAIL = "test@example.com"
TEST_CLIENT_PASSWORD = "password"  # This should match your test client's API key
TEST_PDF_CONTENT = """
%PDF-1.4
1 0 obj
<< /Type /Catalog
   /Pages 2 0 R
>>
endobj

2 0 obj
<< /Type /Pages
   /Kids [3 0 R]
   /Count 1
>>
endobj

3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /Resources << /Font << /F1 4 0 R >> >>
   /MediaBox [0 0 612 792]
   /Contents 5 0 R
>>
endobj

4 0 obj
<< /Type /Font
   /Subtype /Type1
   /Name /F1
   /BaseFont /Helvetica
>>
endobj

5 0 obj
<< /Length 68 >>
stream
BT
/F1 24 Tf
100 700 Td
(Customate.ai Test Document) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000234 00000 n
0000000312 00000 n
trailer
<< /Size 6
   /Root 1 0 R
>>
startxref
432
%%EOF
"""

async def get_access_token():
    """Get access token for test client."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/auth/token",
            data={"username": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            pytest.fail(f"Failed to get access token: {response.text}")
            
        return response.json()["access_token"]

async def create_test_pdf():
    """Create a temporary test PDF file."""
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_file.write(TEST_PDF_CONTENT.encode())
    temp_file.close()
    return temp_file.name

async def upload_document(token, file_path):
    """Upload a document for processing."""
    file_name = Path(file_path).name
    
    async with httpx.AsyncClient() as client:
        with open(file_path, "rb") as f:
            files = {"file": (file_name, f, "application/pdf")}
            response = await client.post(
                f"{API_URL}/knowledge/documents/upload",
                files=files,
                headers={"Authorization": f"Bearer {token}"}
            )
            
        if response.status_code != 202:
            pytest.fail(f"Failed to upload document: {response.text}")
            
        return response.json()

async def get_document_status(token, document_id):
    """Get document processing status."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_URL}/knowledge/documents/{document_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            pytest.fail(f"Failed to get document status: {response.text}")
            
        return response.json()

async def test_search(token, query):
    """Test semantic search with a query."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/knowledge/search",
            json={"query": query},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            pytest.fail(f"Search failed: {response.text}")
            
        return response.json()

@pytest.mark.asyncio
async def test_document_processing_e2e():
    """End-to-end test of document processing pipeline."""
    # Get access token
    token = await get_access_token()
    
    # Create test PDF
    pdf_path = await create_test_pdf()
    
    try:
        # Upload document
        upload_result = await upload_document(token, pdf_path)
        document_id = upload_result["document_id"]
        
        print(f"Document uploaded with ID: {document_id}")
        
        # Wait for processing to complete (with timeout)
        max_attempts = 30
        attempt = 0
        processed = False
        
        while attempt < max_attempts and not processed:
            status_result = await get_document_status(token, document_id)
            print(f"Document status: {status_result['status']}")
            
            if status_result["status"] == "processed":
                processed = True
                break
                
            if status_result["status"] == "failed":
                pytest.fail(f"Document processing failed: {status_result}")
                
            attempt += 1
            await asyncio.sleep(1)
        
        assert processed, "Document processing did not complete in time"
        
        # Test search with relevant query
        search_result = await test_search(token, "customate test document")
        
        print(f"Search results: {search_result}")
        
        # Verify search results
        assert len(search_result["results"]) > 0, "No search results found"
        
    finally:
        # Clean up test file
        os.unlink(pdf_path)

if __name__ == "__main__":
    # Run the test directly if needed
    asyncio.run(test_document_processing_e2e())