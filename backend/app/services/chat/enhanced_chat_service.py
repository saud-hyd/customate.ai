# backend/app/services/chat/enhanced_chat_service.py
from typing import Dict, Any, List, Optional, AsyncGenerator
import time
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.repositories.chat_repository import ChatSessionRepository, ChatMessageRepository
from app.services.chat.context_manager import ContextManager
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_service import LLMService
from app.core import logger

class EnhancedChatService:
    """
    Simplified chat service focused on OpenAI + RAG.
    
    This service provides:
    - RAG-based knowledge retrieval 
    - OpenAI streaming and regular chat responses
    - Natural conversation handling
    - Session management
    """
    
    def __init__(
        self,
        db: Session,
        search_service: EnhancedSearchService,
        llm_service: LLMService,
        context_manager: Optional[ContextManager] = None
    ):
        """Simplified initialization - core services only."""
        self.db = db
        self.search_service = search_service
        self.llm_service = llm_service
        self.context_manager = context_manager or ContextManager()
        self.session_repo = ChatSessionRepository()
        self.message_repo = ChatMessageRepository()
        
    
    async def process_message(
        self,
        client_id: str,
        user_message: str, 
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Non-streaming version - collects streaming response into single result.
        Used by voice agent calls for complete responses.
        """
        # ADD THIS LINE - Extract channel information
        channel = user_info.get("channel", "web") if user_info else "web"
        
        full_response = ""
        response_data = {}
        
        async for chunk in self.process_message_stream(
            client_id=client_id,
            user_message=user_message,
            session_id=session_id,
            user_info=user_info
        ):
            if chunk.get("type") == "info":
                response_data.update(chunk)
            elif chunk.get("type") == "chunk":
                full_response += chunk.get("content", "")
            elif chunk.get("type") == "done":
                final_message = chunk.get("message", {})
                full_response = final_message.get("content", full_response)
                response_data["message"] = final_message
                break
        
        # ADD CHANNEL INFO TO RESPONSE METADATA
        if "message" in response_data and "metadata" not in response_data:
            response_data["metadata"] = {}
        
        if "message" in response_data:
            response_data["metadata"]["channel"] = channel
            response_data["metadata"]["is_voice_call"] = (channel == "voice")
        
        return response_data
    
    async def process_message_stream(
        self,
        client_id: str,
        user_message: str,
        session_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Simplified streaming response - let OpenAI handle context naturally.
        """
        start_time = time.time()
        message_id = str(uuid.uuid4())
        
        channel = user_info.get("channel", "web") if user_info else "web"
        
        # Get or create session
        session = self._get_or_create_session(client_id, session_id, user_info)
        session_id = session.session_id
        
        user_message_metadata = user_info.copy() if user_info else {}
        user_message_metadata["channel"] = channel
        
        # Save user message
        user_message_db = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "user", 
            "content": user_message,
            "message_metadata": user_info,
            "created_at": datetime.utcnow()
        })
        
        # Get conversation history
        context = self.context_manager.get_context(self.db, session_id)
        conversation_history = self.context_manager.format_history(context, self.db, session_id)
        
        # Simple knowledge search
        knowledge_context = []
        knowledge_used = False
        
        try:
            search_results = await self.search_service.hybrid_search(
                client_id=client_id,
                query_text=user_message,
                limit=5                
            )
            
            if search_results.get("results"):
                knowledge_used = True
                knowledge_context = [
                    {
                        "title": item["title"],
                        "content": item["content"], 
                        "source": item.get("collection_name", "Knowledge Base")
                    }
                    for item in search_results["results"]
                ]
                
        except Exception as e:
            logger.error(f"Knowledge search error: {str(e)}")
        
        # Send initial info
        yield {
            "type": "info",
            "session_id": session_id,
            "knowledge_used": knowledge_used,
            "integration_used": False,
            "message_id": message_id
        }
        
        # Generate response with OpenAI
        full_response = ""
        
        try:
            async for content_chunk in self.llm_service.generate_response_stream(
                user_message=user_message,
                conversation_history=conversation_history,
                knowledge_context=knowledge_context if knowledge_used else None,
                industry_context=None  # Let OpenAI handle context naturally
            ):
                full_response += content_chunk
                yield {
                    "type": "chunk",
                    "content": content_chunk,
                    "message_id": message_id
                }
                
        except Exception as e:
            logger.error(f"LLM generation error: {str(e)}")
            # Simple error response
            error_response = "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?"
            full_response = error_response
            yield {
                "type": "chunk", 
                "content": error_response,
                "message_id": message_id
            }
                    
        # Save assistant message
        assistant_msg = self.message_repo.create(self.db, obj_in={
            "session_id": session_id,
            "role": "assistant",
            "content": full_response,
            "message_id": message_id,
            "message_metadata": {
                "knowledge_used": knowledge_used,
                "response_time_ms": int((time.time() - start_time) * 1000),
            },
            "created_at": datetime.utcnow()
        })
        
        # Update context
        self.context_manager.update_context(
            self.db, 
            session_id, 
            user_message, 
            full_response,
        )
        
        # Send completion
        yield {
            "type": "done",
            "message": {
                "id": assistant_msg.message_id,
                "content": full_response,
                "role": "assistant",
                "created_at": assistant_msg.created_at.isoformat()
            },
            "session_id": session_id,
            "knowledge_used": knowledge_used
        }
    
    def get_chat_history(
        self,
        client_id: str,
        session_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get chat history for a session."""
        # Get session
        session = self.session_repo.get_by_session_id(self.db, session_id)
        if not session or session.client_id != client_id:
            return []
        
        # Get messages
        messages = self.message_repo.get_by_session_id(self.db, session_id, limit)
        
        # Format messages
        return [
            {
                "id": message.message_id,
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
                "metadata": message.message_metadata
            }
            for message in messages
        ]
    
    def _get_or_create_session(
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
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return self.session_repo.create(self.db, obj_in=session_data)