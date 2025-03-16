# backend/app/services/chat/enhanced_response_generator.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import logging

from app.services.llm.llm_service import LLMService
from app.services.knowledge.similarity_service import SimilarityService
from app.services.industry.industry_factory import IndustryFactory
from app.services.chat.integration_context_enhancer import IntegrationContextEnhancer
from app.utils.entity_extractor import extract_entities
from app.utils.intent_classifier import classify_intent
from app.core import logger

class EnhancedResponseGenerator:
    """
    Enhanced response generator that integrates knowledge base data
    and external integration data with LLM responses.
    
    Features:
    - Knowledge retrieval and integration
    - External service data injection
    - Industry-specific customization
    - Entity extraction and intent classification
    """
    
    def __init__(
        self,
        db: Session,
        llm_service: LLMService,
        similarity_service: SimilarityService,
        industry_factory: IndustryFactory
    ):
        self.db = db
        self.llm_service = llm_service
        self.similarity_service = similarity_service
        self.industry_factory = industry_factory
        self.integration_enhancer = IntegrationContextEnhancer(db)
    
    async def generate_response(
        self,
        client_id: str,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate an enhanced response using all available data sources.
        
        Args:
            client_id: Client ID
            user_message: User message
            conversation_history: Previous conversation messages
            context: Additional context information
            
        Returns:
            Response data with content and metadata
        """
        # Extract entities and classify intent
        entities = extract_entities(user_message)
        intent = classify_intent(user_message)
        
        # Get industry-specific service
        industry_service = self.industry_factory.get_industry_service(client_id)
        industry_context = industry_service.process_message(user_message, context or {})
        
        # Search for relevant knowledge
        knowledge_results = await self.similarity_service.search(
            client_id=client_id,
            query=user_message,
            limit=5
        )
        
        # Determine if knowledge should be used
        knowledge_items = []
        knowledge_used = False
        
        if knowledge_results and len(knowledge_results) > 0:
            # Format knowledge items for LLM
            knowledge_items = [
                {
                    "title": item.get("title", ""),
                    "content": item.get("content", ""),
                    "source": item.get("collection_name", "Knowledge Base"),
                    "relevance": "high" if item.get("score", 0) > 0.7 else "medium"
                }
                for item in knowledge_results[:3]  # Limit to top 3 items
            ]
            knowledge_used = True
        
        # Get integration data if applicable
        integration_data = None
        integration_used = False
        
        try:
            integration_context = await self.integration_enhancer.enhance_context(
                client_id,
                user_message,
                intent,
                entities
            )
            
            if integration_context:
                integration_used = True
        except Exception as e:
            logger.exception(f"Error enhancing context with integration data: {str(e)}")
            integration_context = None
        
        # Prepare industry-specific instructions
        industry_instructions = industry_service.get_prompting_strategy().get(
            "system_prompt", 
            "You are a helpful assistant."
        )
        
        # Generate LLM response
        llm_response = await self.llm_service.generate_response(
            user_message=user_message,
            conversation_history=conversation_history,
            knowledge_context=knowledge_items if knowledge_used else None,
            industry_context={
                "instructions": industry_instructions,
                "intent": intent,
                "integration_context": integration_context
            }
        )
        
        # Apply industry-specific post-processing if available
        if hasattr(industry_service, 'process_response'):
            response_content = industry_service.process_response(
                llm_response["content"],
                user_message,
                intent
            )
        else:
            response_content = llm_response["content"]
        
        # Return enhanced response with metadata
        return {
            "content": response_content,
            "metadata": {
                "knowledge_used": knowledge_used,
                "integration_used": integration_used,
                "intent": intent,
                "entities": entities
            }
        }