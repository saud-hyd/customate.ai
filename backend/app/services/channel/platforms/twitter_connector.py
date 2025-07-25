# backend/app/services/channel/platforms/twitter_connector.py
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
import httpx
import hmac
import hashlib
import json
import base64
import logging

from app.domain.channel.entities import Channel, ChannelConversation, ChannelMessage
from app.services.channel.channel_connector import ChannelConnector
from app.services.channel.channel_service import ChannelService
from app.core import logger
from app.core.config.settings import settings

class TwitterConnector(ChannelConnector):
    """
    Twitter Direct Message connector for sending and receiving messages.
    
    This connector uses Twitter API v2 to:
    1. Receive direct messages via webhooks
    2. Send messages to users
    3. Verify webhook signatures
    """
    
    def __init__(self, db: Session, channel: Channel):
        super().__init__(db, channel)
        
        # Extract credentials from channel
        self.credentials = channel.credentials or {}
        self.api_key = self.credentials.get("api_key")
        self.api_secret = self.credentials.get("api_secret")
        self.access_token = self.credentials.get("access_token")
        self.access_token_secret = self.credentials.get("access_token_secret")
        self.bearer_token = self.credentials.get("bearer_token")
        self.webhook_secret = self.credentials.get("webhook_secret")
        
        # API endpoint
        self.base_url = "https://api.twitter.com/2"
    
    async def initialize(self) -> bool:
        """Initialize the connector and verify credentials."""
        if not self.bearer_token or not self.api_key:
            logger.error(f"Twitter credentials missing for channel {self.channel.channel_id}")
            return False
        
        try:
            # Verify bearer token by making a test API call
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/users/me",
                    headers={"Authorization": f"Bearer {self.bearer_token}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Twitter API authentication failed: {response.text}")
                    return False
                
                logger.info(f"Twitter API authentication successful for channel {self.channel.channel_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error initializing Twitter connector: {str(e)}")
            return False
    
    async def validate_webhook(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Validate Twitter webhook request.
        
        Args:
            headers: Request headers
            body: Request body bytes
            
        Returns:
            True if signature is valid, False otherwise
        """
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured, skipping signature validation")
            return True
        
        # Get signature and timestamp from headers
        signature = headers.get("x-twitter-webhooks-signature")
        
        if not signature:
            logger.warning("No x-twitter-webhooks-signature header in request")
            return False
        
        # Verify signature (Twitter uses HMAC SHA-256)
        expected_signature = 'sha256=' + hmac.new(
            self.webhook_secret.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    async def process_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Twitter webhook payload.
        
        Args:
            payload: Webhook payload from Twitter
            
        Returns:
            Processing result with conversation and message info
        """
        result = {
            "success": False,
            "conversation_id": None,
            "message_id": None
        }
        
        try:
            # Handle CRC challenge (Twitter's verification method)
            if "crc_token" in payload:
                if self.webhook_secret:
                    # Create the response
                    sha256_hash = hmac.new(
                        self.webhook_secret.encode('utf-8'),
                        payload["crc_token"].encode('utf-8'),
                        hashlib.sha256
                    ).digest()
                    
                    # Base64 encode the hash
                    b64_hash = base64.b64encode(sha256_hash).decode('utf-8')
                    
                    # Return the response
                    result["success"] = True
                    result["response_token"] = f"sha256={b64_hash}"
                    return result
            
            # Process direct message events
            if "direct_message_events" in payload:
                dm_events = payload.get("direct_message_events", [])
                users = payload.get("users", {})
                
                for event in dm_events:
                    # Only process message_create events
                    if event.get("type") != "message_create":
                        continue
                    
                    # Get event details
                    message_id = event.get("id")
                    message_data = event.get("message_create", {})
                    sender_id = message_data.get("sender_id")
                    recipient_id = message_data.get("target", {}).get("recipient_id")
                    
                    # Skip messages sent by the app
                    # The platform_identifier for Twitter is typically the user ID of the bot
                    if sender_id == self.channel.platform_identifier:
                        continue
                    
                    # Get or create conversation
                    conversation = await self.channel_service.get_or_create_conversation(
                        channel_id=self.channel.channel_id,
                        platform_user_id=sender_id,
                        platform_conversation_id=f"{sender_id}-{recipient_id}",
                        metadata={"recipient_id": recipient_id}
                    )
                    
                    # Get user info if available
                    if sender_id in users:
                        user_info = users[sender_id]
                        user_name = user_info.get("name")
                        screen_name = user_info.get("screen_name")
                        profile_image_url = user_info.get("profile_image_url")
                        
                        # Update conversation with user info
                        if user_name or screen_name:
                            await self.channel_service.conversation_repo.update(
                                self.db,
                                db_obj=conversation,
                                obj_in={
                                    "user_name": f"{user_name} (@{screen_name})" if user_name and screen_name else (user_name or screen_name),
                                    "user_profile_url": profile_image_url,
                                    "metadata": {
                                        **(conversation.metadata or {}),
                                        "user_info": user_info
                                    }
                                }
                            )
                    
                    # Process message content
                    message_type = "text"
                    content = None
                    media_url = None
                    metadata = {
                        "original_payload": message_data,
                        "created_timestamp": event.get("created_timestamp")
                    }
                    
                    # Get message text
                    message_text = message_data.get("message_data", {}).get("text")
                    
                    if message_text:
                        message_type = "text"
                        content = message_text
                    
                    # Check for media
                    entities = message_data.get("message_data", {}).get("entities", {})
                    media = entities.get("media", [])
                    
                    if media and len(media) > 0:
                        media_item = media[0]
                        media_type = media_item.get("type")
                        
                        if media_type == "photo":
                            message_type = "image"
                            media_url = media_item.get("media_url_https")
                        elif media_type == "video":
                            message_type = "video"
                            media_url = media_item.get("media_url_https")
                        
                        # Remove media URL from content if present
                        if content and media_item.get("url") in content:
                            content = content.replace(media_item.get("url"), "").strip()
                    
                    # Record message
                    channel_message = await self.channel_service.record_message(
                        conversation_id=conversation.conversation_id,
                        direction="inbound",
                        message_type=message_type,
                        content=content,
                        platform_message_id=message_id,
                        media_url=media_url,
                        metadata=metadata
                    )
                    
                    result["success"] = True
                    result["conversation_id"] = conversation.conversation_id
                    result["message_id"] = channel_message.message_id
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing Twitter webhook: {str(e)}", exc_info=True)
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
        Send a message to Twitter DM.
        
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
            
            # Prepare OAuth headers for Twitter API
            auth_header = self._get_oauth_header("POST", f"{self.base_url}/direct_messages/events/new.json")
            
            # Prepare message payload
            message_data = {
                "event": {
                    "type": "message_create",
                    "message_create": {
                        "target": {
                            "recipient_id": recipient_id
                        },
                        "message_data": {}
                    }
                }
            }
            
            # Handle different message types
            if message_type == "text" and content:
                message_data["event"]["message_create"]["message_data"]["text"] = content
            
            elif message_type in ["image", "video"] and media_url:
                # For Twitter, we need to upload media first, then attach it
                # This is a simplified version
                media_id = await self._upload_media(media_url, message_type)
                
                if not media_id:
                    result["error"] = "Failed to upload media"
                    return result
                
                # Add text content if provided
                if content:
                    message_data["event"]["message_create"]["message_data"]["text"] = content
                
                # Attach media
                message_data["event"]["message_create"]["message_data"]["attachment"] = {
                    "type": "media",
                    "media": {
                        "id": media_id
                    }
                }
            
            else:
                result["error"] = f"Unsupported message type: {message_type}"
                return result
            
            # Send message to Twitter API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/direct_messages/events/new",
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json"
                    },
                    json=message_data
                )
                
                if response.status_code != 200:
                    result["error"] = f"Twitter API error: {response.text}"
                    logger.error(f"Twitter API error: {response.status_code} - {response.text}")
                    return result
                
                response_data = response.json()
                platform_message_id = response_data.get("event", {}).get("id")
                
                if not platform_message_id:
                    result["error"] = "No message ID returned from Twitter API"
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
            logger.error(f"Error sending Twitter message: {str(e)}", exc_info=True)
            result["error"] = str(e)
            return result
    
    async def get_user_profile(self, platform_user_id: str) -> Dict[str, Any]:
        """
        Get Twitter user profile information.
        
        Args:
            platform_user_id: Twitter user ID
            
        Returns:
            User profile data
        """
        try:
            # Request profile from Twitter API
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/users/{platform_user_id}",
                    headers={"Authorization": f"Bearer {self.bearer_token}"},
                    params={"user.fields": "profile_image_url,name,username,description"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Error getting Twitter user profile: {response.text}")
                    return {}
                
                response_data = response.json()
                user_data = response_data.get("data", {})
                
                # Format profile
                return {
                    "id": platform_user_id,
                    "name": user_data.get("name"),
                    "username": user_data.get("username"),
                    "profile_image_url": user_data.get("profile_image_url"),
                    "description": user_data.get("description")
                }
                
        except Exception as e:
            logger.error(f"Error getting Twitter user profile: {str(e)}")
            return {}
    
    async def _upload_media(self, media_url: str, media_type: str) -> Optional[str]:
        """
        Upload media to Twitter and get media ID.
        
        Args:
            media_url: URL of the media to upload
            media_type: Type of media (image, video)
            
        Returns:
            Twitter media ID or None on failure
        """
        try:
            # Download the media first
            async with httpx.AsyncClient() as client:
                response = await client.get(media_url)
                
                if response.status_code != 200:
                    logger.error(f"Error downloading media from {media_url}: {response.status_code}")
                    return None
                
                media_content = response.content
            
            # Determine MIME type
            if media_type == "image":
                mime_type = "image/jpeg"  # Default to JPEG
                if media_url.lower().endswith(".png"):
                    mime_type = "image/png"
                elif media_url.lower().endswith(".gif"):
                    mime_type = "image/gif"
            else:
                mime_type = "video/mp4"  # Default for videos
            
            # Upload to Twitter's media endpoint
            upload_url = "https://upload.twitter.com/1.1/media/upload.json"
            
            # For larger media, Twitter requires chunked upload
            # This is a simplified version for smaller media
            auth_header = self._get_oauth_header("POST", upload_url)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    upload_url,
                    headers={"Authorization": auth_header},
                    files={"media": ("media", media_content, mime_type)},
                    data={"media_category": "dm_image" if media_type == "image" else "dm_video"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Error uploading media to Twitter: {response.text}")
                    return None
                
                response_data = response.json()
                media_id = response_data.get("media_id_string")
                
                if not media_id:
                    logger.error("No media ID in Twitter response")
                    return None
                
                return media_id
                
        except Exception as e:
            logger.error(f"Error uploading media to Twitter: {str(e)}")
            return None
    
    def _get_oauth_header(self, method: str, url: str) -> str:
        """
        Generate OAuth 1.0a header for Twitter API.
        
        Args:
            method: HTTP method
            url: Request URL
            
        Returns:
            OAuth header string
        """
        import time
        import urllib.parse
        import uuid
        
        # OAuth parameters
        oauth_params = {
            "oauth_consumer_key": self.api_key,
            "oauth_nonce": str(uuid.uuid4()).replace("-", ""),
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(time.time())),
            "oauth_token": self.access_token,
            "oauth_version": "1.0"
        }
        
        # Create signature
        # This is a simplified implementation
        param_string = "&".join([f"{urllib.parse.quote(k)}={urllib.parse.quote(str(v))}" for k, v in sorted(oauth_params.items())])
        base_string = f"{method}&{urllib.parse.quote(url)}&{urllib.parse.quote(param_string)}"
        
        signing_key = f"{urllib.parse.quote(self.api_secret)}&{urllib.parse.quote(self.access_token_secret)}"
        
        signature = base64.b64encode(
            hmac.new(
                signing_key.encode('utf-8'),
                base_string.encode('utf-8'),
                hashlib.sha1
            ).digest()
        ).decode('utf-8')
        
        # Add signature to params
        oauth_params["oauth_signature"] = signature
        
        # Create header string
        header_string = "OAuth " + ", ".join([f"{urllib.parse.quote(k)}=\"{urllib.parse.quote(str(v))}\"" for k, v in sorted(oauth_params.items())])
        
        return header_string