from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx
import os
import json
import asyncio

from app.services.llm.llm_service import LLMService
from app.core.config.settings import settings
from app.core import logger

class OpenAIService(LLMService):
    """OpenAI LLM service implementation with mock fallback."""
    
    def __init__(self, model_name="gpt-4.1-mini-2025-04-14"):
        self.api_key = settings.OPENAI_API_KEY
        self.api_base_url = "https://api.openai.com/v1"
        self.model = "gpt-4.1-mini-2025-04-14"  
        self._mock_service = None  # Lazy-loaded mock service
        
        # Verify API key is set
        if not self.api_key:
            logger.warning("OpenAI API key not configured. LLM service may not function properly.")
    
    async def generate_response(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a response from OpenAI.
        
        Args:
            user_message: The user's message
            conversation_history: Previous conversation messages
            knowledge_context: Relevant knowledge base items
            industry_context: Industry-specific context
            
        Returns:
            Dict containing response content and any context updates
        """
        # Construct system prompt with knowledge context
        system_prompt = self._build_system_prompt(knowledge_context, industry_context)
        
        # Format messages for API
        messages = self._format_messages(system_prompt, conversation_history, user_message)
        
        # Make API request
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1024,
                    },
                    timeout=30.0,
                )
                
                if response.status_code != 200:
                    logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                    return {
                        "content": "I apologize, but I'm having trouble generating a response right now. Please try again later."
                    }
                
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                return {
                    "content": content,
                    "context_updates": {}  # Add any context updates here if needed
                }
                
        except Exception as e:
            logger.exception(f"Error calling OpenAI API: {str(e)}")
            return {
                "content": "I apologize, but I'm having trouble generating a response right now. Please try again later."
            }
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings using OpenAI's text-embedding-3-small model.
        FIXED: Use 384 dimensions to match existing database vectors.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "text-embedding-3-small",
                        "dimensions": 512,  # ← CRITICAL FIX: Match existing database dimensions
                        "input": text[:8000]  # Truncate to avoid token limits
                    },
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    embeddings = result["data"][0]["embedding"]
                    logger.info(f"Generated embeddings with {len(embeddings)} dimensions (matched to database)")
                    return embeddings
                else:
                    logger.error(f"OpenAI embeddings API error: {response.status_code} - {response.text}")
                    raise Exception(f"Embedding API failed with status {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Error calling OpenAI embedding API: {str(e)}")
            # Fallback to mock service if configured
            if hasattr(self, '_mock_service') or os.environ.get("MOCK_EMBEDDINGS", "").lower() == "true":
                mock_service = self._get_mock_service()
                return await mock_service.generate_embeddings(text)
            raise e

    def _get_mock_service(self):
        """Lazy-load the mock service with matching dimensions."""
        if not hasattr(self, '_mock_service') or self._mock_service is None:
            from app.services.llm.mock_embedding_service import MockEmbeddingService
            self._mock_service = MockEmbeddingService(dimensions=512)  # ← Match database dimensions
        return self._mock_service
    
    def _build_system_prompt(
        self, 
        knowledge_context: Optional[List[Dict[str, Any]]],
        industry_context: Optional[Dict[str, Any]]
    ) -> str:
        base_prompt = """You are a knowledgeable customer support representative for this company.

CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
1. **PRIORITIZE KNOWLEDGE BASE**: Always use the provided company information as your PRIMARY source
2. **KNOWLEDGE FIRST**: If the knowledge base contains relevant information, use it BEFORE any general knowledge
3. **BE COMPREHENSIVE**: When knowledge base information is available, provide detailed, complete answers
4. **SOURCE ATTRIBUTION**: Reference the knowledge base when using specific company information
5. **REDIRECT OFF-TOPIC**: For personal, general, or off-topic questions, politely redirect to business topics

RESPONSE STRATEGY:
- Search the knowledge base information thoroughly for relevant details
- Combine multiple knowledge base sources if they relate to the user's question
- Provide step-by-step guidance when procedures are available
- Be conversational but informative - treat this as an ongoing conversation
- Follow up to ensure issues are fully resolved"""
        
        if knowledge_context:
            # Enhanced knowledge formatting with relevance indicators
            knowledge_sections = []
            high_relevance = []
            medium_relevance = []
            low_relevance = []
            
            for item in knowledge_context:
                similarity = item.get('similarity_score', 0)
                source = item.get('source', 'Knowledge Base')
                search_type = item.get('search_type', 'hybrid')
                
                formatted_item = f"**{item['title']}** (from {source}, relevance: {similarity}, found via: {search_type}):\n{item['content']}"
                
                if similarity >= 0.6:
                    high_relevance.append(formatted_item)
                elif similarity >= 0.3:
                    medium_relevance.append(formatted_item)
                else:
                    low_relevance.append(formatted_item)
            
            knowledge_text = "\n\n=== COMPANY KNOWLEDGE BASE (USE THIS INFORMATION FIRST) ==="
            
            if high_relevance:
                knowledge_text += "\n\n--- HIGH RELEVANCE INFORMATION ---\n" + "\n\n".join(high_relevance)
            
            if medium_relevance:
                knowledge_text += "\n\n--- MEDIUM RELEVANCE INFORMATION ---\n" + "\n\n".join(medium_relevance)
                
            if low_relevance:
                knowledge_text += "\n\n--- ADDITIONAL CONTEXT ---\n" + "\n\n".join(low_relevance)
            
            knowledge_text += f"\n\n=== END KNOWLEDGE BASE ({len(knowledge_context)} sources) ==="
            
            base_prompt += knowledge_text
            base_prompt += f"\n\nIMPORTANT: You have {len(knowledge_context)} knowledge sources above. Use these as your PRIMARY information source. Only use general knowledge if the knowledge base doesn't contain relevant information."
        else:
            base_prompt += "\n\nNOTE: No specific company knowledge base information was found for this query. Provide general assistance and suggest the user ask about specific company topics."
        
        return base_prompt
    
    def _format_messages(
        self, 
        system_prompt: str, 
        conversation_history: List[Dict[str, str]],
        current_message: str
    ) -> List[Dict[str, str]]:
        """Format messages for the OpenAI API."""
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content": current_message})
        
        return messages
    
    async def generate_response_stream(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response from OpenAI.
        
        Args:
            user_message: The user's message
            conversation_history: Previous conversation messages
            knowledge_context: Relevant knowledge base items
            industry_context: Industry-specific context
            
        Yields:
            Chunks of the generated response as they're received
        """
        # Construct system prompt with knowledge context
        system_prompt = self._build_system_prompt(knowledge_context, industry_context)
        
        # Format messages for API
        messages = self._format_messages(system_prompt, conversation_history, user_message)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1024,
                        "stream": True
                    },
                    timeout=60.0,
                )
                
                if response.status_code != 200:
                    logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                    yield "I apologize, but I'm having trouble generating a response right now. Please try again later."
                    return
                
                # Process the streaming response
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        line = line[6:]
                        if line.strip() == "[DONE]":
                            break
                            
                        try:
                            chunk = json.loads(line)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            if "content" in delta and delta["content"]:
                                yield delta["content"]
                        except Exception as e:
                            logger.error(f"Error parsing OpenAI stream: {str(e)}")
                
        except Exception as e:
            logger.exception(f"Error in OpenAI streaming response: {str(e)}")
            yield "I apologize, but I'm having trouble generating a streaming response right now. Please try again later."
            
    def __init__(self, model_name="gpt-4.1-mini-2025-04-14"):
        self.api_key = settings.OPENAI_API_KEY
        self.api_base_url = "https://api.openai.com/v1"
        self.model = model_name  # Use the specific model
        self._mock_service = None  # Lazy-loaded mock service
        
        # Verify API key is set
        if not self.api_key:
            logger.error("OpenAI API key not configured. LLM service will not function.")
            raise ValueError("OpenAI API key is required but not configured")
        
        logger.info(f"OpenAI service initialized with model: {self.model}")
        
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings using OpenAI's text-embedding-3-small model.
        Optimized for cost and performance.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "text-embedding-3-small",
                        "dimensions": 512,  # Optimal balance of performance and cost
                        "input": text[:8000]  # Truncate to avoid token limits
                    },
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    embeddings = result["data"][0]["embedding"]
                    logger.info(f"Generated embeddings with {len(embeddings)} dimensions")
                    return embeddings
                else:
                    logger.error(f"OpenAI embeddings API error: {response.status_code} - {response.text}")
                    raise Exception(f"Embedding API failed with status {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Error calling OpenAI embedding API: {str(e)}")
            # Fallback to mock service if configured
            if hasattr(self, '_mock_service') or os.environ.get("MOCK_EMBEDDINGS", "").lower() == "true":
                mock_service = self._get_mock_service()
                return await mock_service.generate_embeddings(text)
            raise e

    def _get_mock_service(self):
        """Lazy-load the mock service for development."""
        if not hasattr(self, '_mock_service') or self._mock_service is None:
            from app.services.llm.mock_embedding_service import MockEmbeddingService
            self._mock_service = MockEmbeddingService()
        return self._mock_service                        