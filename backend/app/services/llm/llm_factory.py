# backend/app/services/llm/llm_factory.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.llm.llm_service import LLMService
from app.services.llm.openai_service import OpenAIService
from app.core.config.settings import settings
from app.core import logger

class LLMFactory:
    """Factory class for creating OpenAI-only LLM service instances."""
    
    @staticmethod
    def create_llm_service(
        db: Session, 
        client_id: str, 
        override_settings: Optional[Dict[str, Any]] = None
    ) -> LLMService:
        """
        Create an OpenAI LLM service instance.
        
        Args:
            db: Database session (kept for compatibility)
            client_id: Client ID (kept for compatibility)
            override_settings: Optional settings overrides (kept for compatibility)
            
        Returns:
            Configured OpenAI service instance
        """
        # Always return OpenAI service with GPT-4.1-mini-2025-04-14
        if not settings.OPENAI_API_KEY:
            logger.error("OpenAI API key not configured!")
            raise ValueError("OpenAI API key is required but not configured")
        
        # Use the specific model you want
        model_name = "gpt-4.1-mini-2025-04-14"
        
        logger.info(f"Creating OpenAI service with model: {model_name}")
        return OpenAIService(model_name=model_name)
    
    @staticmethod
    def _create_service_for_provider(provider: str, model: Optional[str] = None) -> LLMService:
        """
        Create an OpenAI LLM service (ignores provider parameter).
        
        Args:
            provider: Ignored - always creates OpenAI service
            model: Ignored - always uses GPT-4.1-mini-2025-04-14
            
        Returns:
            Configured OpenAI service instance
        """
        if not settings.OPENAI_API_KEY:
            logger.error("OpenAI API key not configured!")
            raise ValueError("OpenAI API key is required but not configured")
        
        # Force use of specific model
        model_name = "gpt-4.1-mini-2025-04-14"
        logger.info(f"Creating OpenAI service with forced model: {model_name}")
        return OpenAIService(model_name=model_name)