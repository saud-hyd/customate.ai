# app/core/config/multilingual_settings.py
from pydantic_settings import BaseSettings
from typing import List, Optional

class MultilingualSettings(BaseSettings):
    """Configuration for multilingual search functionality."""
    
    # Main toggle - set to False to completely disable multilingual search
    MULTILINGUAL_SEARCH_ENABLED: bool = True
    
    # Supported languages for automatic detection and translation
    SUPPORTED_LANGUAGES: List[str] = ["en", "fr", "de", "es", "it", "pt", "nl"]
    
    # Default language when detection fails
    DEFAULT_LANGUAGE: str = "en"
    
    # Maximum number of translated queries to generate per search
    MAX_TRANSLATED_QUERIES: int = 3
    
    # Whether to cache translations (reduces API calls)
    ENABLE_TRANSLATION_CACHE: bool = True
    
    # Timeout for translation API calls (seconds)
    TRANSLATION_TIMEOUT: int = 15
    
    # Fallback to original query if translation fails
    FALLBACK_ON_TRANSLATION_ERROR: bool = True
    
    # Log multilingual search operations for debugging
    LOG_MULTILINGUAL_OPERATIONS: bool = True
    
    class Config:
        env_file = ".env"
        env_prefix = "MULTILINGUAL_"

# Global instance
multilingual_settings = MultilingualSettings()