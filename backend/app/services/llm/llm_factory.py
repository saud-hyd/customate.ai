# backend/app/services/llm/llm_factory.py
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.llm.llm_service import LLMService
from app.services.llm.deepseek_service import DeepSeekService
from app.services.llm.openai_service import OpenAIService
from app.services.llm.claude_service import ClaudeService
from app.repositories.client_repository import ClientSettingsRepository
from app.core.config.settings import settings
from app.core import logger

class LLMFactory:
    """Factory class for creating LLM service instances based on settings."""
    
    @staticmethod
    def create_llm_service(
        db: Session, 
        client_id: str, 
        override_settings: Optional[Dict[str, Any]] = None
    ) -> LLMService:
        """
        Create an LLM service based on client settings or overrides.
        
        Args:
            db: Database session
            client_id: Client ID
            override_settings: Optional settings overrides
            
        Returns:
            Configured LLM service instance
        """
        # If override settings are provided, use them directly
        if override_settings and "llm_provider" in override_settings:
            provider = override_settings["llm_provider"]
            model = override_settings.get("llm_model")
            logger.info(f"Using override LLM settings: provider={provider}, model={model}")
            return LLMFactory._create_service_for_provider(provider, model)
        
        # Otherwise, load settings from the database
        settings_repo = ClientSettingsRepository()
        settings = settings_repo.get_by_client_id(db, client_id)
        
        if settings and settings.custom_settings:
            # Extract LLM settings from custom settings
            try:
                custom = settings.custom_settings
                provider = custom.get("llm_provider", "deepseek")
                model = custom.get("llm_model")
                logger.info(f"Using client settings: provider={provider}, model={model}")
                return LLMFactory._create_service_for_provider(provider, model)
            except Exception as e:
                logger.error(f"Error creating LLM service from settings: {str(e)}")
        
        # Default to DeepSeek if no valid settings found
        logger.info("Using default DeepSeek service (no settings found)")
        return DeepSeekService()
    
    @staticmethod
    def _create_service_for_provider(provider: str, model: Optional[str] = None) -> LLMService:
        """
        Create an LLM service for a specific provider and model.
        
        Args:
            provider: LLM provider name (deepseek, openai, claude)
            model: Optional specific model name
            
        Returns:
            Configured LLM service instance
        """
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                logger.warning("OpenAI API key not configured. Falling back to DeepSeek.")
                return DeepSeekService()
            if model:
                return OpenAIService(model_name=model)
            return OpenAIService()
        elif provider == "claude":
            if not settings.CLAUDE_API_KEY:
                logger.warning("Claude API key not configured. Falling back to DeepSeek.")
                return DeepSeekService()
            if model:
                # FIX: Changed parameter name from model_name to model to match the ClaudeService constructor
                return ClaudeService(model=model)
            return ClaudeService()
        else:
            # Default to DeepSeek
            return DeepSeekService()