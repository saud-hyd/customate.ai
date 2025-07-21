# backend/app/services/llm/llm_factory.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.llm.llm_service import LLMService
from app.services.llm.openai_service import OpenAIService
from app.core.config.settings import settings
from app.core import logger

class LLMFactory:
    """Factory class for creating OpenAI LLM service instances."""
    
    @staticmethod
    def create_llm_service(
        db: Session, 
        client_id: str, 
        override_settings: Optional[Dict[str, Any]] = None
    ) -> LLMService:
        """
        Create an OpenAI LLM service instance.
        
        Args:
            db: Database session
            client_id: Client ID  
            override_settings: Optional settings overrides
            
        Returns:
            Configured OpenAI service instance
        """
        if not settings.OPENAI_API_KEY:
            logger.error("OpenAI API key not configured!")
            raise ValueError("OpenAI API key is required but not configured")
        
        # Use GPT-4.1-mini for optimal performance and cost
        model_name = "gpt-4.1-mini-2025-04-14"
        
        logger.info(f"Creating OpenAI service with model: {model_name} for client: {client_id}")
        return OpenAIService(model_name=model_name)
    
    @staticmethod
    def get_embedding_service(client_id: str = None) -> OpenAIService:
        """
        Create OpenAI service optimized for embeddings.
        
        Args:
            client_id: Optional client ID for logging
            
        Returns:
            OpenAI service configured for embeddings
        """
        if not settings.OPENAI_API_KEY:
            logger.error("OpenAI API key not configured for embeddings!")
            raise ValueError("OpenAI API key is required for embeddings")
        
        logger.info(f"Creating OpenAI embedding service for client: {client_id}")
        return OpenAIService(model_name="gpt-4.1-mini-2025-04-14")