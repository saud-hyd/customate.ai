# backend/tests/integration/test_enhanced_features.py
import os
import asyncio
import pytest
import httpx
import json
from typing import List, Dict, Any

# Constants
API_URL = "http://localhost:8000/api"
TEST_CLIENT_EMAIL = "test3@example.com"
TEST_CLIENT_PASSWORD = "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50"  # This should match your test client's API key

# Test queries and follow-ups to evaluate
TEST_SCENARIOS = [
    {
        "name": "Product Query",
        "initial_query": "What products do you offer?",
        "follow_up": "Tell me more about pricing"
    },
    {
        "name": "Support Question", 
        "initial_query": "How do I contact customer support?",
        "follow_up": "What about technical support?"
    },
    {
        "name": "Technical Question",
        "initial_query": "Does your platform support integration with CRM systems?",
        "follow_up": "What about Salesforce specifically?"
    }
]

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

async def hybrid_search(token: str, query: str, collection_id: str = None, hybrid_ratio: float = 0.7):
    """Test the hybrid search API."""
    url = f"{API_URL}/knowledge/search"
    print(f"Attempting to call: {url}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            json={
                "query": query,
                "collection_id": collection_id,
                "hybrid_ratio": hybrid_ratio,
                "limit": 5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response headers: {response.headers}")
            return {"results": [], "error": response.text}
            
        return response.json()
    
async def chat_message(token: str, message: str, session_id: str = None):
    """Send a message to the chatbot."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/chatbot/message",
            json={
                "message": message,
                "session_id": session_id
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            pytest.fail(f"Chat message failed: {response.text}")
            
        return response.json()

async def compare_search_methods(token: str, query: str):
    """Compare vector, keyword, and hybrid search results."""
    # Test different hybrid ratios
    vector_heavy = await hybrid_search(token, query, hybrid_ratio=0.9)
    balanced = await hybrid_search(token, query, hybrid_ratio=0.5)
    keyword_heavy = await hybrid_search(token, query, hybrid_ratio=0.1)
    
    results = {
        "query": query,
        "vector_heavy": {
            "count": len(vector_heavy.get("results", [])),
            "top_result": vector_heavy.get("results", [{}])[0].get("title", "N/A") if vector_heavy.get("results") else "N/A",
            "metadata": vector_heavy.get("metadata", {})
        },
        "balanced": {
            "count": len(balanced.get("results", [])),
            "top_result": balanced.get("results", [{}])[0].get("title", "N/A") if balanced.get("results") else "N/A",
            "metadata": balanced.get("metadata", {})
        },
        "keyword_heavy": {
            "count": len(keyword_heavy.get("results", [])),
            "top_result": keyword_heavy.get("results", [{}])[0].get("title", "N/A") if keyword_heavy.get("results") else "N/A",
            "metadata": keyword_heavy.get("metadata", {})
        }
    }
    
    return results

@pytest.mark.asyncio
async def test_hybrid_search():
    """Test the hybrid search functionality."""
    # Get access token
    token = await get_access_token()
    
    print("\n=== HYBRID SEARCH TEST ===")
    
    # Test queries
    test_queries = [
        "customer support contact information",
        "pricing plans",
        "integration with other systems",
        "how to reset password",
        "API documentation"
    ]
    
    for query in test_queries:
        results = await compare_search_methods(token, query)
        
        print(f"\nQuery: {query}")
        print(f"Vector-heavy results: {results['vector_heavy']['count']} (Top: {results['vector_heavy']['top_result']})")
        print(f"Balanced results: {results['balanced']['count']} (Top: {results['balanced']['top_result']})")
        print(f"Keyword-heavy results: {results['keyword_heavy']['count']} (Top: {results['keyword_heavy']['top_result']})")

@pytest.mark.asyncio
async def test_knowledge_integration():
    """Test knowledge integration with chatbot responses."""
    # Get access token
    token = await get_access_token()
    
    print("\n=== CHATBOT KNOWLEDGE INTEGRATION TEST ===")
    
    for scenario in TEST_SCENARIOS:
        print(f"\nScenario: {scenario['name']}")
        
        # Initial query
        initial_response = await chat_message(token, scenario['initial_query'])
        session_id = initial_response.get("session_id")
        
        print(f"Q: {scenario['initial_query']}")
        print(f"A: {initial_response['message']['content'][:150]}...")
        print(f"Knowledge used: {initial_response.get('knowledge_used', False)}")
        
        # Follow-up query using the same session
        followup_response = await chat_message(token, scenario['follow_up'], session_id)
        
        print(f"Q (Follow-up): {scenario['follow_up']}")
        print(f"A: {followup_response['message']['content'][:150]}...")
        print(f"Knowledge used: {followup_response.get('knowledge_used', False)}")

if __name__ == "__main__":
    # Run tests directly
    asyncio.run(test_hybrid_search())
    asyncio.run(test_knowledge_integration())