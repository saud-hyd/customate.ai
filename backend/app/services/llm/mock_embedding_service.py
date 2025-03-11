# app/services/llm/mock_embedding_service.py
import numpy as np
import hashlib
from typing import List

class MockEmbeddingService:
    """
    Mock embedding service that generates deterministic vectors
    for testing when the actual embedding API is unavailable.
    """
    
    def __init__(self, dimensions: int = 384):
        self.dimensions = dimensions
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate deterministic but realistic mock embeddings based on text.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats
        """
        # Create a stable hash of the text
        text_bytes = text.encode('utf-8')
        hash_object = hashlib.md5(text_bytes)
        seed = int(hash_object.hexdigest(), 16) % (2**32)
        
        # Seed random generator with text hash for deterministic output
        np.random.seed(seed)
        
        # Generate embedding vector
        embedding = np.random.normal(0, 0.1, self.dimensions).tolist()
        
        # Normalize to unit length (common for embeddings)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = [x / norm for x in embedding]
            
        return embedding