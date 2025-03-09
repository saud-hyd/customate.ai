# Updated test_vector_search.py
import asyncio
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database.session import get_db_session
from app.services.llm.deepseek_service import DeepSeekService
from app.services.knowledge.similarity_service import SimilarityService
from app.repositories.knowledge_repository import KnowledgeCollectionRepository, KnowledgeItemRepository
from app.repositories.vector_repository import VectorRepository
from app.repositories.client_repository import ClientRepository

async def test_vector_search():
    # Initialize services
    llm_service = DeepSeekService()
    similarity_service = SimilarityService(llm_service)
    
    # Create test data
    with get_db_session() as db:
        # Create a test client first
        client_repo = ClientRepository()
        
        # Check if test client exists
        test_client = client_repo.get_by_email(db, "test@example.com")
        
        if not test_client:
            # Create test client
            client_data = {
                "name": "Test Client",
                "email": "test@example.com",
                "industry": "technology",
                "api_key": str(uuid.uuid4()),
                "active": True
            }
            test_client = client_repo.create(db, obj_in=client_data)
            print(f"Created test client with ID: {test_client.client_id}")
        
        client_id = test_client.client_id
        
        # Create or get collection
        collection_repo = KnowledgeCollectionRepository()
        collection = collection_repo.get_by_name(db, "Test Collection") or \
                    collection_repo.create(db, obj_in={
                        "client_id": client_id,
                        "name": "Test Collection",
                        "type": "test",
                        "description": "Test collection for vector search"
                    })
        
        # Create test items
        item_repo = KnowledgeItemRepository()
        items = [
            {
                "collection_id": collection.collection_id,
                "title": "Customer Support FAQ",
                "content": "How to contact customer support? You can reach us at support@example.com"
            },
            {
                "collection_id": collection.collection_id,
                "title": "Product Information",
                "content": "Our product helps businesses automate customer support with AI"
            },
            {
                "collection_id": collection.collection_id,
                "title": "Pricing Details",
                "content": "We offer monthly and annual subscription plans starting at $29/month"
            }
        ]
        
        created_items = []
        for item_data in items:
            item = item_repo.create(db, obj_in=item_data)
            created_items.append(item)
        
        # Generate embeddings
        vector_repo = VectorRepository()
        for item in created_items:
            # Generate mock embedding (normally from LLM)
            mock_vector = [0.1] * 384  # 384-dimensional vector
            
            # Store embedding
            embedding_data = {
                "item_id": item.item_id,
                "vector": json.dumps(mock_vector)
            }
            db.execute(
                f"INSERT INTO vector_embeddings (item_id, vector, embedding_id) "
                f"VALUES ('{item.item_id}', '{json.dumps(mock_vector)}', '{item.item_id}')"
            )
            db.commit()
    
    # Test similarity search
    query = "How do I contact support?"
    results = await similarity_service.find_similar(client_id, query, limit=2)
    
    print(f"Query: {query}")
    print(f"Found {len(results)} results:")
    for result in results:
        print(f"- {result['title']} (similarity: {result['similarity']:.4f})")
        print(f"  Content: {result['content'][:100]}...")

if __name__ == "__main__":
    asyncio.run(test_vector_search())