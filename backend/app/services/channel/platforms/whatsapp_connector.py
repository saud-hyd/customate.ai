# backend/app/services/channel/platforms/whatsapp_connector.py
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
import httpx
import hmac
import hashlib
import json
import logging

from app.domain.channel.entities import Channel, ChannelConversation, ChannelMessage
from app.services.channel.channel_connector import ChannelConnector
from app.services.channel.channel_service import ChannelService
from app.core import logger
from app.core.config.settings import settings

class WhatsAppConnector(ChannelConnector):
    """
    WhatsApp Business API connector for sending and receiving messages.
    
    This connector uses Meta's WhatsApp Business API to:
    1. Receive messages via webhooks
    2. Send messages to users
    3. Verify webhook signatures
    """
    
    def __init__(self, db: Session, channel: Channel):
        super().__init__(db, channel)
        
        # Extract credentials from channel
        self.credentials = channel.credentials or {}
        self.api_version = self.credentials.get("api_version", "v17.0")
        self.phone_number_id = self.credentials.get("phone_number_id")
        self.access_token = self.credentials.get("access_token")
        self.app_secret = self.credentials.get("app_secret")
        
        # API endpoint
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
    
    async def initialize(self) -> bool:
        """Initialize the connector and verify credentials."""
        if not self.phone_number_id or not self.access_token:
            logger.error(f"WhatsApp credentials missing for channel {self.channel.channel_id}")
            return False
        
        try:
            # Verify access token by making a test API call
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{self.phone_number_id}",
                    headers={"Authorization": f"Bearer {self.access_token}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"WhatsApp API authentication failed: {response.text}")
                    return False
                
                logger.info(f"WhatsApp API authentication successful for channel {self.channel.channel_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error initializing WhatsApp connector: {str(e)}")
            return False
    
    async def validate_webhook(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Validate WhatsApp webhook request.
        
        Args:
            headers: Request headers
            body: Request body bytes
            
        Returns:
            True if signature is valid, False otherwise
        """
        if not self.app_secret:
            logger.warning("App secret not configured, skipping signature validation")
            return True
        
        # Get signature from headers
        signature = headers.get("X-Hub-Signature-256")
        
        if not signature:
            logger.warning("No X-Hub-Signature-256 header in request")
            return False
        
        # Verify signature
        expected_signature = 'sha256=' + hmac.new(
            self.app_secret.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    async def process_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process WhatsApp webhook payload.
        
        Args:
            payload: Webhook payload from WhatsApp
            
        Returns:
            Processing result with conversation and message info
        """
        result = {
            "success": False,
            "conversation_id": None,
            "message_id": None
        }
        
        try:
            # Handle verification request (only for initial setup)
            if "hub.mode" in payload and "hub.verify_token" in payload:
                if payload["hub.verify_token"] == self.channel.webhook_secret:
                    result["success"] = True
                    result["challenge"] = payload["hub.challenge"]
                    return result
            
            # Extract entry and changes
            entries = payload.get("entry", [])
            
            for entry in entries:
                changes = entry.get("changes", [])
                
                for change in changes:
                    value = change.get("value", {})
                    
                    # Process messages
                    if "messages" in value:
                        messages = value.get("messages", [])
                        
                        for message in messages:
                            # Get message details
                            message_id = message.get("id")
                            message_type = message.get("type", "text")
                            timestamp = message.get("timestamp")
                            
                            # Get sender info
                            from_user = message.get("from")
                            
                            if not from_user:
                                logger.warning(f"No sender info in WhatsApp message: {message_id}")
                                continue
                            
                            # Get or create conversation
                            conversation = await self.channel_service.get_or_create_conversation(
                                channel_id=self.channel.channel_id,
                                platform_user_id=from_user,
                                platform_conversation_id=from_user,  # For WhatsApp, user ID is conversation ID
                                metadata={"phone_number": from_user}
                            )
                            
                            # Process message based on type
                            content = None
                            media_url = None
                            message_metadata = {
                                "platform_timestamp": timestamp,
                                "original_payload": message
                            }
                            
                            if message_type == "text":
                                content = message.get("text", {}).get("body", "")
                            
                            elif message_type in ["image", "audio", "video", "document"]:
                                media_id = message.get(message_type, {}).get("id")
                                
                                if media_id:
                                    # Get media URL
                                    media_url = await self._get_media_url(media_id)
                                    
                                # For documents, include filename if available
                                if message_type == "document" and "filename" in message.get("document", {}):
                                    message_metadata["filename"] = message["document"]["filename"]
                            
                            elif message_type == "location":
                                location = message.get("location", {})
                                latitude = location.get("latitude")
                                longitude = location.get("longitude")
                                
                                if latitude and longitude:
                                    content = f"Location: {latitude}, {longitude}"
                                    message_metadata["latitude"] = latitude
                                    message_metadata["longitude"] = longitude
                                    message_metadata["address"] = location.get("address")
                            
                            # Record the message
                            channel_message = await self.channel_service.record_message(
                                conversation_id=conversation.conversation_id,
                                direction="inbound",
                                message_type=message_type,
                                content=content,
                                platform_message_id=message_id,
                                media_url=media_url,
                                metadata=message_metadata
                            )
                            
                            result["success"] = True
                            result["conversation_id"] = conversation.conversation_id
                            result["message_id"] = channel_message.message_id
                            
                            # If this is a new conversation, try to get user profile info
                            if not conversation.user_name:
                                try:
                                    profile = await self.get_user_profile(from_user)
                                    
                                    if profile:
                                        await self.channel_service.conversation_repo.update(
                                            self.db,
                                            db_obj=conversation,
                                            obj_in={
                                                "user_name": profile.get("name"),
                                                "metadata": {
                                                    **(conversation.metadata or {}),
                                                    "profile": profile
                                                }
                                            }
                                        )
                                except Exception as e:
                                    logger.warning(f"Error fetching WhatsApp user profile: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing WhatsApp webhook: {str(e)}", exc_info=True)
            return result
    
    async def send_message(
        self,
        conversation_id: str,
        message_type: str,
        content: Optional[str] = None,
        media_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send a message to WhatsApp.
        
        Args:
            conversation_id: Conversation ID
            message_type: Message type (text, image, etc.)
            content: Optional text content
            media_url: Optional media URL
            metadata: Optional metadata
            
        Returns:
            Send result with platform message ID
        """
        result = {
            "success": False,
            "message_id": None,
            "platform_message_id": None,
            "error": None
        }
        
        try:
            # Get conversation
            conversation = self.channel_service.conversation_repo.get_by_conversation_id(
                self.db, conversation_id
            )
            
            if not conversation:
                result["error"] = f"Conversation not found: {conversation_id}"
                return result
            
            # Get recipient phone number (stored as platform_user_id)
            recipient = conversation.platform_user_id
            
            if not recipient:
                result["error"] = "No recipient phone number found"
                return result
            
            # Prepare message payload based on message type
            message_payload = {}
            
            if message_type == "text" and content:
                message_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient,
                    "type": "text",
                    "text": {"body": content}
                }
            
            elif message_type == "image" and media_url:
                message_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient,
                    "type": "image",
                    "image": {"link": media_url}
                }
            
            elif message_type == "audio" and media_url:
                message_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient,
                    "type": "audio",
                    "audio": {"link": media_url}
                }
            
            elif message_type == "video" and media_url:
                message_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient,
                    "type": "video",
                    "video": {"link": media_url}
                }
            
            elif message_type == "document" and media_url:
                document_payload = {"link": media_url}
                
                # Add filename if provided in metadata
                if metadata and "filename" in metadata:
                    document_payload["filename"] = metadata["filename"]
                
                message_payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient,
                    "type": "document",
                    "document": document_payload
                }
            
            elif message_type == "location" and metadata:
                latitude = metadata.get("latitude")
                longitude = metadata.get("longitude")
                
                if latitude and longitude:
                    message_payload = {
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": recipient,
                        "type": "location",
                        "location": {
                            "latitude": latitude,
                            "longitude": longitude,
                            "name": metadata.get("name", ""),
                            "address": metadata.get("address", "")
                        }
                    }
            
            # Check if we have a valid payload
            if not message_payload:
                result["error"] = f"Unsupported message type or missing content: {message_type}"
                return result
            
            # Send message to WhatsApp API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json"
                    },
                    json=message_payload
                )
                
                if response.status_code != 200:
                    result["error"] = f"WhatsApp API error: {response.text}"
                    logger.error(f"WhatsApp API error: {response.status_code} - {response.text}")
                    return result
                
                response_data = response.json()
                platform_message_id = response_data.get("messages", [{}])[0].get("id")
                
                if not platform_message_id:
                    result["error"] = "No message ID returned from WhatsApp API"
                    return result
                
                # Record the outbound message
                channel_message = await self.channel_service.record_message(
                    conversation_id=conversation_id,
                    direction="outbound",
                    message_type=message_type,
                    content=content,
                    platform_message_id=platform_message_id,
                    media_url=media_url,
                    metadata={
                        "api_response": response_data,
                        **(metadata or {})
                    }
                )
                
                result["success"] = True
                result["message_id"] = channel_message.message_id
                result["platform_message_id"] = platform_message_id
                
                return result
                
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {str(e)}", exc_info=True)
            result["error"] = str(e)
            return result
    
    async def get_user_profile(self, platform_user_id: str) -> Dict[str, Any]:
        """
        Get WhatsApp user profile information.
        
        Args:
            platform_user_id: User ID (phone number)
            
        Returns:
            User profile data or empty dict if not available
        """
        # WhatsApp doesn't provide robust profile info, so we create a basic profile
        return {
            "id": platform_user_id,
            "name": platform_user_id,  # Just use the phone number as name
            "phone_number": platform_user_id
        }
    
    async def _get_media_url(self, media_id: str) -> Optional[str]:
        """
        Get media URL from WhatsApp API.
        
        Args:
            media_id: Media ID from WhatsApp
            
        Returns:
            Media URL or None if not available
        """
        try:
            # First get media info
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{media_id}",
                    headers={"Authorization": f"Bearer {self.access_token}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Error getting WhatsApp media info: {response.text}")
                    return None
                
                media_info = response.json()
                
                if "url" not in media_info:
                    logger.error(f"No URL in WhatsApp media info: {media_info}")
                    return None
                
                # Now download the media
                media_url = media_info["url"]
                response = await client.get(
                    media_url,
                    headers={"Authorization": f"Bearer {self.access_token}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Error downloading WhatsApp media: {response.text}")
                    return None
                
                # TODO: Actually store the media somewhere permanent
                # For now, we just return the temporary URL
                return media_url
                
        except Exception as e:
            logger.error(f"Error getting WhatsApp media URL: {str(e)}")
            return None