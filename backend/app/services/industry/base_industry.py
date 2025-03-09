from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseIndustryService(ABC):
    """
    Base abstract class for industry-specific behavior.
    
    Each industry implementation will provide specialized processing
    and context handling relevant to that industry.
    """
    
    @abstractmethod
    def process_message(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a user message with industry-specific logic.
        
        Args:
            message: The user's message
            context: Current conversation context
            
        Returns:
            Industry-specific context and processing results
        """
        pass
    
    @abstractmethod
    def get_prompting_strategy(self) -> Dict[str, Any]:
        """
        Get industry-specific prompting strategy.
        
        Returns:
            Dictionary with prompting instructions and templates
        """
        pass
    
    @abstractmethod
    def extract_entities(self, message: str) -> Dict[str, Any]:
        """
        Extract industry-specific entities from a message.
        
        Args:
            message: The user's message
            
        Returns:
            Dictionary of extracted entities
        """
        pass