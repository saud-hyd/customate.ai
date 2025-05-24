# backend/app/services/chat/response_generator.py
from typing import Dict, Any, List, Optional, AsyncGenerator
from sqlalchemy.orm import Session
import asyncio
import time
import uuid
import json
import logging

from app.services.llm.llm_service import LLMService
from app.services.knowledge.similarity_service import SimilarityService
from app.services.industry.industry_factory import IndustryFactory
from app.repositories.chat_repository import ChatSessionRepository, ChatMessageRepository
from app.services.chat.context_manager import ContextManager
from app.core import logger

class StreamingResponseGenerator:
    """
    Enhanced response generator with streaming support for widget integration.
    
    This service provides both regular and streaming response generation,
    integrating with knowledge base, LLM services, and industry-specific processing.
    """
    
    def __init__(
        self,
        db: Session,
        llm_service: LLMService,
        similarity_service: Optional[SimilarityService] = None,
        industry_factory: Optional[IndustryFactory] = None,
        context_manager: Optional[ContextManager] = None
    ):
        self.db = db
        self.llm_service = llm_service
        self.similarity_service = similarity_service
        self.industry_factory = industry_factory or self._create_default_industry_factory()
        self.context_manager = context_manager or self._create_default_context_manager()
        self.session_repo = ChatSessionRepository()
        self.message_repo = ChatMessageRepository()
    
    async def generate_streaming_response(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a streaming response for the widget.
        
        Args:
            client_id: Client ID
            user_message: User's message
            session_id: Optional session ID
            user_info: Optional user information
            
        Yields:
            Response chunks as dictionaries
        """
        start_time = time.time()
        message_id = str(uuid.uuid4())
        
        try:
            # Get or create session
            session = await self._get_or_create_session(client_id, session_id, user_info)
            actual_session_id = session.session_id
            
            # Yield session info
            yield {
                "type": "info",
                "session_id": actual_session_id,
                "message_id": message_id,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            
            # Save user message
            user_msg = self._save_message(actual_session_id, "user", user_message)
            
            # Get conversation context
            context = self.context_manager.get_context(self.db, actual_session_id)
            
            # Get industry-specific processing
            industry_service = self.industry_factory.get_industry_service(client_id)
            
            # Extract intent and entities
            intent, entities = self._extract_intent_entities(industry_service, user_message)
            
            # Search for relevant knowledge if similarity service is available
            knowledge_context = []
            knowledge_used = False
            
            if self.similarity_service:
                try:
                    # Try different method signatures for compatibility
                    if hasattr(self.similarity_service, 'hybrid_search'):
                        search_results = await self.similarity_service.hybrid_search(
                            client_id=client_id,
                            query_text=user_message,
                            limit=3
                        )
                        knowledge_results = search_results.get("results", [])
                    elif hasattr(self.similarity_service, 'search'):
                        knowledge_results = await self.similarity_service.search(
                            client_id=client_id,
                            query=user_message,
                            limit=3
                        )
                    else:
                        knowledge_results = []
                    
                    if knowledge_results:
                        knowledge_used = True
                        knowledge_context = [
                            {
                                "title": item.get("title", ""),
                                "content": item.get("content", ""),
                                "source": item.get("collection_name", "Knowledge Base"),
                                "relevance": "high" if item.get("score", 0) > 0.8 else "medium"
                            }
                            for item in knowledge_results[:3]
                        ]
                except Exception as e:
                    logger.warning(f"Knowledge search failed: {str(e)}")
            
            # Format conversation history
            conversation_history = self.context_manager.format_history(context)
            
            # Check if LLM service supports streaming
            if hasattr(self.llm_service, 'generate_response_stream'):
                # Use streaming LLM
                full_response = ""
                
                async for chunk in self.llm_service.generate_response_stream(
                    user_message=user_message,
                    conversation_history=conversation_history,
                    knowledge_context=knowledge_context if knowledge_used else None,
                    industry_context={
                        "instructions": industry_service.get_prompting_strategy().get("system_prompt", ""),
                        "intent": intent,
                        "industry": industry_service.__class__.__name__
                    }
                ):
                    full_response += chunk
                    yield {
                        "type": "chunk",
                        "content": chunk,
                        "message_id": message_id
                    }
                    
                    # Small delay to prevent overwhelming the client
                    await asyncio.sleep(0.01)
            
            else:
                # Fallback to regular LLM with simulated streaming
                logger.info("Using non-streaming LLM with simulated streaming")
                
                response = await self.llm_service.generate_response(
                    user_message=user_message,
                    conversation_history=conversation_history,
                    knowledge_context=knowledge_context if knowledge_used else None,
                    industry_context={
                        "instructions": industry_service.get_prompting_strategy().get("system_prompt", ""),
                        "intent": intent,
                        "industry": industry_service.__class__.__name__
                    }
                )
                
                full_response = response.get("content", "I'm sorry, I couldn't generate a response.")
                
                # Simulate streaming by sending response in chunks
                words = full_response.split()
                current_chunk = ""
                
                for i, word in enumerate(words):
                    current_chunk += word + " "
                    
                    # Send chunk every 3 words or at the end
                    if i % 3 == 2 or i == len(words) - 1:
                        yield {
                            "type": "chunk",
                            "content": current_chunk,
                            "message_id": message_id
                        }
                        current_chunk = ""
                        await asyncio.sleep(0.05)  # Simulate typing delay
            
            # Apply industry-specific post-processing
            if hasattr(industry_service, 'process_response'):
                final_response = industry_service.process_response(full_response, user_message, intent)
            else:
                final_response = full_response
            
            # Save assistant message
            assistant_msg = self._save_message(
                actual_session_id, 
                "assistant", 
                final_response,
                {
                    "knowledge_used": knowledge_used,
                    "intent": intent,
                    "entities": entities,
                    "response_time_ms": int((time.time() - start_time) * 1000)
                }
            )
            
            # Update conversation context
            self.context_manager.update_context(
                self.db,
                actual_session_id,
                user_message,
                final_response,
                {
                    "knowledge_used": knowledge_used,
                    "intent": intent,
                    "entities": entities
                }
            )
            
            # Send completion
            yield {
                "type": "complete",
                "content": final_response,
                "message_id": message_id,
                "session_id": actual_session_id,
                "knowledge_used": knowledge_used,
                "intent": intent,
                "entities": entities
            }
            
            # Send final done signal
            yield {
                "type": "done",
                "message": {
                    "id": assistant_msg.message_id,
                    "content": final_response,
                    "role": "assistant",
                    "created_at": assistant_msg.created_at.isoformat()
                },
                "session_id": actual_session_id,
                "knowledge_used": knowledge_used
            }
            
        except Exception as e:
            logger.error(f"Error in streaming response generation: {str(e)}")
            yield {
                "type": "error",
                "error": "I'm sorry, I encountered an error while processing your request. Please try again later.",
                "message_id": message_id,
                "details": str(e) if logger.level <= logging.DEBUG else None
            }
    
    async def generate_response(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a regular (non-streaming) response.
        
        Args:
            client_id: Client ID
            user_message: User's message
            session_id: Optional session ID
            user_info: Optional user information
            
        Returns:
            Response dictionary
        """
        start_time = time.time()
        
        try:
            # Get or create session
            session = await self._get_or_create_session(client_id, session_id, user_info)
            actual_session_id = session.session_id
            
            # Save user message
            user_msg = self._save_message(actual_session_id, "user", user_message)
            
            # Get conversation context
            context = self.context_manager.get_context(self.db, actual_session_id)
            
            # Get industry-specific processing
            industry_service = self.industry_factory.get_industry_service(client_id)
            
            # Extract intent and entities
            intent, entities = self._extract_intent_entities(industry_service, user_message)
            
            # Search for relevant knowledge
            knowledge_context = []
            knowledge_used = False
            
            if self.similarity_service:
                try:
                    if hasattr(self.similarity_service, 'hybrid_search'):
                        search_results = await self.similarity_service.hybrid_search(
                            client_id=client_id,
                            query_text=user_message,
                            limit=3
                        )
                        knowledge_results = search_results.get("results", [])
                    elif hasattr(self.similarity_service, 'search'):
                        knowledge_results = await self.similarity_service.search(
                            client_id=client_id,
                            query=user_message,
                            limit=3
                        )
                    else:
                        knowledge_results = []
                    
                    if knowledge_results:
                        knowledge_used = True
                        knowledge_context = [
                            {
                                "title": item.get("title", ""),
                                "content": item.get("content", ""),
                                "source": item.get("collection_name", "Knowledge Base"),
                                "relevance": "high" if item.get("score", 0) > 0.8 else "medium"
                            }
                            for item in knowledge_results[:3]
                        ]
                except Exception as e:
                    logger.warning(f"Knowledge search failed: {str(e)}")
            
            # Format conversation history
            conversation_history = self.context_manager.format_history(context)
            
            # Generate response using LLM
            response = await self.llm_service.generate_response(
                user_message=user_message,
                conversation_history=conversation_history,
                knowledge_context=knowledge_context if knowledge_used else None,
                industry_context={
                    "instructions": industry_service.get_prompting_strategy().get("system_prompt", ""),
                    "intent": intent,
                    "industry": industry_service.__class__.__name__
                }
            )
            
            content = response.get("content", "I'm sorry, I couldn't generate a response.")
            
            # Apply industry-specific post-processing
            if hasattr(industry_service, 'process_response'):
                final_response = industry_service.process_response(content, user_message, intent)
            else:
                final_response = content
            
            # Save assistant message
            assistant_msg = self._save_message(
                actual_session_id,
                "assistant",
                final_response,
                {
                    "knowledge_used": knowledge_used,
                    "intent": intent,
                    "entities": entities,
                    "response_time_ms": int((time.time() - start_time) * 1000)
                }
            )
            
            # Update conversation context
            self.context_manager.update_context(
                self.db,
                actual_session_id,
                user_message,
                final_response,
                {
                    "knowledge_used": knowledge_used,
                    "intent": intent,
                    "entities": entities
                }
            )
            
            return {
                "message": {
                    "id": assistant_msg.message_id,
                    "content": final_response,
                    "role": "assistant",
                    "created_at": assistant_msg.created_at.isoformat()
                },
                "session_id": actual_session_id,
                "knowledge_used": knowledge_used,
                "intent": intent,
                "entities": entities
            }
            
        except Exception as e:
            logger.error(f"Error in response generation: {str(e)}")
            return {
                "message": {
                    "id": f"error-{int(time.time())}",
                    "content": "I'm sorry, I encountered an error while processing your request. Please try again later.",
                    "role": "assistant",
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                },
                "session_id": session_id or f"session-{int(time.time())}",
                "knowledge_used": False,
                "error": str(e)
            }
    
    async def _get_or_create_session(
        self,
        client_id: str,
        session_id: Optional[str],
        user_info: Optional[Dict[str, Any]]
    ):
        """Get existing session or create a new one."""
        if session_id:
            session = self.session_repo.get_by_session_id(self.db, session_id)
            if session and session.client_id == client_id:
                return session
        
        # Create new session
        session_data = {
            "client_id": client_id,
            "user_id": user_info.get("user_id") if user_info else None,
            "ip_address": user_info.get("ip_address") if user_info else None,
            "user_agent": user_info.get("user_agent") if user_info else None,
            "referrer": user_info.get("referrer") if user_info else None,
        }
        
        session = self.session_repo.create(self.db, obj_in=session_data)
        self.context_manager.initialize_context(self.db, session.session_id)
        
        return session
    
    def _save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Save a message to the database."""
        message_data = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "message_metadata": metadata
        }
        
        return self.message_repo.create(self.db, obj_in=message_data)
    
    def _extract_intent_entities(self, industry_service, user_message):
        """Extract intent and entities from user message."""
        try:
            if hasattr(industry_service, 'extract_intent_entities'):
                return industry_service.extract_intent_entities(user_message)
            else:
                # Default extraction
                return "general_inquiry", []
        except Exception as e:
            logger.warning(f"Intent/entity extraction failed: {str(e)}")
            return "general_inquiry", []
    
    def _create_default_industry_factory(self):
        """Create a default industry factory if none provided."""
        class DefaultIndustryFactory:
            def get_industry_service(self, client_id):
                class DefaultIndustryService:
                    def extract_intent_entities(self, message):
                        return "general_inquiry", []
                    
                    def process_response(self, response, message, intent):
                        return response
                    
                    def get_prompting_strategy(self):
                        return {
                            "system_prompt": "You are a helpful AI assistant for customer support."
                        }
                
                return DefaultIndustryService()
        
        return DefaultIndustryFactory()
    
    def _create_default_context_manager(self):
        """Create a default context manager if none provided."""
        class DefaultContextManager:
            def get_context(self, db, session_id):
                return {"history": []}
            
            def update_context(self, db, session_id, user_msg, assistant_msg, updates=None):
                pass
            
            def initialize_context(self, db, session_id):
                return {"history": []}
            
            def format_history(self, context):
                return context.get("history", [])
        
        return DefaultContextManager()