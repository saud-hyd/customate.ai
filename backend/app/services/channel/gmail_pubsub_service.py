# backend/app/services/channel/gmail_pubsub_service.py

import json
import base64
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from google.cloud import pubsub_v1
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import google.auth.exceptions

from app.core import logger
from app.services.channel.channel_service import ChannelService
from app.services.channel.channel_connector import ChannelConnectorFactory

class GmailPubSubService:
    """
    Service for managing Gmail Push Notifications via Google Cloud Pub/Sub.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.channel_service = ChannelService(db)
    
    def setup_gmail_watch(
        self, 
        channel,
        topic_name: str,
        project_id: str
    ) -> Dict[str, Any]:
        """
        Set up Gmail API watch for push notifications.
        
        Args:
            channel: Gmail channel entity
            topic_name: Google Cloud Pub/Sub topic name
            project_id: Google Cloud Project ID
            
        Returns:
            Watch response from Gmail API
        """
        try:
            # Create Gmail service with channel credentials
            credentials = self._get_channel_credentials(channel)
            if not credentials:
                raise Exception("Invalid channel credentials")
            
            service = build('gmail', 'v1', credentials=credentials)
            
            # Set up watch request
            request_body = {
                'labelIds': channel.config.get('watch_labels', ['INBOX']),
                'labelFilterAction': 'include',
                'topicName': f'projects/{project_id}/topics/{topic_name}'
            }
            
            # Execute watch request
            watch_response = service.users().watch(
                userId='me',
                body=request_body
            ).execute()
            
            logger.info(f"Gmail watch set up for channel {channel.channel_id}")
            logger.info(f"Watch response: {watch_response}")
            
            return watch_response
            
        except Exception as e:
            logger.error(f"Error setting up Gmail watch: {e}")
            raise
    
    def stop_gmail_watch(self, channel) -> bool:
        """
        Stop Gmail API watch for a channel.
        
        Args:
            channel: Gmail channel entity
            
        Returns:
            True if successful, False otherwise
        """
        try:
            credentials = self._get_channel_credentials(channel)
            if not credentials:
                return False
            
            service = build('gmail', 'v1', credentials=credentials)
            
            # Stop watch
            service.users().stop(userId='me').execute()
            
            logger.info(f"Gmail watch stopped for channel {channel.channel_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping Gmail watch: {e}")
            return False
    
    async def process_pubsub_notification(self, pubsub_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming Pub/Sub notification from Gmail.
        
        Args:
            pubsub_data: Pub/Sub message data
            
        Returns:
            Processing result
        """
        try:
            # Extract message data
            message = pubsub_data.get('message', {})
            data = message.get('data')
            
            if not data:
                logger.warning("No data in Pub/Sub notification")
                return {"status": "no_data"}
            
            # Decode notification data
            try:
                decoded_data = base64.b64decode(data).decode('utf-8')
                notification = json.loads(decoded_data)
            except Exception as e:
                logger.error(f"Error decoding Pub/Sub data: {e}")
                return {"status": "decode_error", "error": str(e)}
            
            email_address = notification.get('emailAddress')
            history_id = notification.get('historyId')
            
            # CRITICAL DEBUG: Log all Gmail notification details
            logger.error(f"🔍 GMAIL DEBUG - Raw notification data: {notification}")
            logger.error(f"🔍 GMAIL DEBUG - Email from notification: '{email_address}'")
            logger.error(f"🔍 GMAIL DEBUG - History ID: '{history_id}'")
            
            if not email_address or not history_id:
                logger.warning("Missing email address or history ID in notification")
                return {"status": "invalid_notification"}
            
            # Find the Gmail channel for this email address
            channel = self._find_channel_by_email(email_address)
            if not channel:
                logger.warning(f"No channel found for email address: {email_address}")
                
                # FALLBACK: Try to find ANY active Gmail channel as a temporary workaround
                logger.error(f"🔍 GMAIL DEBUG - Attempting fallback channel lookup...")
                fallback_channel = self._find_any_gmail_channel()
                if fallback_channel:
                    logger.error(f"🔍 GMAIL DEBUG - Using fallback channel: {fallback_channel.channel_id} ({fallback_channel.platform_identifier})")
                    channel = fallback_channel
                else:
                    return {"status": "channel_not_found", "email": email_address}
            
            # Process new messages
            processed_count = await self._process_channel_changes(channel, history_id)
            
            # Update the last processed history ID in channel config
            await self._update_last_history_id(channel, history_id)
            
            logger.info(f"Processed {processed_count} messages for channel {channel.channel_id}")
            
            return {
                "status": "success",
                "channel_id": channel.channel_id,
                "processed_messages": processed_count,
                "history_id": history_id
            }
            
        except Exception as e:
            logger.error(f"Error processing Pub/Sub notification: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _process_channel_changes(self, channel, history_id: str) -> int:
        """
        Process changes for a Gmail channel based on history ID.
        
        Args:
            channel: Gmail channel entity
            history_id: Gmail history ID
            
        Returns:
            Number of processed messages
        """
        try:
            # Create Gmail connector
            connector = ChannelConnectorFactory.create_connector(self.db, channel)
            if not connector:
                logger.error(f"Failed to create connector for channel {channel.channel_id}")
                return 0
            
            # Initialize connector
            if not await connector.initialize():
                logger.error(f"Failed to initialize Gmail connector for channel {channel.channel_id}")
                return 0
            
            # Get new messages from history
            new_message_ids = await self._get_new_messages_from_history(connector, history_id)
            
            if not new_message_ids:
                logger.debug(f"No new messages found for channel {channel.channel_id}")
                return 0
            
            # Process each new message
            processed_count = 0
            for message_id in new_message_ids:
                try:
                    await connector._process_email_message(message_id)
                    processed_count += 1
                    logger.info(f"Processed email message {message_id} for channel {channel.channel_id}")
                    
                except Exception as e:
                    logger.error(f"Error processing message {message_id}: {e}")
                    continue
            
            return processed_count
            
        except Exception as e:
            logger.error(f"Error processing channel changes: {e}")
            return 0
    
    async def _get_new_messages_from_history(self, connector, history_id: str) -> list:
        """
        Get new message IDs from Gmail history.
        
        Args:
            connector: Gmail connector instance
            history_id: Starting history ID
            
        Returns:
            List of new message IDs
        """
        try:
            if not connector.service:
                logger.error("Gmail service not initialized")
                return []
            
            # Get the last processed history ID from channel config
            last_processed_history_id = channel.config.get('last_history_id') if channel.config else None
            
            logger.error(f"🔍 HISTORY DEBUG - Current notification history ID: {history_id}")
            logger.error(f"🔍 HISTORY DEBUG - Last processed history ID: {last_processed_history_id}")
            
            # If we have a last processed ID, use it as the starting point
            start_history_id = last_processed_history_id if last_processed_history_id else str(int(history_id) - 100)
            
            logger.error(f"🔍 HISTORY DEBUG - Using start history ID: {start_history_id}")
            
            # Get history since the last processed history ID
            history_response = connector.service.users().history().list(
                userId='me',
                startHistoryId=start_history_id,
                historyTypes=['messageAdded']
            ).execute()
            
            message_ids = []
            for history_record in history_response.get('history', []):
                for message_added in history_record.get('messagesAdded', []):
                    message = message_added.get('message', {})
                    message_id = message.get('id')
                    if message_id:
                        message_ids.append(message_id)
            
            logger.debug(f"Found {len(message_ids)} new messages from history")
            return message_ids
            
        except Exception as e:
            logger.error(f"Error getting messages from history: {e}")
            return []
    
    def _find_channel_by_email(self, email_address: str):
        """Find Gmail channel by email address."""
        try:
            from app.domain.channel.entities import Channel
            
            logger.info(f"Looking for Gmail channel with email: {email_address}")
            
            # Get all Gmail channels for debugging
            all_gmail_channels = self.db.query(Channel).filter(
                Channel.platform == "gmail",
                Channel.active == True
            ).all()
            
            logger.info(f"Found {len(all_gmail_channels)} active Gmail channels")
            for ch in all_gmail_channels:
                logger.info(f"Channel {ch.channel_id}: platform_identifier='{ch.platform_identifier}', active={ch.active}")
            
            channel = self.db.query(Channel).filter(
                Channel.platform == "gmail",
                Channel.platform_identifier == email_address,
                Channel.active == True
            ).first()
            
            if channel:
                logger.info(f"Found matching channel: {channel.channel_id}")
            else:
                logger.warning(f"No matching channel found for email: {email_address}")
            
            return channel
            
        except Exception as e:
            logger.error(f"Error finding channel by email: {e}")
            return None
    
    def _find_any_gmail_channel(self):
        """Find ANY active Gmail channel as a fallback."""
        try:
            from app.domain.channel.entities import Channel
            
            channel = self.db.query(Channel).filter(
                Channel.platform == "gmail",
                Channel.active == True
            ).first()
            
            return channel
            
        except Exception as e:
            logger.error(f"Error finding fallback Gmail channel: {e}")
            return None
    
    def _get_channel_credentials(self, channel) -> Optional[Credentials]:
        """Get Google API credentials for a channel."""
        try:
            credentials_data = channel.credentials or {}
            
            access_token = credentials_data.get("access_token")
            refresh_token = credentials_data.get("refresh_token")
            client_id = credentials_data.get("client_id")
            client_secret = credentials_data.get("client_secret")
            
            if not all([access_token, refresh_token, client_id, client_secret]):
                logger.error("Missing required credentials for Gmail channel")
                return None
            
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret
            )
            
            return credentials
            
        except Exception as e:
            logger.error(f"Error getting channel credentials: {e}")
            return None
    
    def create_pubsub_topic(self, project_id: str, topic_name: str) -> bool:
        """
        Create Google Cloud Pub/Sub topic if it doesn't exist.
        
        Args:
            project_id: Google Cloud Project ID
            topic_name: Topic name to create
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Handle service account credentials for production
            publisher = self._get_pubsub_client()
            topic_path = publisher.topic_path(project_id, topic_name)
            
            try:
                # Try to create the topic
                publisher.create_topic(request={"name": topic_path})
                logger.info(f"✅ Created Pub/Sub topic: {topic_path}")
                return True
                
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info(f"✅ Pub/Sub topic already exists: {topic_path}")
                    return True
                else:
                    logger.error(f"❌ Error creating Pub/Sub topic: {e}")
                    return False
                    
        except Exception as e:
            if "default credentials" in str(e).lower():
                logger.warning(f"⚠️ Google Cloud credentials not configured: {e}")
                logger.info("Gmail integration will use manual processing. To enable real-time notifications:")
                logger.info("1. Set up Google Cloud service account credentials")
                logger.info("2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
                logger.info("3. Or run: gcloud auth application-default login")
            else:
                logger.error(f"❌ Error with Pub/Sub client: {e}")
            return False
    
    def _get_pubsub_client(self):
        """Get Pub/Sub client with proper credential handling for production."""
        import os
        
        # Check if we have service account JSON in environment variable (for Render)
        service_account_json = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
        if service_account_json:
            try:
                import json
                from google.oauth2 import service_account
                
                # Parse JSON credentials
                credentials_info = json.loads(service_account_json)
                credentials = service_account.Credentials.from_service_account_info(credentials_info)
                return pubsub_v1.PublisherClient(credentials=credentials)
            except Exception as e:
                logger.warning(f"Failed to use service account JSON from environment: {e}")
        
        # Fall back to default credentials (file path or ADC)
        return pubsub_v1.PublisherClient()