# backend/app/utils/business_context.py
from typing import Dict, Any, Optional, List

class BusinessContextPrompt:
    """
    Simplified utility for enhancing LLM prompts - lets OpenAI handle context naturally.
    """
    
    @staticmethod
    def enhance_system_prompt(base_prompt: str, client_industry: str = "business") -> str:
        """
        Add minimal context enhancement - let OpenAI decide how to handle conversations.
        
        Args:
            base_prompt: Original system prompt
            client_industry: The client's industry (mostly ignored now)
            
        Returns:
            Minimally enhanced system prompt
        """
        # Simple, flexible enhancement that doesn't restrict conversation
        flexible_context = """
You are a helpful AI assistant. You can handle both casual conversation and business inquiries naturally.

When you have relevant knowledge from the knowledge base, use it to provide accurate information.
If you don't have specific information to answer a question, be honest about it and offer to help in other ways.

Be conversational and helpful while staying professional.
"""
        
        return f"{flexible_context}\n\n{base_prompt}"