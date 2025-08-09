# backend/app/services/channel/channel_connector.py
from typing import Dict, Any, Optional, Protocol
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
import httpx
import json
import logging

from app.domain.channel.entities import Channel, ChannelConversation, ChannelMessage
from app.services.channel.channel_service import ChannelService
from app.core import logger

class ChannelConnector(ABC):
    """
    Abstract base class for channel connectors.
    
    Each platform implementation must inherit from this class
    and implement the required methods.
    """
    
    def __init__(self, db: Session, channel: Channel):
        self.db = db
        self.channel = channel
        self.channel_service = ChannelService(db)
    
    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the connector with required API setup.
        
        Returns:
            True if initialization successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def validate_webhook(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Validate webhook request from platform.
        
        Args:
            headers: Request headers
            body: Request body bytes
            
        Returns:
            True if valid, False otherwise
        """
        pass
    
    @abstractmethod
    async def process_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process webhook payload from platform.
        
        Args:
            payload: Webhook payload
            
        Returns:
            Processing result info
        """
        pass
    
    @abstractmethod
    async def send_message(
        self,
        conversation_id: str,
        message_type: str,
        content: Optional[str] = None,
        media_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send a message to the platform.
        
        Args:
            conversation_id: Conversation ID
            message_type: Message type (text, image, etc.)
            content: Optional text content
            media_url: Optional media URL
            metadata: Optional metadata
            
        Returns:
            Result of send operation
        """
        pass
    
    @abstractmethod
    async def get_user_profile(self, platform_user_id: str) -> Dict[str, Any]:
        """
        Get user profile information from platform.
        
        Args:
            platform_user_id: User ID from platform
            
        Returns:
            User profile data
        """
        pass

class ChannelConnectorFactory:
    """
    Factory for creating platform-specific channel connectors.
    """
    
    @staticmethod
    def create_connector(db: Session, channel: Channel) -> Optional[ChannelConnector]:
        """
        Create a connector for the specified channel.
        
        Args:
            db: Database session
            channel: Channel configuration
            
        Returns:
            Appropriate connector instance or None if platform not supported
        """
        if channel.platform == "whatsapp":
            from app.services.channel.platforms.whatsapp_connector import WhatsAppConnector
            return WhatsAppConnector(db, channel)
        
        elif channel.platform == "facebook":
            from app.services.channel.platforms.facebook_connector import FacebookConnector
            return FacebookConnector(db, channel)
        
        elif channel.platform == "instagram":
            from app.services.channel.platforms.instagram_connector import InstagramConnector
            return InstagramConnector(db, channel)
        
        elif channel.platform == "twitter":
            from app.services.channel.platforms.twitter_connector import TwitterConnector
            return TwitterConnector(db, channel)
        
        elif channel.platform == "gmail":
            from app.services.channel.platforms.gmail_connector import GmailConnector
            return GmailConnector(db, channel)
        
        logger.warning(f"Unsupported platform: {channel.platform}")
        return None