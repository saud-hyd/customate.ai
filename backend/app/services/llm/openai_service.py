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
        Generate embeddings for text using OpenAI's embeddings API.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats
        """
        # Make API request to embeddings endpoint
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
                        "dimensions": 512,  # Optional: faster + cheaper
                        "input": text
                    },
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    embeddings = result["data"][0]["embedding"]
                    return embeddings
                else:
                    logger.error(f"OpenAI embeddings API error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.warning(f"Error calling OpenAI embedding API: {str(e)}, using mock service")
            
        # Fallback to mock service
        mock_service = self._get_mock_service()
        return await mock_service.generate_embeddings(text)
    
    def _get_mock_service(self):
        """Lazy-load the mock service."""
        if self._mock_service is None:
            from app.services.llm.mock_embedding_service import MockEmbeddingService
            self._mock_service = MockEmbeddingService()
        return self._mock_service
    
    def _build_system_prompt(
        self, 
        knowledge_context: Optional[List[Dict[str, Any]]],
        industry_context: Optional[Dict[str, Any]]
    ) -> str:
        """Build the system prompt with context information and formatting instructions."""
        base_prompt = """You are a helpful AI assistant for customer support.
        
    Format your responses with proper Markdown:
    - Use **bold text** for important information, headings, or key points
    - Create proper lists with bullet points when listing items or steps
    - Use proper line breaks for readability
    - When presenting structured information like product features or pricing details, use clear formatting with headings and lists
    - For numerical lists, use proper numbered formatting
    """
        
        # Enhance prompt with business focus and off-topic handling
        enhanced_prompt = self.enhance_system_prompt(base_prompt, industry_context)
        
        # Add knowledge context if provided
        if knowledge_context:
            knowledge_text = "\n\nRelevant information:\n" + "\n".join([
                f"- {item['title']}: {item['content']}" 
                for item in knowledge_context
            ])
            enhanced_prompt += knowledge_text
        
        return enhanced_prompt    
    
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