# backend/app/services/channel/platforms/instagram_connector.py
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

class InstagramConnector(ChannelConnector):
    """
    Instagram Direct Message connector for sending and receiving messages.
    
    This connector uses Meta's Instagram Graph API to:
    1. Receive direct messages via webhooks
    2. Send messages to users
    3. Verify webhook signatures
    """
    
    def __init__(self, db: Session, channel: Channel):
        super().__init__(db, channel)
        
        # Extract credentials from channel
        self.credentials = channel.credentials or {}
        self.api_version = self.credentials.get("api_version", "v17.0")
        self.instagram_account_id = self.credentials.get("instagram_account_id")
        self.access_token = self.credentials.get("access_token")
        self.app_secret = self.credentials.get("app_secret")
        
        # API endpoint
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
    
    async def initialize(self) -> bool:
        """Initialize the connector and verify credentials."""
        if not self.instagram_account_id or not self.access_token:
            logger.error(f"Instagram credentials missing for channel {self.channel.channel_id}")
            return False
        
        try:
            # Verify access token by making a test API call
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{self.instagram_account_id}",
                    params={"access_token": self.access_token, "fields": "name,username"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Instagram API authentication failed: {response.text}")
                    return False
                
                logger.info(f"Instagram API authentication successful for channel {self.channel.channel_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error initializing Instagram connector: {str(e)}")
            return False
    
    async def validate_webhook(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Validate Instagram webhook request.
        
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
        Process Instagram webhook payload.
        
        Args:
            payload: Webhook payload from Instagram
            
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
                # Extract messaging insights
                if entry.get("object") == "instagram" and "messaging" in entry:
                    messaging_events = entry.get("messaging", [])
                    
                    for event in messaging_events:
                        sender_id = event.get("sender", {}).get("id")
                        recipient_id = event.get("recipient", {}).get("id")
                        timestamp = event.get("timestamp")
                        
                        # Verify this is for our Instagram account
                        if not sender_id or recipient_id != self.instagram_account_id:
                            continue
                        
                        # Process message
                        if "message" in event:
                            message = event["message"]
                            message_id = message.get("mid")
                            
                            # Get or create conversation
                            conversation = await self.channel_service.get_or_create_conversation(
                                channel_id=self.channel.channel_id,
                                platform_user_id=sender_id,
                                platform_conversation_id=sender_id,  # For Instagram, user ID is conversation ID
                                metadata={"platform_timestamp": timestamp}
                            )
                            
                            # Process message based on type
                            content = None
                            media_url = None
                            message_type = "text"
                            message_metadata = {
                                "platform_timestamp": timestamp,
                                "original_payload": message
                            }
                            
                            # Check if it's a text message
                            if "text" in message:
                                message_type = "text"
                                content = message["text"]
                            
                            # Check for attachments
                            elif "attachments" in message:
                                attachments = message["attachments"]
                                
                                if attachments and len(attachments) > 0:
                                    attachment = attachments[0]
                                    attachment_type = attachment.get("type")
                                    
                                    if attachment_type in ["image", "audio", "video", "file"]:
                                        message_type = attachment_type if attachment_type != "file" else "document"
                                        media_url = attachment.get("payload", {}).get("url")
                                    
                                    elif attachment_type == "location":
                                        message_type = "location"
                                        coordinates = attachment.get("payload", {}).get("coordinates", {})
                                        lat = coordinates.get("lat")
                                        long = coordinates.get("long")
                                        
                                        if lat and long:
                                            content = f"Location: {lat}, {long}"
                                            message_metadata["latitude"] = lat
                                            message_metadata["longitude"] = long
                            
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
                                    profile = await self.get_user_profile(sender_id)
                                    
                                    if profile:
                                        await self.channel_service.conversation_repo.update(
                                            self.db,
                                            db_obj=conversation,
                                            obj_in={
                                                "user_name": profile.get("username"),
                                                "user_profile_url": profile.get("profile_picture_url"),
                                                "metadata": {
                                                    **(conversation.metadata or {}),
                                                    "profile": profile
                                                }
                                            }
                                        )
                                except Exception as e:
                                    logger.warning(f"Error fetching Instagram user profile: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing Instagram webhook: {str(e)}", exc_info=True)
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
        Send a message to Instagram DM.
        
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
            
            # Get recipient ID
            recipient_id = conversation.platform_user_id
            
            if not recipient_id:
                result["error"] = "No recipient ID found"
                return result
            
            # Prepare message payload based on message type
            message_payload = {
                "recipient": {"id": recipient_id},
                "message": {}
            }
            
            if message_type == "text" and content:
                message_payload["message"] = {
                    "text": content
                }
            
            elif message_type == "image" and media_url:
                message_payload["message"] = {
                    "attachment": {
                        "type": "image",
                        "payload": {
                            "url": media_url,
                            "is_reusable": True
                        }
                    }
                }
            
            elif message_type == "video" and media_url:
                message_payload["message"] = {
                    "attachment": {
                        "type": "video",
                        "payload": {
                            "url": media_url,
                            "is_reusable": True
                        }
                    }
                }
            
            else:
                # Instagram only supports text, image, and video
                result["error"] = f"Unsupported message type for Instagram: {message_type}"
                return result
            
            # Send message to Instagram API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/{self.instagram_account_id}/messages",
                    params={"access_token": self.access_token},
                    json=message_payload
                )
                
                if response.status_code != 200:
                    result["error"] = f"Instagram API error: {response.text}"
                    logger.error(f"Instagram API error: {response.status_code} - {response.text}")
                    return result
                
                response_data = response.json()
                platform_message_id = response_data.get("message_id")
                
                if not platform_message_id:
                    result["error"] = "No message ID returned from Instagram API"
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
            logger.error(f"Error sending Instagram message: {str(e)}", exc_info=True)
            result["error"] = str(e)
            return result
    
    async def get_user_profile(self, platform_user_id: str) -> Dict[str, Any]:
        """
        Get Instagram user profile information.
        
        Args:
            platform_user_id: Instagram user ID
            
        Returns:
            User profile data
        """
        try:
            # Request profile from Instagram Graph API
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{platform_user_id}",
                    params={
                        "access_token": self.access_token,
                        "fields": "username,name,profile_picture_url"
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Error getting Instagram user profile: {response.text}")
                    return {}
                
                profile_data = response.json()
                
                # Format profile
                return {
                    "id": platform_user_id,
                    "username": profile_data.get("username"),
                    "name": profile_data.get("name"),
                    "profile_picture_url": profile_data.get("profile_picture_url")
                }
                
        except Exception as e:
            logger.error(f"Error getting Instagram user profile: {str(e)}")
            return {}