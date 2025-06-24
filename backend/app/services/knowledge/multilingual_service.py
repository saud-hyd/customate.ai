# app/services/knowledge/multilingual_service.py
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session

from app.core import logger
from app.core.config.settings import settings
from app.repositories.knowledge_repository import KnowledgeCollectionRepository

class MultilingualQueryService:
    """Service for handling cross-language knowledge base queries."""
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.api_base_url = "https://api.openai.com/v1"
        self.collection_repo = KnowledgeCollectionRepository()
        
    async def detect_language(self, text: str) -> str:
        """Detect the language of input text using OpenAI."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4.1-mini-2025-04-14",
                        "messages": [
                            {
                                "role": "system", 
                                "content": "Detect the language of the user input. Respond with only the 2-letter ISO language code (e.g., 'en', 'fr', 'de', 'es'). If uncertain, respond with 'en'."
                            },
                            {"role": "user", "content": text}
                        ],
                        "max_tokens": 10,
                        "temperature": 0
                    },
                    timeout=10.0,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    detected_lang = result["choices"][0]["message"]["content"].strip().lower()
                    return detected_lang if len(detected_lang) == 2 else "en"
                    
        except Exception as e:
            logger.warning(f"Language detection failed: {e}")
            
        return "en"  # Default to English
    
    async def get_knowledge_base_languages(self, db: Session, client_id: str) -> List[str]:
        """Get all languages present in client's knowledge base."""
        collections = self.collection_repo.get_by_client_id(db, client_id)
        
        # Extract language from collection metadata or infer from names
        languages = set()
        for collection in collections:
            # Check if language is specified in metadata
            if collection.metadata and "language" in collection.metadata:
                languages.add(collection.metadata["language"])
            else:
                # Infer from collection name patterns like "French Content", "Spanish KB"
                name_lower = collection.name.lower()
                if any(keyword in name_lower for keyword in ["french", "français", "fr"]):
                    languages.add("fr")
                elif any(keyword in name_lower for keyword in ["german", "deutsch", "de"]):
                    languages.add("de")
                elif any(keyword in name_lower for keyword in ["spanish", "español", "es"]):
                    languages.add("es")
                elif any(keyword in name_lower for keyword in ["english", "en"]):
                    languages.add("en")
                else:
                    # Default assumption - could be enhanced with content analysis
                    languages.add("en")
        
        return list(languages) if languages else ["en"]
    
    async def translate_query(self, query: str, target_language: str) -> str:
        """Translate query to target language using OpenAI."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4.1-mini-2025-04-14",
                        "messages": [
                            {
                                "role": "system",
                                "content": f"Translate the user's query to {self._get_language_name(target_language)}. Preserve the original meaning and intent. Respond with only the translation, no explanations."
                            },
                            {"role": "user", "content": query}
                        ],
                        "max_tokens": 100,
                        "temperature": 0
                    },
                    timeout=15.0,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    translation = result["choices"][0]["message"]["content"].strip()
                    return translation
                    
        except Exception as e:
            logger.warning(f"Translation failed for '{query}' to {target_language}: {e}")
            
        return query  # Return original if translation fails
    
    async def generate_multilingual_queries(
        self, 
        db: Session, 
        original_query: str, 
        client_id: str
    ) -> List[Dict[str, str]]:
        """Generate translated versions of the query for all knowledge base languages."""
        # Detect input language
        input_language = await self.detect_language(original_query)
        
        # Get available knowledge base languages
        kb_languages = await self.get_knowledge_base_languages(db, client_id)
        
        # Generate queries for each language
        multilingual_queries = []
        
        # Always include original query
        multilingual_queries.append({
            "query": original_query,
            "language": input_language,
            "is_original": True
        })
        
        # Translate to other languages in knowledge base
        for lang in kb_languages:
            if lang != input_language:
                translated_query = await self.translate_query(original_query, lang)
                multilingual_queries.append({
                    "query": translated_query,
                    "language": lang,
                    "is_original": False
                })
        
        logger.info(f"Generated {len(multilingual_queries)} multilingual queries from '{original_query}'")
        return multilingual_queries
    
    def _get_language_name(self, lang_code: str) -> str:
        """Convert language code to full name."""
        language_names = {
            "en": "English",
            "fr": "French", 
            "de": "German",
            "es": "Spanish",
            "it": "Italian",
            "pt": "Portuguese",
            "nl": "Dutch",
            "ru": "Russian",
            "zh": "Chinese",
            "ja": "Japanese",
            "ko": "Korean"
        }
        return language_names.get(lang_code, "English")