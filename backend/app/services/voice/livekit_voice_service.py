# backend/app/services/voice/livekit_voice_service.py
"""
Simple Voice Agent using function tools - the officially supported way
"""
import os
from typing import Optional
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, function_tool, RunContext
from livekit.plugins import openai, silero
from sqlalchemy.orm import Session

from app.core import logger
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_factory import LLMFactory
from app.services.chat.enhanced_chat_service import EnhancedChatService
from app.services.chat.context_manager import ContextManager


class VoiceAgent:
    """Simple Voice Agent using function tools and your proven RAG"""
    
    def __init__(self, client_id: str, db: Session):
        self.client_id = client_id
        self.db = db
        self.session_id = None
        
        # Use your existing proven RAG services
        self.llm_service = LLMFactory.create_llm_service(db, client_id)
        self.search_service = EnhancedSearchService(self.llm_service)
        self.context_manager = ContextManager()
        
        self.chat_service = EnhancedChatService(
            db=db,
            search_service=self.search_service,
            llm_service=self.llm_service,
            context_manager=self.context_manager
        )
        
        logger.info(f"Voice Agent initialized for client: {client_id}")

    @function_tool
    async def search_knowledge(self, context: RunContext, question: str) -> str:
        """
        Search our knowledge base for information about the user's question.
        Use this for any question about our company, products, or services.
        """
        logger.info(f"Knowledge search: {question[:60]}...")
        
        try:
            # Use your proven RAG pipeline
            response_data = await self.chat_service.process_message(
                client_id=self.client_id,
                user_message=question,
                session_id=self.session_id,
                user_info={
                    "channel": "voice",
                    "source": "voice_agent"
                }
            )
            
            # Update session for continuity
            if not self.session_id and response_data.get("session_id"):
                self.session_id = response_data["session_id"]
            
            # Extract response
            message = response_data.get("message", {})
            content = message.get("content", "")
            
            # Log knowledge usage
            knowledge_used = response_data.get("knowledge_used", False)
            logger.info(f"Knowledge used: {knowledge_used}")
            
            return content or "I don't have specific information about that in our knowledge base."
            
        except Exception as e:
            logger.error(f"Knowledge search error: {e}")
            return "I'm having trouble accessing our knowledge base right now."

    async def entrypoint(self, ctx: JobContext):
        """Simple LiveKit entry point using function tools"""
        await ctx.connect()
        logger.info(f"Voice Agent connected: {ctx.room.name}")
        
        # Simple agent with function tool
        agent = Agent(
            instructions="""You are a helpful customer support representative.

For any questions about our company, products, services, or policies, use the search_knowledge tool to find relevant information.

Guidelines:
- Always use the search_knowledge tool for company-specific questions
- Provide helpful answers based on what you find
- Keep responses clear and conversational (2-4 sentences for voice)  
- If you don't find relevant information, say so honestly""",
            
            tools=[self.search_knowledge]
        )
        
        # Standard LiveKit session - no overrides needed
        session = AgentSession(
            vad=silero.VAD.load(),
            stt=openai.STT(model="gpt-4o-transcribe"),
            llm=openai.LLM(model="gpt-4o-mini", temperature=0.7),
            tts=openai.TTS(model="gpt-4o-mini-tts", voice="nova"),
        )
        
        await session.start(agent=agent, room=ctx.room)
        logger.info(f"Voice Agent started for client: {self.client_id}")