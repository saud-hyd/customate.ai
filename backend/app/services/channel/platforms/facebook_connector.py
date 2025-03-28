# backend/app/services/channel/platforms/facebook_connector.py
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

class FacebookConnector(ChannelConnector):
    """
    Facebook Messenger connector for sending and receiving messages.
    
    This connector uses Meta's Messenger API to:
    1. Receive messages via webhooks
    2. Send messages to users
    3. Verify webhook signatures
    """
    
    def __init__(self, db: Session, channel: Channel):
        super().__init__(db, channel)
        
        # Extract credentials from channel
        self.credentials = channel.credentials or {}
        self.api_version = self.credentials.get("api_version", "v17.0")
        self.page_id = self.credentials.get("page_id")
        self.access_token = self.credentials.get("access_token")
        self.app_secret = self.credentials.get("app_secret")
        
        # API endpoint
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
    
    async def initialize(self) -> bool:
        """Initialize the connector and verify credentials."""
        if not self.page_id or not self.access_token:
            logger.error(f"Facebook credentials missing for channel {self.channel.channel_id}")
            return False
        
        try:
            # Verify access token by making a test API call
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{self.page_id}",
                    params={"access_token": self.access_token}
                )
                
                if response.status_code != 200:
                    logger.error(f"Facebook API authentication failed: {response.text}")
                    return False
                
                logger.info(f"Facebook API authentication successful for channel {self.channel.channel_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error initializing Facebook connector: {str(e)}")
            return False
    
    async def validate_webhook(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Validate Facebook webhook request.
        
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
        Process Facebook webhook payload.
        
        Args:
            payload: Webhook payload from Facebook
            
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
            
            # Extract entry and messaging
            entries = payload.get("entry", [])
            
            for entry in entries:
                # Skip if not for our page
                if str(entry.get("id")) != self.page_id:
                    continue
                
                messaging_events = entry.get("messaging", [])
                
                for event in messaging_events:
                    sender_id = event.get("sender", {}).get("id")
                    recipient_id = event.get("recipient", {}).get("id")
                    timestamp = event.get("timestamp")
                    
                    if not sender_id or str(recipient_id) != self.page_id:
                        logger.warning(f"Invalid sender or recipient in Facebook event: {event}")
                        continue
                    
                    # Process message or postback
                    if "message" in event:
                        message = event["message"]
                        message_id = message.get("mid")
                        
                        # Get or create conversation
                        conversation = await self.channel_service.get_or_create_conversation(
                            channel_id=self.channel.channel_id,
                            platform_user_id=sender_id,
                            platform_conversation_id=sender_id,  # For Facebook, user ID is conversation ID
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
                                            "user_name": profile.get("name"),
                                            "user_profile_url": profile.get("profile_pic"),
                                            "metadata": {
                                                **(conversation.metadata or {}),
                                                "profile": profile
                                            }
                                        }
                                    )
                            except Exception as e:
                                logger.warning(f"Error fetching Facebook user profile: {str(e)}")
                    
                    # Handle postback events
                    elif "postback" in event:
                        postback = event["postback"]
                        
                        # Get or create conversation
                        conversation = await self.channel_service.get_or_create_conversation(
                            channel_id=self.channel.channel_id,
                            platform_user_id=sender_id,
                            platform_conversation_id=sender_id,
                            metadata={"platform_timestamp": timestamp}
                        )
                        
                        # Record as a text message
                        postback_title = postback.get("title", "")
                        postback_payload = postback.get("payload", "")
                        content = f"{postback_title}: {postback_payload}"
                        
                        channel_message = await self.channel_service.record_message(
                            conversation_id=conversation.conversation_id,
                            direction="inbound",
                            message_type="postback",
                            content=content,
                            platform_message_id=None,  # Postbacks don't have message IDs
                            metadata={
                                "platform_timestamp": timestamp,
                                "original_payload": postback,
                                "postback_title": postback_title,
                                "postback_payload": postback_payload
                            }
                        )
                        
                        result["success"] = True
                        result["conversation_id"] = conversation.conversation_id
                        result["message_id"] = channel_message.message_id
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing Facebook webhook: {str(e)}", exc_info=True)
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
        Send a message to Facebook Messenger.
        
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
                "messaging_type": "RESPONSE"
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
            
            elif message_type == "audio" and media_url:
                message_payload["message"] = {
                    "attachment": {
                        "type": "audio",
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
            
            elif message_type == "document" and media_url:
                message_payload["message"] = {
                    "attachment": {
                        "type": "file",
                        "payload": {
                            "url": media_url,
                            "is_reusable": True
                        }
                    }
                }
            
            elif message_type == "location" and metadata:
                latitude = metadata.get("latitude")
                longitude = metadata.get("longitude")
                
                if not latitude or not longitude:
                    result["error"] = "Missing latitude/longitude for location message"
                    return result
                
                # Facebook doesn't support direct location sending, so we send it as a URL
                maps_url = f"https://maps.google.com/maps?q={latitude},{longitude}"
                message_payload["message"] = {
                    "text": f"Location: {maps_url}"
                }
            
            # Quick replies (if provided in metadata)
            if metadata and "quick_replies" in metadata:
                quick_replies = metadata["quick_replies"]
                if isinstance(quick_replies, list) and len(quick_replies) > 0:
                    formatted_replies = []
                    
                    for reply in quick_replies:
                        if isinstance(reply, dict) and "title" in reply:
                            formatted_reply = {
                                "content_type": "text",
                                "title": reply["title"],
                                "payload": reply.get("payload", reply["title"])
                            }
                            formatted_replies.append(formatted_reply)
                    
                    if formatted_replies:
                        message_payload["message"]["quick_replies"] = formatted_replies
            
            # Send message to Facebook API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/me/messages",
                    params={"access_token": self.access_token},
                    json=message_payload
                )
                
                if response.status_code != 200:
                    result["error"] = f"Facebook API error: {response.text}"
                    logger.error(f"Facebook API error: {response.status_code} - {response.text}")
                    return result
                
                response_data = response.json()
                platform_message_id = response_data.get("message_id")
                
                if not platform_message_id:
                    result["error"] = "No message ID returned from Facebook API"
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
            logger.error(f"Error sending Facebook message: {str(e)}", exc_info=True)
            result["error"] = str(e)
            return result
    
    async def get_user_profile(self, platform_user_id: str) -> Dict[str, Any]:
        """
        Get Facebook user profile information.
        
        Args:
            platform_user_id: Facebook user ID
            
        Returns:
            User profile data
        """
        try:
            # Request profile from Facebook
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{platform_user_id}",
                    params={
                        "access_token": self.access_token,
                        "fields": "first_name,last_name,profile_pic"
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Error getting Facebook user profile: {response.text}")
                    return {}
                
                profile_data = response.json()
                
                # Format profile
                return {
                    "id": platform_user_id,
                    "name": f"{profile_data.get('first_name', '')} {profile_data.get('last_name', '')}".strip(),
                    "first_name": profile_data.get("first_name"),
                    "last_name": profile_data.get("last_name"),
                    "profile_pic": profile_data.get("profile_pic")
                }
                
        except Exception as e:
            logger.error(f"Error getting Facebook user profile: {str(e)}")
            return {}