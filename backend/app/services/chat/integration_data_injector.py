# backend/app/services/integration/simple_integration_helper.py
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.services.integration.integration_service import IntegrationService  
from app.repositories.integration_repository import IntegrationRepository
from app.core import logger

class IntegrationDataInjector:
    """
    SUPER SIMPLE integration helper.
    Just checks if there's relevant data and includes it for OpenAI.
    OpenAI decides what to do with it naturally.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.integration_service = IntegrationService()
        self.integration_repo = IntegrationRepository()
    
    async def get_relevant_data(self, client_id: str, user_message: str) -> Optional[str]:
        """
        Check all integrations for relevant data.
        OpenAI will decide if it's useful or not.
        """
        try:
            # Get all active integrations for this client
            integrations = self.integration_repo.get_active_by_client_id(self.db, client_id)
            if not integrations:
                return None
            
            all_relevant_data = []
            
            # For each integration, do a simple search
            for integration in integrations[:3]:  # Limit to avoid slowness
                try:
                    if integration.provider == "shopify":
                        # Try different resource types based on what might be relevant
                        for resource_type in ["orders", "products", "customers"]:
                            data = self.integration_service.get_data(
                                integration,
                                resource_type,
                                query=user_message[:50],  # Use part of user message as query
                                filters={"limit": 3}  # Just get a few results
                            )
                            
                            if data:
                                formatted = self._format_data_for_openai(data, integration.provider, resource_type)
                                if formatted:
                                    all_relevant_data.append(formatted)
                                    break  # Found something, move to next integration
                    
                    # Add more providers as needed (Zendesk, Calendar, etc.)
                    # elif integration.provider == "zendesk":
                    #     ... similar simple logic
                        
                except Exception as e:
                    logger.warning(f"Error checking {integration.provider}: {str(e)}")
                    continue
            
            # Combine all relevant data
            if all_relevant_data:
                return "\n\n".join(all_relevant_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting integration data: {str(e)}")
            return None
    
    def _format_data_for_openai(self, data: List[Dict], provider: str, resource_type: str) -> Optional[str]:
        """Format data in a simple way for OpenAI context."""
        if not data:
            return None
            
        try:
            result = f"Available {resource_type} from {provider}:\n"
            
            for item in data[:3]:  # Limit to avoid token limits
                if resource_type == "orders":
                    result += f"- Order #{item.get('order_number', 'N/A')}: {item.get('financial_status', 'unknown')} status, ${item.get('total_price', '0')}\n"
                elif resource_type == "products":  
                    result += f"- {item.get('title', 'Product')}: ${item.get('price', 'N/A')}, {item.get('status', 'unknown')} status\n"
                elif resource_type == "customers":
                    result += f"- Customer: {item.get('email', 'N/A')}, {item.get('orders_count', 0)} orders\n"
            
            return result
            
        except Exception as e:
            logger.error(f"Error formatting {provider} {resource_type}: {str(e)}")
            return None