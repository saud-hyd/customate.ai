# backend/app/services/llm/claude_service.py
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx
import os
import json
import asyncio

from app.services.llm.llm_service import LLMService
from app.core.config.settings import settings
from app.core import logger

class ClaudeService(LLMService):
    """Claude AI LLM service implementation with mock fallback."""
    
    def __init__(self, model_name="claude-3-opus-20240229"):
        self.api_key = settings.CLAUDE_API_KEY
        self.api_base_url = "https://api.anthropic.com/v1"
        self.model = model_name
        self._mock_service = None  # Lazy-loaded mock service
        
        # Verify API key is set
        if not self.api_key:
            logger.warning("Claude API key not configured. LLM service may not function properly.")
    
    async def generate_response(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a response from Claude.
        
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
                    f"{self.api_base_url}/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": 1024,
                        "temperature": 0.7,
                    },
                    timeout=30.0,
                )
                
                if response.status_code != 200:
                    logger.error(f"Claude API error: {response.status_code} - {response.text}")
                    return {
                        "content": "I apologize, but I'm having trouble generating a response right now. Please try again later."
                    }
                
                result = response.json()
                content = result["content"][0]["text"]
                
                return {
                    "content": content,
                    "context_updates": {}  # Add any context updates here if needed
                }
                
        except Exception as e:
            logger.exception(f"Error calling Claude API: {str(e)}")
            return {
                "content": "I apologize, but I'm having trouble generating a response right now. Please try again later."
            }
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for text.
        Claude doesn't have a dedicated embeddings API, so we fall back to the mock service.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats
        """
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
    ) -> List[Dict[str, Any]]:
        """Format messages for the Claude API."""
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in conversation_history:
            role = "user" if msg["role"] == "user" else "assistant"
            messages.append({"role": role, "content": msg["content"]})
        
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
        Generate a streaming response from Claude.
        
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
                    f"{self.api_base_url}/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": 1024,
                        "temperature": 0.7,
                        "stream": True
                    },
                    timeout=30.0,
                )
                
                if response.status_code != 200:
                    logger.error(f"Claude API error: {response.status_code} - {response.text}")
                    yield "I apologize, but I'm having trouble generating a response right now. Please try again later."
                    return
                
                # Process the streaming response
                buffer = ""
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        
                        try:
                            chunk = json.loads(data)
                            if chunk.get("type") == "content_block_delta":
                                delta_text = chunk.get("delta", {}).get("text", "")
                                if delta_text:
                                    buffer += delta_text
                                    yield delta_text
                        except Exception as e:
                            logger.error(f"Error parsing Claude stream chunk: {str(e)}")
                
        except Exception as e:
            logger.exception(f"Error in Claude streaming response: {str(e)}")
            yield "I apologize, but I'm having trouble generating a streaming response right now. Please try again later."