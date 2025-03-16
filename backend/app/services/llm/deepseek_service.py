# app/services/llm/deepseek_service.py
import httpx
from typing import Dict, Any, List, Optional, AsyncGenerator
import os
import json
import asyncio

from app.services.llm.llm_service import LLMService
from app.core.config.settings import settings
from app.core import logger

class DeepSeekService(LLMService):
    """DeepSeek LLM service implementation with mock fallback."""
    
    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.api_base_url = "https://api.deepseek.com/v1"  # Replace with actual API URL
        self.model = "deepseek-chat"  # Replace with actual model name
        self._mock_service = None  # Lazy-loaded mock service
        
        # Verify API key is set
        if not self.api_key:
            logger.warning("DeepSeek API key not configured. LLM service may not function properly.")
    
    async def generate_response(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a response from DeepSeek LLM.
        
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
                    logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
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
            logger.exception(f"Error calling DeepSeek API: {str(e)}")
            return {
                "content": "I apologize, but I'm having trouble generating a response right now. Please try again later."
            }
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for text using DeepSeek API with fallback to mock service.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats
        """
        # Try DeepSeek API first (unless MOCK_EMBEDDINGS=true in environment)
        if not os.environ.get("MOCK_EMBEDDINGS", "").lower() == "true":
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.api_base_url}/embeddings",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "deepseek-embedding",  # Use embedding model
                            "input": text
                        },
                        timeout=30.0,
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        embeddings = result["data"][0]["embedding"]
                        return embeddings
                    else:
                        logger.error(f"DeepSeek embedding API error: {response.status_code} - {response.text}")
                    
            except Exception as e:
                logger.warning(f"Error calling DeepSeek embedding API: {str(e)}, using mock service")
        else:
            logger.info("Using mock embedding service (MOCK_EMBEDDINGS=true)")
            
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
        """Build the system prompt with context information."""
        base_prompt = "You are a helpful AI assistant for customer support."
        
        if knowledge_context:
            knowledge_text = "\n\nRelevant information:\n" + "\n".join([
                f"- {item['title']}: {item['content']}" 
                for item in knowledge_context
            ])
            base_prompt += knowledge_text
        
        if industry_context and "industry_instructions" in industry_context:
            base_prompt += f"\n\n{industry_context['industry_instructions']}"
        
        return base_prompt
    
    def _format_messages(
        self, 
        system_prompt: str, 
        conversation_history: List[Dict[str, str]],
        current_message: str
    ) -> List[Dict[str, str]]:
        """Format messages for the DeepSeek API."""
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content": current_message})
        
        return messages
    
    # backend/app/services/llm/deepseek_service.py
# Add streaming support to the generate_response method

async def generate_response_stream(
    self,
    user_message: str,
    conversation_history: List[Dict[str, str]],
    knowledge_context: Optional[List[Dict[str, Any]]] = None,
    industry_context: Optional[Dict[str, Any]] = None,
) -> AsyncGenerator[str, None]:
    """
    Generate a streaming response from DeepSeek LLM.
    
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
    
    # Make API request with streaming
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
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
                    "stream": True,  # Enable streaming
                },
                timeout=60.0,
            ) as response:
                # Check response status
                if response.status_code != 200:
                    error_text = await response.text()
                    logger.error(f"DeepSeek API error: {response.status_code} - {error_text}")
                    yield "I apologize, but I'm having trouble generating a response right now. Please try again later."
                    return
                
                # Stream the response chunks
                buffer = ""
                async for chunk in response.aiter_text():
                    # Skip empty chunks
                    if not chunk.strip():
                        continue
                    
                    # Process the chunk
                    try:
                        # Chunks are prefixed with "data: " and are JSON
                        if chunk.startswith("data: "):
                            data = chunk[6:]  # Remove "data: " prefix
                            if data.strip() == "[DONE]":
                                break
                            
                            # Parse JSON data
                            chunk_data = json.loads(data)
                            if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                delta = chunk_data["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    buffer += content
                                    yield content
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse JSON from chunk: {chunk}")
                    except Exception as e:
                        logger.error(f"Error processing chunk: {str(e)}")
                
                # If we received a partial sentence, add a period for completion
                if buffer and not buffer.rstrip().endswith((".", "!", "?")):
                    yield "."
                    
    except Exception as e:
        logger.exception(f"Error in streaming response: {str(e)}")
        yield "I apologize, but I'm having trouble generating a response right now. Please try again later."

# If you're using a mock service for development/testing, add a similar method:

class MockStreamingService:
    """Mock service that simulates streaming responses."""
    
    async def generate_response_stream(self, text: str) -> AsyncGenerator[str, None]:
        """Generate a mock streaming response."""
        # Split the text into words
        words = text.split()
        
        # Yield each word with a small delay to simulate typing
        for word in words:
            await asyncio.sleep(0.1)  # 100ms delay between words
            yield word + " "