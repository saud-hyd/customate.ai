# test_embeddings.py
import os
import asyncio
import numpy as np
from app.services.llm.deepseek_service import DeepSeekService

# Set this to use the mock service instead of the real API
os.environ["MOCK_EMBEDDINGS"] = "true"

async def test_embeddings():
    print("Testing embedding generation with mock service...")
    service = DeepSeekService()
    
    # Test a few different texts to show deterministic behavior
    test_texts = [
        "Customer support information",
        "Pricing plans and details",
        "Technical documentation",
        "Customer support information",  # Duplicate to show same text produces same vector
    ]
    
    results = {}
    
    for text in test_texts:
        embedding = await service.generate_embeddings(text)
        
        # Calculate vector stats
        if embedding:
            norm = np.linalg.norm(embedding)
            mean = np.mean(embedding)
            std = np.std(embedding)
            
            results[text] = {
                "dimensions": len(embedding),
                "sample": embedding[:5],
                "norm": norm,
                "mean": mean,
                "std": std,
                "hash": hash(tuple(embedding[:5]))  # Hash of first 5 values to check determinism
            }
    
    # Print results
    for text, result in results.items():
        print(f"\nText: \"{text}\"")
        print(f"Dimensions: {result['dimensions']}")
        print(f"Sample (first 5): {result['sample']}")
        print(f"Norm: {result['norm']:.6f}")
        print(f"Mean: {result['mean']:.6f}")
        print(f"Std: {result['std']:.6f}")
        print(f"Hash: {result['hash']}")
    
    # Check if duplicate texts produce the same embedding
    if "Customer support information" in results:
        text = "Customer support information"
        first_hash = results[text]["hash"]
        duplicate_count = sum(1 for r in results.values() if r["hash"] == first_hash)
        print(f"\nDeterministic check: {duplicate_count} embeddings with matching hash (should be 2)")

if __name__ == "__main__":
    asyncio.run(test_embeddings())