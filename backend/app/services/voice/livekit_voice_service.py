# backend/app/services/voice/livekit_voice_service.py
"""
Simple Voice Agent using function tools - the officially supported way
"""
import os
from typing import Optional
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, function_tool, RunContext
from livekit.agents import llm
import asyncio
from livekit.plugins import openai, silero
from sqlalchemy.orm import Session

from app.core import logger
from app.services.knowledge.enhanced_search_service import EnhancedSearchService
from app.services.llm.llm_factory import LLMFactory
from app.services.chat.enhanced_chat_service import EnhancedChatService
from app.services.chat.context_manager import ContextManager


class KnowledgeAgent(Agent):
    """Custom Agent that automatically injects knowledge for every user query"""
    
    def __init__(self, voice_service, instructions: str, tools=None):
        super().__init__(instructions=instructions, tools=tools or [])
        self.voice_service = voice_service
    
    async def on_user_turn_completed(self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage) -> None:
        """
        Automatic knowledge injection for EVERY user message.
        This guarantees knowledge base information is always available.
        """
        # Fix: Extract string from content (LiveKit may return list or string)
        if isinstance(new_message.content, list):
            user_query = " ".join(str(item) for item in new_message.content)
        else:
            user_query = str(new_message.content)
        
        # Skip empty queries
        if not user_query or user_query.strip() == "":
            logger.info("Skipping empty user query")
            return
            
        logger.info(f"Auto knowledge search for: '{user_query}'")
        
        # Intelligent classification: Let GPT-5 Mini decide if query needs knowledge search
        should_use_fillers = await self._should_add_conversational_fillers(user_query)
        
        if should_use_fillers:
            # Generate dynamic, context-aware acknowledgment
            try:
                await self._add_dynamic_acknowledgment(user_query)
            except Exception:
                pass  # Continue even if acknowledgment fails
        
        try:
            # Always search knowledge base using existing search service
            # Ensure query_text is a clean string
            clean_query = user_query.strip()
            logger.info(f"Searching with clean query: '{clean_query}'")
            
            # Use a timeout to prevent hanging
            search_results = await asyncio.wait_for(
                self.voice_service.search_service.hybrid_search(
                    client_id=self.voice_service.client_id,
                    query_text=clean_query,  # Pass clean string, not list
                    limit=8,  # Get comprehensive results
                    vector_threshold=0.3,  # Current settings
                    hybrid_ratio=0.6,
                    user_info={"channel": "voice", "source": "voice_agent"}
                ),
                timeout=2.0  # 2 second timeout to prevent hanging
            )
            
            # Always search, then analyze results to validate filler decision
            if search_results.get("results"):
                # Knowledge found - validates that fillers were appropriate
                knowledge_text = self.voice_service.format_knowledge_for_injection(
                    search_results["results"]
                )
                
                # Inject knowledge into context BEFORE LLM processes
                turn_ctx.add_message(
                    role="system",
                    content=f"Knowledge Base Information:\n{knowledge_text}"
                )
                
                logger.info(f"Injected {len(search_results['results'])} knowledge items")
            else:
                # No knowledge found - let LLM handle conversationally without forcing knowledge
                logger.info("No knowledge base results found, handling as conversational query")
                
        except asyncio.TimeoutError:
            logger.warning(f"Knowledge search timeout for query: '{user_query}'")
            # Add timeout message
            turn_ctx.add_message(
                role="system",
                content="Note: Knowledge search is taking too long. Provide general assistance based on common customer service practices."
            )
        except Exception as e:
            logger.error(f"Auto knowledge search error: {e}")
            logger.error(f"Query type: {type(user_query)}, Query value: {repr(user_query)}")
            
            # Add fallback message to indicate knowledge search failed
            turn_ctx.add_message(
                role="system",
                content="Note: Knowledge base search failed. Provide general assistance and suggest the user try rephrasing their question."
            )
    
    async def _should_add_conversational_fillers(self, user_query: str) -> bool:
        """
        Use GPT-5 Mini to intelligently determine if query needs knowledge base search.
        Dynamic, context-aware classification without hardcoded rules.
        """
        try:
            # Quick classification prompt for GPT-5 Mini
            classification_prompt = f"""Analyze this user query and determine if it likely requires searching a knowledge base (company information, products, services, technical support) or if it's a simple conversational response (greetings, thanks, yes/no).

User query: "{user_query}"

Respond with only: "KNOWLEDGE" or "CONVERSATIONAL"""
            
            # Use your existing LLM service for quick classification
            response = await self.voice_service.llm_service.generate_response(
                messages=[{"role": "user", "content": classification_prompt}],
                max_tokens=10,
                temperature=0.1  # Low temperature for consistent classification
            )
            
            result = response.get("content", "").strip().upper()
            return "KNOWLEDGE" in result
            
        except Exception as e:
            logger.error(f"Classification error: {e}")
            # Default: if query is longer than 10 chars, probably needs knowledge
            return len(user_query.strip()) > 10
    
    async def _add_dynamic_acknowledgment(self, user_query: str):
        """
        Generate contextually appropriate acknowledgment based on the specific query.
        """
        # Let GPT-5 Mini generate a natural, context-specific acknowledgment
        acknowledgment_prompt = f"""Generate a very brief (2-4 words), natural acknowledgment that you're looking into their question. Make it contextually appropriate.

User asked: "{user_query}"

Respond with only the acknowledgment phrase (no quotes, no explanation).
Examples: "Let me check", "One moment", "Looking into that", "Checking on that"""
        
        try:
            response = await self.voice_service.llm_service.generate_response(
                messages=[{"role": "user", "content": acknowledgment_prompt}],
                max_tokens=10,
                temperature=0.3
            )
            
            acknowledgment = response.get("content", "Let me check that").strip()
            
            # Speak the dynamic acknowledgment using correct LiveKit API
            await self.session.generate_reply(
                instructions=f"Say only this exact phrase: '{acknowledgment}'"
            )
            
        except Exception as e:
            logger.error(f"Dynamic acknowledgment error: {e}")
            # Fallback to simple acknowledgment
            await self.session.generate_reply(
                instructions="Say only: 'One moment'"
            )


class VoiceAgent:
    """Voice Agent with reliable knowledge injection for every query"""
    
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
    
    def format_knowledge_for_injection(self, results: list) -> str:
        """
        Format knowledge items for direct injection into LLM context.
        Simple, clean formatting for reliable processing.
        """
        formatted_items = []
        
        for item in results:
            title = item.get("title", "")
            content = item.get("content", "")
            source = item.get("collection_name", "Knowledge Base")
            
            # Clean, simple format
            formatted_items.append(f"• {title} ({source}): {content}")
        
        # Limit total length to prevent token overflow
        full_text = "\n".join(formatted_items)
        if len(full_text) > 6000:  # Reasonable limit for voice responses
            # Truncate and add indicator
            truncated_items = formatted_items[:5]  # Keep top 5 items
            full_text = "\n".join(truncated_items) + "\n... (additional information available)"
        
        return full_text

    @function_tool
    async def search_knowledge_detailed(self, context: RunContext, question: str) -> str:
        """
        BACKUP function tool for complex queries that need additional research.
        Primary knowledge is now automatically injected via on_user_turn_completed.
        """
        logger.info(f"Detailed knowledge search: {question[:60]}...")
        
        try:
            # Use your proven RAG pipeline for detailed search
            response_data = await self.chat_service.process_message(
                client_id=self.client_id,
                user_message=question,
                session_id=self.session_id,
                user_info={
                    "channel": "voice",
                    "source": "voice_agent_detailed"
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
            logger.info(f"Detailed knowledge used: {knowledge_used}")
            
            return content or "I don't have additional specific information about that topic."
            
        except Exception as e:
            logger.error(f"Detailed knowledge search error: {e}")
            return "I'm having trouble accessing additional knowledge base information right now."

    async def entrypoint(self, ctx: JobContext):
        """Simple LiveKit entry point using function tools"""
        await ctx.connect()
        logger.info(f"Voice Agent connected: {ctx.room.name}")
        
        # Custom agent with automatic knowledge injection
        agent = KnowledgeAgent(
            voice_service=self,
            instructions="""You are a helpful customer support representative.

Use the Knowledge Base Information provided in the conversation to answer questions accurately and comprehensively. The knowledge base information is automatically provided for every question.

Guidelines:
- Use the Knowledge Base Information as your primary source
- Provide helpful, accurate answers based on the provided information
- Keep responses clear and conversational (2-4 sentences for voice)
- For complex queries needing additional research, you can use search_knowledge_detailed
- If the provided knowledge doesn't contain relevant information, acknowledge this""",
            tools=[self.search_knowledge_detailed]  # Keep as backup for complex queries
        )
        
        # Optimized session with automatic knowledge injection
        session = AgentSession(
            vad=silero.VAD.load(),
            stt=openai.STT(model="gpt-4o-transcribe"),
            llm=openai.LLM(
                model="gpt-5-mini",
                reasoning_effort="minimal"  # Speed optimization
            ),
            tts=openai.TTS(model="gpt-4o-mini-tts", voice="nova"),
        )
        
        # The KnowledgeAgent automatically has access to session via self.session
        
        await session.start(agent=agent, room=ctx.room)
        logger.info(f"Voice Agent started for client: {self.client_id}")