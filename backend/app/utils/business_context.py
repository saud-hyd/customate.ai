# backend/app/utils/business_context.py
from typing import Dict, Any, Optional, List

class BusinessContextPrompt:
    """
    Utility for enhancing LLM prompts with business focus and off-topic handling.
    """
    
    @staticmethod
    def enhance_system_prompt(base_prompt: str, client_industry: str = "business") -> str:
        """
        Add business focus and off-topic handling to a system prompt.
        
        Args:
            base_prompt: Original system prompt
            client_industry: The client's industry
            
        Returns:
            Enhanced system prompt
        """
        business_focus = f"""
You are a specialized AI assistant focused on providing information about the {client_industry} industry.
Your answers should be relevant to the company's business, products, or services.

IMPORTANT INSTRUCTION: If asked questions unrelated to the company's business, like personal opinions, 
jokes, creative tasks, general knowledge unrelated to this business, or any other off-topic queries, 
politely redirect the conversation with:
"I'm specialized in answering questions about our company and its offerings. Is there something specific 
about our products or services I can help with?"

Always stay focused on providing helpful, accurate information within the business domain.
"""
        
        return f"{business_focus}\n\n{base_prompt}"