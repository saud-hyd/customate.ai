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
from app.repositories.chat_repository import ChatSessionRepository, ChatMessageRepository
from app.services.chat.context_manager import ContextManager
from app.core import logger

class StreamingResponseGenerator:
    """
    RAG-focused response generator with streaming support and off-topic protection.
    
    This service provides both regular and streaming response generation,
    integrating with knowledge base and LLM services. It ensures responses
    stay focused on business/company topics using RAG relevance checks.
    """
    
    def __init__(
        self,
        db: Session,
        llm_service: LLMService,
        similarity_service: Optional[SimilarityService] = None,
        context_manager: Optional[ContextManager] = None
    ):
        self.db = db
        self.llm_service = llm_service
        self.similarity_service = similarity_service
        self.context_manager = context_manager or self._create_default_context_manager()
        self.session_repo = ChatSessionRepository()
        self.message_repo = ChatMessageRepository()
        
        # Relevance threshold for knowledge base hits
        self.relevance_threshold = 0.3  # Adjust based on your needs
        
        # Business-focused fallback responses
        self.fallback_responses = [
            "I can only help with questions related to our products and services. Is there something specific about our business I can assist you with?",
            "I don't have information about that topic. I'm here to help with questions about our company, products, or services. What would you like to know?",
            "That's outside my area of expertise. I specialize in helping with our business-related inquiries. How can I assist you with our products or services?",
            "I focus on providing information about our company and offerings. Is there something business-related I can help you with instead?"
        ]
    
    async def generate_streaming_response(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a streaming response with RAG and off-topic protection.
        
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
            
            # Search for relevant knowledge
            knowledge_context = []
            knowledge_used = False
            max_relevance_score = 0.0
            
            if self.similarity_service:
                try:
                    # Try different method signatures for compatibility
                    if hasattr(self.similarity_service, 'hybrid_search'):
                        search_results = await self.similarity_service.hybrid_search(
                            client_id=client_id,
                            query_text=user_message,
                            limit=5
                        )
                        knowledge_results = search_results.get("results", [])
                    elif hasattr(self.similarity_service, 'search'):
                        knowledge_results = await self.similarity_service.search(
                            client_id=client_id,
                            query=user_message,
                            limit=5
                        )
                    else:
                        knowledge_results = []
                    
                    if knowledge_results:
                        # Check relevance scores
                        max_relevance_score = max([item.get("score", 0) for item in knowledge_results])
                        
                        if max_relevance_score >= self.relevance_threshold:
                            knowledge_used = True
                            knowledge_context = [
                                {
                                    "title": item.get("title", ""),
                                    "content": item.get("content", ""),
                                    "source": item.get("collection_name", "Knowledge Base"),
                                    "relevance": "high" if item.get("score", 0) > 0.7 else "medium"
                                }
                                for item in knowledge_results[:3]
                                if item.get("score", 0) >= self.relevance_threshold
                            ]
                        
                except Exception as e:
                    logger.warning(f"Knowledge search failed: {str(e)}")
            
            # Determine response strategy
            if not knowledge_used:
                # No relevant knowledge found - use business-focused fallback
                final_response = self._get_fallback_response()
                
                # Simulate streaming for fallback response
                words = final_response.split()
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
                        await asyncio.sleep(0.05)
                
            else:
                # Relevant knowledge found - use RAG with LLM
                conversation_history = self.context_manager.format_history(context, self.db, actual_session_id)
                
                # Check if LLM service supports streaming
                if hasattr(self.llm_service, 'generate_response_stream'):
                    # Use streaming LLM
                    full_response = ""
                    
                    async for chunk in self.llm_service.generate_response_stream(
                        user_message=user_message,
                        conversation_history=conversation_history,
                        knowledge_context=knowledge_context,
                        industry_context={
                            "instructions": "You are a helpful business assistant. Use the provided knowledge base to answer questions accurately and professionally. Stay focused on the business context."
                        }
                    ):
                        full_response += chunk
                        yield {
                            "type": "chunk",
                            "content": chunk,
                            "message_id": message_id
                        }
                        await asyncio.sleep(0.01)
                    
                    final_response = full_response
                
                else:
                    # Fallback to regular LLM with simulated streaming
                    response = await self.llm_service.generate_response(
                        user_message=user_message,
                        conversation_history=conversation_history,
                        knowledge_context=knowledge_context,
                        industry_context={
                            "instructions": "You are a helpful business assistant. Use the provided knowledge base to answer questions accurately and professionally. Stay focused on the business context."
                        }
                    )
                    
                    final_response = response.get("content", "I'm sorry, I couldn't generate a response.")
                    
                    # Simulate streaming by sending response in chunks
                    words = final_response.split()
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
                            await asyncio.sleep(0.05)
            
            # Save assistant message
            assistant_msg = self._save_message(
                actual_session_id, 
                "assistant", 
                final_response,
                {
                    "knowledge_used": knowledge_used,
                    "max_relevance_score": max_relevance_score,
                    "knowledge_items_found": len(knowledge_context),
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
                    "max_relevance_score": max_relevance_score
                }
            )
            
            # Send completion
            yield {
                "type": "complete",
                "content": final_response,
                "message_id": message_id,
                "session_id": actual_session_id,
                "knowledge_used": knowledge_used,
                "relevance_score": max_relevance_score
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
        Generate a regular (non-streaming) response with RAG and off-topic protection.
        
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
            
            # Search for relevant knowledge
            knowledge_context = []
            knowledge_used = False
            max_relevance_score = 0.0
            
            if self.similarity_service:
                try:
                    if hasattr(self.similarity_service, 'hybrid_search'):
                        search_results = await self.similarity_service.hybrid_search(
                            client_id=client_id,
                            query_text=user_message,
                            limit=5
                        )
                        knowledge_results = search_results.get("results", [])
                    elif hasattr(self.similarity_service, 'search'):
                        knowledge_results = await self.similarity_service.search(
                            client_id=client_id,
                            query=user_message,
                            limit=5
                        )
                    else:
                        knowledge_results = []
                    
                    if knowledge_results:
                        # Check relevance scores
                        max_relevance_score = max([item.get("score", 0) for item in knowledge_results])
                        
                        if max_relevance_score >= self.relevance_threshold:
                            knowledge_used = True
                            knowledge_context = [
                                {
                                    "title": item.get("title", ""),
                                    "content": item.get("content", ""),
                                    "source": item.get("collection_name", "Knowledge Base"),
                                    "relevance": "high" if item.get("score", 0) > 0.7 else "medium"
                                }
                                for item in knowledge_results[:3]
                                if item.get("score", 0) >= self.relevance_threshold
                            ]
                        
                except Exception as e:
                    logger.warning(f"Knowledge search failed: {str(e)}")
            
            # Determine response strategy
            if not knowledge_used:
                # No relevant knowledge found - use business-focused fallback
                final_response = self._get_fallback_response()
                
            else:
                # Relevant knowledge found - use RAG with LLM
                conversation_history = self.context_manager.format_history(context, self.db, actual_session_id)
                
                response = await self.llm_service.generate_response(
                    user_message=user_message,
                    conversation_history=conversation_history,
                    knowledge_context=knowledge_context,
                    industry_context={
                        "instructions": "You are a helpful business assistant. Use the provided knowledge base to answer questions accurately and professionally. Stay focused on the business context."
                    }
                )
                
                final_response = response.get("content", "I'm sorry, I couldn't generate a response.")
            
            # Save assistant message
            assistant_msg = self._save_message(
                actual_session_id,
                "assistant",
                final_response,
                {
                    "knowledge_used": knowledge_used,
                    "max_relevance_score": max_relevance_score,
                    "knowledge_items_found": len(knowledge_context),
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
                    "max_relevance_score": max_relevance_score
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
                "relevance_score": max_relevance_score,
                "knowledge_items_found": len(knowledge_context)
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
    
    def _get_fallback_response(self) -> str:
        """Get a business-focused fallback response for off-topic queries."""
        import random
        return random.choice(self.fallback_responses)
    
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