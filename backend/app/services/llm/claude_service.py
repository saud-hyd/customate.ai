import logging
import json
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator
import anthropic
from app.services.llm.llm_service import LLMService
from app.core.config.settings import settings

logger = logging.getLogger(__name__)

class ClaudeService(LLMService):
    """Service for interacting with Anthropic's Claude API."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-sonnet-20240229"):
        """Initialize Claude service with API key and model."""
        self.api_key = api_key or settings.CLAUDE_API_KEY
        self.model = model
        self.client = anthropic.Anthropic(api_key=self.api_key)
        logger.info(f"Initialized Claude service with model: {model}")
    
    def _build_system_prompt(
        self, 
        knowledge_context: Optional[List[Dict[str, Any]]],
        industry_context: Optional[Dict[str, Any]]
    ) -> str:
        base_prompt = """You're a helpful team member at this company having a conversation with a customer.

    Be natural, conversational, and friendly - like you're chatting in person. When you know the answer, share it naturally. When you don't know something or it's not related to your company, just casually redirect the conversation like any person would.

    Don't sound scripted or mention being an "assistant" or "AI" - just be helpful and human."""
        
        if knowledge_context:
            knowledge_text = "\n\nInformation you have about your company:\n" + "\n".join([
                f"- {item['title']}: {item['content']}" 
                for item in knowledge_context
            ])
            base_prompt += knowledge_text
        
        return base_prompt
    
    async def generate_response(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate a response using Claude."""
        try:
            logger.info(f"Generating Claude response for message: {user_message[:50]}...")
            
            # Build messages array
            messages = []
            
            # Add system message
            system_prompt = self._build_system_prompt(industry_context)
            
            # Add knowledge context
            knowledge_text = ""
            if knowledge_context and isinstance(knowledge_context, list):
                knowledge_text = "KNOWLEDGE CONTEXT:\n\n"
                for item in knowledge_context:
                    title = item.get("title", "Untitled")
                    content = item.get("content", "")
                    source = item.get("source", "")
                    knowledge_text += f"SOURCE: {source}\n"
                    knowledge_text += f"TITLE: {title}\n"
                    knowledge_text += f"CONTENT: {content}\n\n"
            
            # Add conversation history
            if conversation_history and isinstance(conversation_history, list):
                for message in conversation_history:
                    role = message.get("role", "").lower()
                    content = message.get("content", "")
                    
                    if role == "user":
                        messages.append({"role": "user", "content": content})
                    elif role == "assistant":
                        messages.append({"role": "assistant", "content": content})
            
            # Add the current message
            messages.append({"role": "user", "content": knowledge_text + user_message})
            
            # Call Claude API
            response = self.client.messages.create(
                model=self.model,
                system=system_prompt,
                messages=messages,
                max_tokens=2048,
                temperature=0.7,
            )
            
            # Extract content from response
            content = response.content[0].text
            
            return {
                "content": content,
                "model": self.model,
                "provider": "claude"
            }
        
        except Exception as e:
            logger.error(f"Error generating Claude response: {str(e)}", exc_info=True)
            return {
                "content": "I'm sorry, but I encountered an issue while processing your request. Please try again later.",
                "error": str(e)
            }

    # ADD THIS NEW METHOD FOR STREAMING
    async def generate_response_stream(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response using Claude.
        
        Args:
            user_message: The user's message
            conversation_history: Previous conversation messages
            knowledge_context: Relevant knowledge items
            industry_context: Industry-specific context
            
        Yields:
            String chunks of the generated response
        """
        try:
            logger.info(f"Generating Claude streaming response for: {user_message[:50]}...")
            
            # Build system prompt
            system_prompt = self._build_system_prompt(industry_context)
            
            # Format knowledge context
            knowledge_text = ""
            if knowledge_context and isinstance(knowledge_context, list):
                knowledge_text = "KNOWLEDGE CONTEXT:\n\n"
                for item in knowledge_context:
                    title = item.get("title", "Untitled")
                    content = item.get("content", "")
                    source = item.get("source", "")
                    knowledge_text += f"SOURCE: {source}\n"
                    knowledge_text += f"TITLE: {title}\n"
                    knowledge_text += f"CONTENT: {content}\n\n"
            
            # Build messages array
            messages = []
            
            # Add conversation history
            if conversation_history and isinstance(conversation_history, list):
                for message in conversation_history:
                    role = message.get("role", "").lower()
                    content = message.get("content", "")
                    
                    if role == "user":
                        messages.append({"role": "user", "content": content})
                    elif role == "assistant":
                        messages.append({"role": "assistant", "content": content})
            
            # Add the current message with knowledge context
            messages.append({"role": "user", "content": knowledge_text + user_message})
            
            # Create streaming response
            with self.client.messages.stream(
                model=self.model,
                system=system_prompt,
                messages=messages,
                max_tokens=2048,
                temperature=0.7,
            ) as stream:
                # Process the streaming response
                for chunk in stream:
                    if chunk.type == "content_block_delta" and hasattr(chunk, "delta") and hasattr(chunk.delta, "text"):
                        # Extract and yield the text chunk
                        yield chunk.delta.text
                        # Small delay to control stream rate
                        await asyncio.sleep(0.01)
        
        except Exception as e:
            logger.error(f"Error in Claude streaming response: {str(e)}", exc_info=True)
            # Yield an error message that can be displayed to the user
            yield "I'm sorry, but I encountered an issue while processing your request. Please try again."
            
    async def generate_embeddings(
        self, 
        texts: List[str],
        batch_size: int = 5
    ) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        This is a partial implementation since Claude doesn't have a native embeddings API.
        We'll generate basic embeddings or raise a warning.
        
        Args:
            texts: List of texts to generate embeddings for
            batch_size: Number of texts to process in each batch
            
        Returns:
            List of embeddings (each embedding is a list of floats)
        """
        logger.warning("Claude doesn't provide a native embeddings API. Using fallback method.")
        
        try:
            # Import numpy if available for creating mock embeddings
            import numpy as np
            
            # Create mock embeddings (384-dimensional, matching the dimension used in other services)
            # This is just a placeholder - these are not semantically meaningful embeddings
            embeddings = []
            for text in texts:
                # Create a deterministic but unique embedding based on text hash
                seed = hash(text) % 10000
                np.random.seed(seed)
                # Generate a 384-dimensional vector normalized to unit length
                embedding = np.random.randn(384)
                embedding = embedding / np.linalg.norm(embedding)
                embeddings.append(embedding.tolist())
            
            return embeddings
            
        except ImportError:
            # If numpy is not available, return even simpler mock embeddings
            logger.warning("NumPy not available, using very basic mock embeddings")
            embeddings = []
            for text in texts:
                # Create a simple mock embedding (just 384 elements of 0)
                embedding = [0.0] * 384
                embeddings.append(embedding)
            
            return embeddings            