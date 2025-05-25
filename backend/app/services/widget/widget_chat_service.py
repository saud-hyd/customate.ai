# backend/app/services/widget/widget_chat_service.py
from typing import Dict, Any, Optional, AsyncGenerator
import logging
import time
import json
from sqlalchemy.orm import Session

from app.services.chat.response_generator import StreamingResponseGenerator
from app.services.llm.llm_factory import LLMFactory
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.context_manager import ContextManager
from app.repositories.client_repository import ClientRepository, ClientSettingsRepository
from app.core import logger

class WidgetChatService:
    """
    Specialized chat service for widget interactions.
    Integrates with existing chat services while providing widget-specific functionality.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.client_repo = ClientRepository()
        self.settings_repo = ClientSettingsRepository()
        
    async def get_widget_settings(self, client_id: str) -> Dict[str, Any]:
        """Get widget settings for a client."""
        try:
            # Get client settings
            client = self.client_repo.get_by_client_id(self.db, client_id)
            if not client:
                return self._get_default_settings()
            
            settings = self.settings_repo.get_by_client_id(self.db, client_id)
            if not settings:
                return self._get_default_settings()
            
            # Format settings for widget
            widget_settings = {
                "primary_color": settings.primary_color or "#ea580c",
                "chatbot_name": settings.chatbot_name or "AI Assistant",
                "greeting_message": settings.greeting_message or "Hello! How can I help you today?",
                "widget_position": settings.widget_position or "bottom-right",
                "show_typing_indicator": settings.enable_typing_indicator if settings.enable_typing_indicator is not None else True,
                "enable_suggestions": settings.enable_suggestions if settings.enable_suggestions is not None else True,
                "llm_provider": settings.custom_settings.get("llm_provider", "deepseek") if settings.custom_settings else "deepseek",
                "llm_model": settings.custom_settings.get("llm_model", "deepseek-chat") if settings.custom_settings else "deepseek-chat"
            }
            
            return widget_settings
            
        except Exception as e:
            logger.error(f"Error getting widget settings: {str(e)}")
            return self._get_default_settings()
    
    async def process_message_stream(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process a message with streaming response."""
        try:
            # Get client settings for LLM configuration
            settings = await self.get_widget_settings(client_id)
            llm_settings = {
                "llm_provider": settings.get("llm_provider", "deepseek"),
                "llm_model": settings.get("llm_model", "deepseek-chat")
            }
            
            # Create LLM service based on client settings
            llm_service = LLMFactory.create_llm_service(
                self.db, 
                client_id, 
                override_settings=llm_settings
            )
            
            # Create other required services
            search_service = None
            try:
                search_service = EnhancedSearchService(self.db)
            except Exception as e:
                logger.warning(f"Could not initialize search service: {e}")
            
            industry_factory = IndustryFactory()
            context_manager = ContextManager()
            
            # Create streaming response generator
            response_generator = StreamingResponseGenerator(
                db=self.db,
                llm_service=llm_service,
                similarity_service=search_service,
                industry_factory=industry_factory,
                context_manager=context_manager
            )
            
            # Generate streaming response
            async for chunk in response_generator.generate_streaming_response(
                client_id=client_id,
                user_message=user_message,
                session_id=session_id,
                user_info=user_info
            ):
                yield chunk
                
        except Exception as e:
            logger.error(f"Error in widget message processing: {str(e)}")
            yield {
                "type": "error",
                "error": f"I'm sorry, I encountered an error while processing your request: {str(e)}",
                "message_id": f"error-{int(time.time())}"
            }
    
    async def process_message(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a message with regular response."""
        try:
            # Get client settings for LLM configuration
            settings = await self.get_widget_settings(client_id)
            llm_settings = {
                "llm_provider": settings.get("llm_provider", "deepseek"),
                "llm_model": settings.get("llm_model", "deepseek-chat")
            }
            
            # Create LLM service based on client settings
            llm_service = LLMFactory.create_llm_service(
                self.db, 
                client_id, 
                override_settings=llm_settings
            )
            
            # Create other required services
            search_service = None
            try:
                search_service = EnhancedSearchService(self.db)
            except Exception as e:
                logger.warning(f"Could not initialize search service: {e}")
            
            industry_factory = IndustryFactory()
            context_manager = ContextManager()
            
            # Create response generator
            response_generator = StreamingResponseGenerator(
                db=self.db,
                llm_service=llm_service,
                similarity_service=search_service,
                industry_factory=industry_factory,
                context_manager=context_manager
            )
            
            # Generate response
            return await response_generator.generate_response(
                client_id=client_id,
                user_message=user_message,
                session_id=session_id,
                user_info=user_info
            )
            
        except Exception as e:
            logger.error(f"Error in widget message processing: {str(e)}")
            return {
                "message": {
                    "id": f"error-{int(time.time())}",
                    "content": f"I'm sorry, I encountered an error while processing your request: {str(e)}",
                    "role": "assistant",
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                },
                "session_id": session_id or f"session-{int(time.time())}",
                "error": str(e)
            }
    
    def _get_default_settings(self) -> Dict[str, Any]:
        """Get default widget settings."""
        return {
            "primary_color": "#ea580c",
            "chatbot_name": "AI Assistant",
            "greeting_message": "Hello! How can I help you today?",
            "widget_position": "bottom-right",
            "show_typing_indicator": True,
            "enable_suggestions": True,
            "llm_provider": "deepseek",
            "llm_model": "deepseek-chat"
        }