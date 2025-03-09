from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class LLMService(ABC):
    """Abstract base class for LLM services."""
    
    @abstractmethod
    async def generate_response(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        knowledge_context: Optional[List[Dict[str, Any]]] = None,
        industry_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a response from the LLM.
        
        Args:
            user_message: The user's message
            conversation_history: Previous conversation messages
            knowledge_context: Relevant knowledge base items
            industry_context: Industry-specific context
            
        Returns:
            Dict containing response content and any context updates
        """
        pass
    
    @abstractmethod
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for a piece of text.
        
        Args:
            text: The text to generate embeddings for
            
        Returns:
            Vector embeddings as a list of floats
        """
        pass