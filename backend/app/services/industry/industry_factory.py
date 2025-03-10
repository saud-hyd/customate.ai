# app/services/industry/industry_factory.py
from typing import Dict, Optional
from sqlalchemy.orm import Session

from app.core.database.session import get_db_session
from app.repositories.client_repository import ClientRepository
from app.services.industry.base_industry import BaseIndustryService
from app.services.industry.ecommerce_service import EcommerceService
from app.services.industry.saas_service import SaaSService
from app.core import logger

class IndustryFactory:
    """
    Factory for creating industry-specific service instances.
    
    This factory provides appropriate industry-specific behavior
    based on the client's industry type.
    """
    
    def __init__(self):
        self.client_repo = ClientRepository()
        self._industry_services = {
            "ecommerce": EcommerceService(),
            "saas": SaaSService(),
            # Add more industry implementations as needed
        }
        
        # Default industry service
        self._default_service = SaaSService()
    
    def get_industry_service(self, client_id: str) -> BaseIndustryService:
        """
        Get appropriate industry service based on client's industry.
        
        Args:
            client_id: Client ID
            
        Returns:
            Industry-specific service implementation
        """
        try:
            # Get client from database
            with get_db_session() as db:
                client = self.client_repo.get_by_client_id(db, client_id)
                
                if not client:
                    logger.warning(f"Client {client_id} not found, using default industry service")
                    return self._default_service
                
                # Get industry type
                industry_type = client.industry.lower() if client.industry else "default"
                
                # Return appropriate service
                if industry_type in self._industry_services:
                    return self._industry_services[industry_type]
                else:
                    logger.info(f"No specific implementation for industry '{industry_type}', using default")
                    return self._default_service
                    
        except Exception as e:
            logger.exception(f"Error getting industry service: {str(e)}")
            return self._default_service