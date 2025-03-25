# backend/app/services/llm/claude_service.py
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx
import json
import asyncio
import traceback

from app.services.llm.llm_service import LLMService
from app.core.config.settings import settings
from app.core import logger
from app.services.llm.mock_embedding_service import MockEmbeddingService

class ClaudeService(LLMService):
    """Claude AI LLM service implementation with error handling and fallbacks."""
    
    def __init__(self, model_name="claude-3-opus-20240229"):
        self.api_key = settings.CLAUDE_API_KEY
        self.api_base_url = "https://api.anthropic.com/v1"
        self.model = model_name
        self._mock_service = None  # Lazy-loaded mock service
        
        # Verify API key is set - but do not raise error to allow fallback
        if not self.api_key:
            logger.warning("Claude API key not configured. Will attempt to use service with fallbacks.")

    async def generate_response(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a response from Claude with robust error handling.
        
        Args:
            user_message: The user's message
            conversation_history: Previous conversation messages
            knowledge_context: Relevant knowledge base items
            industry_context: Industry-specific context
            
        Returns:
            Dict containing response content and any context updates
        """
        # Check if API key is available
        if not self.api_key:
            return {
                "content": "I'm unable to process your request as the Claude API is not properly configured. Please try another AI provider or contact support.",
                "context_updates": {"error": "claude_api_key_missing"}
            }
        
        # Construct system prompt with knowledge context
        system_prompt = self._build_system_prompt(knowledge_context, industry_context)
        
        # Format messages for API - this will be altered for Claude's format
        formatted_messages = self._format_messages(None, conversation_history, user_message)
        
        # Make API request
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                
                logger.info(f"Claude API request: URL={self.api_base_url}/messages, Model={self.model}")

                # Create request body with system as a separate parameter
                request_data = {
                    "model": self.model,
                    "messages": formatted_messages,
                    "max_tokens": 1024,
                    "temperature": 0.7,
                }
                
                # Add system prompt as a separate parameter if it exists
                if system_prompt:
                    request_data["system"] = system_prompt
                
                # Log the request for debugging
                logger.debug(f"Claude API request data: {json.dumps(request_data)}")
                
                response = await client.post(
                    f"{self.api_base_url}/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json=request_data,
                )
                
                # Log response status and headers for debugging
                logger.debug(f"Claude API response status: {response.status_code}")
                logger.debug(f"Claude API response headers: {response.headers}")
                
                if response.status_code != 200:
                    error_message = f"Claude API error: {response.status_code} - {response.text}"
                    logger.error(error_message)
                    return {
                        "content": f"I'm sorry, but I'm having trouble generating a response. Please try again later or try another AI provider.",
                        "context_updates": {"error": f"claude_api_error_{response.status_code}"}
                    }
                
                result = response.json()
                
                # Safely extract content from the response
                if "content" in result and len(result["content"]) > 0:
                    content = result["content"][0].get("text", "")
                else:
                    logger.error(f"Claude API returned unexpected format: {result}")
                    content = "I'm sorry, but I'm having trouble generating a response."
                
                return {
                    "content": content,
                    "context_updates": {}
                }
                
        except httpx.HTTPError as http_err:
            error_message = f"HTTP error with Claude API: {str(http_err)}"
            logger.exception(error_message)
            return {
                "content": "I'm sorry, but I'm having trouble connecting to my backend services. Please try again later.",
                "context_updates": {"error": "claude_http_error"}
            }
        except (json.JSONDecodeError, KeyError) as parse_err:
            error_message = f"Error parsing Claude API response: {str(parse_err)}"
            logger.exception(error_message)
            return {
                "content": "I'm sorry, but I received an unexpected response format. Please try again later.",
                "context_updates": {"error": "claude_parse_error"}
            }
        except Exception as e:
            error_message = f"Error calling Claude API: {str(e)}\n{traceback.format_exc()}"
            logger.exception(error_message)
            return {
                "content": "I'm sorry, but I'm experiencing technical difficulties. Please try again later or try another AI provider.",
                "context_updates": {"error": "claude_general_error"}
            }
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for text.
        Claude doesn't have a dedicated embeddings API, so we use the mock service.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats
        """
        # Always use mock service for embeddings since Claude doesn't have an embeddings API
        mock_service = self._get_mock_service()
        return await mock_service.generate_embeddings(text)
    
    def _get_mock_service(self):
        """Lazy-load the mock service."""
        if self._mock_service is None:
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
        system_prompt: Optional[str], 
        conversation_history: List[Dict[str, str]],
        current_message: str
    ) -> List[Dict[str, Any]]:
        """
        Format messages for the Claude API.
        Note: For Claude, system prompt is handled separately, not as a message.
        """
        messages = []
        
        # Add conversation history - skipping any system messages
        for msg in conversation_history:
            if msg["role"] != "system":  # Skip system messages as Claude handles them differently
                role = "user" if msg["role"] == "user" else "assistant"
                messages.append({"role": role, "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content": current_message})
        
        return messages