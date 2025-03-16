# backend/tests/debug_integration.py
# Purpose: This script helps debug integration-related issues by testing API key authentication
# and integration creation with detailed error logging

import httpx
import json
from sqlalchemy.orm import Session
import sys
import traceback

sys.path.append(".")  # Add current directory to path

from app.core.database.session import SessionLocal
from app.repositories.client_repository import ClientRepository
from app.services.integration.integration_service import IntegrationService
from app.core import logger

async def test_integration_creation():
    """Test integration creation directly with the service layer."""
    db = SessionLocal()
    try:
        # Get a valid client
        client_repo = ClientRepository()
        clients = client_repo.get_multi(db, limit=1)
        
        if not clients:
            print("No clients found. Please ensure there are clients in the database.")
            return
            
        test_client = clients[0]
        print(f"Using client: {test_client.name} ({test_client.client_id})")
        print(f"API Key: {test_client.api_key}")
        
        # Initialize service
        integration_service = IntegrationService()
        
        # Test service method directly
        try:
            result = integration_service.create_integration(
                db=db,
                client_id=test_client.client_id,
                provider="zendesk",
                name="Test Integration",
                api_endpoint="test.zendesk.com",
                api_key="test_key",
                api_secret="test_secret"
            )
            print(f"Integration created: {result}")
        except Exception as e:
            print(f"Service error: {str(e)}")
            traceback.print_exc()
        
        # Test HTTP endpoint
        base_url = "http://localhost:8000"
        headers = {
            "X-API-Key": test_client.api_key,
            "Content-Type": "application/json"
        }
        
        test_data = {
            "provider": "zendesk",
            "name": "Test Integration via HTTP",
            "api_endpoint": "test.zendesk.com",
            "api_key": "test_api_key", 
            "api_secret": "test_secret"
        }
        
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    f"{base_url}/api/integration",
                    headers=headers,
                    json=test_data
                )
                
                print(f"Status: {response.status_code}")
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"HTTP error: {str(e)}")
            traceback.print_exc()
            
    finally:
        db.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_integration_creation())