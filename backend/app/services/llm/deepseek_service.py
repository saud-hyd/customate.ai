import httpx
from typing import Dict, Any, List, Optional

from app.services.llm.llm_service import LLMService
from app.core.config.settings import settings
from app.core import logger

class DeepSeekService(LLMService):
    """DeepSeek LLM service implementation."""
    
    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.api_base_url = "https://api.deepseek.com/v1"  # Replace with actual API URL
        self.model = "deepseek-chat"  # Replace with actual model name
        
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
        Generate embeddings for text using DeepSeek API.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats
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
                        "model": "deepseek-embedding",  # Use embedding model
                        "input": text
                    },
                    timeout=30.0,
                )
                
                if response.status_code != 200:
                    logger.error(f"DeepSeek embedding API error: {response.status_code} - {response.text}")
                    return []
                
                result = response.json()
                embeddings = result["data"][0]["embedding"]
                
                return embeddings
                
        except Exception as e:
            logger.exception(f"Error calling DeepSeek embedding API: {str(e)}")
            return []
    
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