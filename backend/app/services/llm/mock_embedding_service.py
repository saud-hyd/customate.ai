# backend/app/services/llm/mock_embedding_service.py
# Replace the entire class with this fixed version:

import numpy as np
import hashlib
import os
from typing import List

class MockEmbeddingService:
    """
    Mock embedding service that generates deterministic vectors
    for testing when the actual embedding API is unavailable.
    """
    
    def __init__(self, dimensions: int = None):
        # CRITICAL FIX: Respect environment variable for dimensions
        if dimensions is None:
            # Check environment variable first
            env_dimensions = os.environ.get("MOCK_EMBEDDING_DIMENSIONS")
            if env_dimensions:
                try:
                    dimensions = int(env_dimensions)
                except (ValueError, TypeError):
                    dimensions = 512  # Default fallback
            else:
                dimensions = 512  # Default fallback
        
        self.dimensions = dimensions
        print(f"🔧 MockEmbeddingService initialized with {self.dimensions} dimensions")
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate deterministic but realistic mock embeddings based on text.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats with consistent dimensions
        """
        # Create a stable hash of the text
        text_bytes = text.encode('utf-8')
        hash_object = hashlib.md5(text_bytes)
        seed = int(hash_object.hexdigest(), 16) % (2**32)
        
        # Seed random generator with text hash for deterministic output
        np.random.seed(seed)
        
        # Generate embedding vector with correct dimensions
        embedding = np.random.normal(0, 0.1, self.dimensions).tolist()
        
        # Normalize to unit length (common for embeddings)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = [x / norm for x in embedding]
        
        print(f"🔧 MockEmbeddingService generated {len(embedding)} dimensions")
        return embedding