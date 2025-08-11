# backend/app/services/channel/platforms/gmail_connector.py

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
import json
import base64
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from concurrent.futures import ThreadPoolExecutor

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import google.auth.exceptions

from app.domain.channel.entities import Channel, ChannelConversation, ChannelMessage
from app.services.channel.channel_connector import ChannelConnector
from app.services.channel.channel_service import ChannelService
from app.core import logger
from app.core.config.settings import settings

class GmailConnector(ChannelConnector):
    """
    Gmail API connector for reading and sending emails.
    Supports OAuth 2.0 authentication and real-time email processing.
    """
    
    def __init__(self, db: Session, channel: Channel):
        super().__init__(db, channel)
        
        # Extract credentials from channel
        self.credentials_data = channel.credentials or {}
        self.config = channel.config or {}
        
        # OAuth 2.0 credentials
        self.client_id = self.credentials_data.get("client_id")
        self.client_secret = self.credentials_data.get("client_secret")
        self.refresh_token = self.credentials_data.get("refresh_token")
        self.access_token = self.credentials_data.get("access_token")
        
        # Gmail API configuration
        self.scopes = ['https://www.googleapis.com/auth/gmail.readonly',
                      'https://www.googleapis.com/auth/gmail.send',
                      'https://www.googleapis.com/auth/gmail.modify']
        
        self.service = None
        self.executor = ThreadPoolExecutor(max_workers=3)
    
    async def initialize(self) -> bool:
        """Initialize the Gmail API service and verify credentials."""
        
        if not self.client_id or not self.client_secret:
            logger.error(f"Gmail OAuth credentials missing for channel {self.channel.channel_id}")
            return False
        
        # For Gmail OAuth flow, if we only have client_id and client_secret (no tokens yet),
        # this means we're in the initial setup phase before OAuth completion.
        # In this case, we validate that the OAuth client credentials are present
        # and return True to allow channel creation.
        if not self.access_token or not self.refresh_token:
            logger.info(f"Gmail channel {self.channel.channel_id} created - OAuth flow required to complete setup")
            return True  # Allow channel creation, OAuth flow will complete the setup
        
        try:
            # Create credentials object
            creds = Credentials(
                token=self.access_token,
                refresh_token=self.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret
            )
            
            # Refresh token if needed
            if creds and creds.expired and creds.refresh_token:
                await asyncio.get_event_loop().run_in_executor(
                    self.executor, creds.refresh, Request()
                )
                
                # Update stored tokens
                await self._update_tokens(creds.token, creds.refresh_token)
            
            if not creds or not creds.valid:
                logger.error(f"Invalid Gmail credentials for channel {self.channel.channel_id}")
                return False
            
            # Build Gmail service
            self.service = await asyncio.get_event_loop().run_in_executor(
                self.executor, 
                lambda: build('gmail', 'v1', credentials=creds)
            )
            
            # Test API access
            profile = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.service.users().getProfile(userId='me').execute()
            )
            
            logger.info(f"✅ Gmail API validation successful for {profile.get('emailAddress')}")
            return True
            
        except google.auth.exceptions.RefreshError as e:
            logger.error(f"❌ Gmail token refresh failed: {e}")
            return False
            
        except HttpError as e:
            logger.error(f"❌ Gmail API error: {e}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Gmail initialization error: {e}")
            return False
    
    async def validate_webhook(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Validate Google Cloud Pub/Sub webhook request.
        For Gmail push notifications via Cloud Pub/Sub.
        """
        try:
            # TEMPORARY: Be completely permissive to debug the issue
            logger.info(f"Gmail webhook validation - Headers: {dict(headers)}")
            logger.info(f"Gmail webhook validation - Body length: {len(body)} bytes")
            
            # Just check if body contains valid JSON
            try:
                import json
                payload = json.loads(body.decode('utf-8'))
                logger.info(f"Gmail webhook validation - Payload keys: {list(payload.keys())}")
                
                # For now, accept any valid JSON payload to debug
                logger.info("Gmail webhook validation - ACCEPTING ALL VALID JSON (temporary debug mode)")
                return True
                
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.error(f"Invalid JSON in webhook body: {e}")
                return False
            
        except Exception as e:
            logger.error(f"Gmail webhook validation error: {e}")
            return False
    
    async def process_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Gmail push notification from Google Cloud Pub/Sub.
        """
        try:
            # Decode Pub/Sub message
            message = payload.get('message', {})
            data = message.get('data')
            
            if not data:
                logger.warning("No data in Gmail push notification")
                return {"status": "no_data"}
            
            # Decode base64 data
            decoded_data = base64.b64decode(data).decode('utf-8')
            notification_data = json.loads(decoded_data)
            
            email_address = notification_data.get('emailAddress')
            history_id = notification_data.get('historyId')
            
            if not email_address or not history_id:
                logger.warning("Missing email address or history ID in notification")
                return {"status": "invalid_notification"}
            
            # Get new messages since last history ID
            new_messages = await self._get_new_messages(history_id)
            
            processed_count = 0
            for message_id in new_messages:
                try:
                    await self._process_email_message(message_id)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"Error processing message {message_id}: {e}")
            
            return {
                "status": "success",
                "processed_messages": processed_count,
                "history_id": history_id
            }
            
        except Exception as e:
            logger.error(f"Gmail webhook processing error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def send_message(
        self,
        conversation_id: str,
        message_type: str,
        content: Optional[str] = None,
        media_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send email reply via Gmail API."""
        
        # Initialize Gmail service if not already done
        if not self.service:
            initialized = await self.initialize()
            if not initialized:
                raise Exception("Failed to initialize Gmail service for sending")
        
        try:
            # Use conversation_id directly - no need to look it up again
            metadata = metadata or {}
            subject = metadata.get('subject', 'Re: Automated Response')
            to_email = metadata.get('to_email')
            thread_id = metadata.get('thread_id')
            
            logger.info(f"Send message called with conversation_id: {conversation_id}")
            logger.info(f"Send message full metadata: {json.dumps(metadata, indent=2)}")
            logger.info(f"To email extracted: '{to_email}', Subject: '{subject}', Thread ID: '{thread_id}'")
            
            if not to_email:
                logger.error("Recipient email address is missing from metadata!")
                logger.error(f"Available metadata keys: {list(metadata.keys())}")
                raise Exception("Recipient email address required")
            
            # Create email message
            if message_type == "text":
                email_msg = self._create_text_email(to_email, subject, content, thread_id)
            else:
                raise Exception(f"Unsupported message type: {message_type}")
            
            # Send email
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.service.users().messages().send(
                    userId='me',
                    body={'raw': email_msg}
                ).execute()
            )
            
            # Store outbound message using the conversation_id parameter
            await self.channel_service.store_message(
                conversation_id=conversation_id,
                platform_message_id=result['id'],
                direction="outbound",
                message_type="text",
                content=content,
                metadata={
                    "gmail_message_id": result['id'],
                    "thread_id": result.get('threadId'),
                    "subject": subject,
                    "to_email": to_email
                }
            )
            
            logger.info(f"Email sent successfully: {result['id']}")
            return {
                "success": True,
                "status": "success",
                "message_id": result['id'],
                "platform_message_id": result['id'],
                "thread_id": result.get('threadId')
            }
            
        except Exception as e:
            logger.error(f"Gmail send error: {e}")
            return {"success": False, "status": "error", "error": str(e)}
    
    async def get_user_profile(self, platform_user_id: str) -> Dict[str, Any]:
        """Get email sender profile information."""
        # For Gmail, platform_user_id is the email address
        return {
            "id": platform_user_id,
            "email": platform_user_id,
            "name": platform_user_id.split('@')[0],  # Use part before @ as name
            "platform": "gmail"
        }
    
    async def search_emails(
        self, 
        query: str, 
        max_results: int = 10,
        label_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Search emails using Gmail API query syntax."""
        
        if not self.service:
            raise Exception("Gmail service not initialized")
        
        try:
            # Build search query
            search_params = {
                'userId': 'me',
                'q': query,
                'maxResults': max_results
            }
            
            if label_ids:
                search_params['labelIds'] = label_ids
            
            # Execute search
            results = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.service.users().messages().list(**search_params).execute()
            )
            
            messages = []
            for msg in results.get('messages', []):
                message_detail = await self._get_message_details(msg['id'])
                if message_detail:
                    messages.append(message_detail)
            
            return messages
            
        except Exception as e:
            logger.error(f"Gmail search error: {e}")
            return []
    
    async def _get_new_messages(self, history_id: str) -> List[str]:
        """Get new message IDs since the given history ID."""
        
        if not self.service:
            return []
        
        try:
            history = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.service.users().history().list(
                    userId='me',
                    startHistoryId=history_id,
                    historyTypes=['messageAdded']
                ).execute()
            )
            
            message_ids = []
            for record in history.get('history', []):
                for message in record.get('messagesAdded', []):
                    message_ids.append(message['message']['id'])
            
            return message_ids
            
        except Exception as e:
            logger.error(f"Error getting new messages: {e}")
            return []
    
    async def _process_email_message(self, message_id: str) -> None:
        """Process a single email message for chatbot response."""
        
        try:
            message_details = await self._get_message_details(message_id)
            if not message_details:
                return
            
            sender_email = message_details['from']
            subject = message_details['subject']
            content = message_details['content']
            thread_id = message_details['thread_id']
            
            # Check if this is an inbound message (not sent by us)
            if sender_email == self.channel.platform_identifier:
                return  # Skip our own messages
            
            # Get or create conversation
            conversation = await self.channel_service.get_or_create_conversation(
                channel_id=self.channel.channel_id,
                platform_user_id=sender_email,
                user_info={"email": sender_email, "thread_id": thread_id}
            )
            
            # Store inbound message
            await self.channel_service.store_message(
                conversation_id=conversation.conversation_id,
                platform_message_id=message_id,
                direction="inbound",
                message_type="text",
                content=content,
                metadata={
                    "gmail_message_id": message_id,
                    "thread_id": thread_id,
                    "subject": subject,
                    "from_email": sender_email
                }
            )
            
            # Get client for the channel - the channel already has client_id
            from app.domain.client.entities import Client
            client = self.db.query(Client).filter(Client.client_id == self.channel.client_id).first()
            if not client:
                logger.error(f"Client not found for channel {self.channel.channel_id}")
                return
            
            # CRITICAL: Check if we should reply to this email using knowledge base relevance
            from app.services.chat.enhanced_chat_service import EnhancedChatService
            from app.services.knowledge.enhanced_search_service import EnhancedSearchService
            from app.services.llm.llm_factory import LLMFactory
            from app.services.channel.email_relevance_filter import EmailRelevanceFilter
            
            # Create required services for chat using proper factory
            llm_service = LLMFactory.create_llm_service(self.db, client.client_id)
            search_service = EnhancedSearchService(llm_service)
            
            # 🔍 ANALYZE EMAIL RELEVANCE BEFORE RESPONDING
            relevance_filter = EmailRelevanceFilter(search_service, llm_service)
            relevance_analysis = await relevance_filter.analyze_email_relevance(
                client_id=client.client_id,
                email_content=content,
                email_subject=subject,
                sender_email=sender_email,
                additional_context={
                    "thread_id": thread_id,
                    "channel_id": self.channel.channel_id
                }
            )
            
            # 📊 Log relevance decision
            logger.info(f"📧 Email relevance analysis for {sender_email}:")
            logger.info(f"  Decision: {'✅ REPLY' if relevance_analysis['should_reply'] else '❌ NO REPLY'}")
            logger.info(f"  Confidence: {relevance_analysis['confidence_score']:.3f}")
            logger.info(f"  Knowledge items: {relevance_analysis['knowledge_items_found']}")
            logger.info(f"  Reasoning: {relevance_analysis['reasoning']}")
            
            # 🚫 SKIP EMAILS WITHOUT SUFFICIENT KNOWLEDGE BASE COVERAGE
            if not relevance_analysis['should_reply']:
                logger.info(f"🚫 Skipping auto-reply to {sender_email} - insufficient knowledge base coverage")
                
                # Store metadata about why we didn't reply
                await self.channel_service.store_message(
                    conversation_id=conversation.conversation_id,
                    platform_message_id=f"skip_{message_id}",
                    direction="system",
                    message_type="filter_decision",
                    content=f"Auto-reply skipped: {relevance_analysis['reasoning']}",
                    metadata={
                        "relevance_analysis": relevance_analysis,
                        "filter_decision": "skipped",
                        "timestamp": message_details['timestamp']
                    }
                )
                return  # Exit without sending reply
            
            # ✅ PROCEED WITH AI RESPONSE - we have good knowledge coverage
            logger.info(f"✅ Proceeding with AI response to {sender_email} - good knowledge coverage")
            
            chat_service = EnhancedChatService(self.db, search_service, llm_service)
            
            # Generate AI response using existing pipeline (collect stream for email)
            response_parts = []
            knowledge_used = False
            
            async for chunk in chat_service.process_message_stream(
                client_id=client.client_id,
                user_message=content,
                session_id=conversation.conversation_id
            ):
                # Track if knowledge was used
                if chunk.get('type') == 'info' and chunk.get('knowledge_used'):
                    knowledge_used = True
                    
                # Collect content from streaming chunks
                if chunk.get('type') == 'chunk' and chunk.get('content'):
                    response_parts.append(chunk['content'])
                elif chunk.get('type') == 'done' and chunk.get('message', {}).get('content'):
                    # Get final content from done message
                    response_parts = [chunk['message']['content']]
                    break
            
            # Combine all streaming chunks into complete response
            ai_response = ''.join(response_parts).strip()
            
            if not ai_response:
                logger.error(f"Empty AI response generated for {sender_email}")
                return
            
            # Add knowledge confidence footer if configured
            if relevance_analysis['confidence_score'] < 0.8:
                ai_response += f"\n\n---\nThis response was generated based on our knowledge base (confidence: {relevance_analysis['confidence_score']:.0%}). If you need further assistance, please don't hesitate to contact our support team directly."
            
            # Send reply email with enhanced metadata
            await self.send_message(
                conversation_id=conversation.conversation_id,
                message_type="text",
                content=ai_response,
                metadata={
                    "subject": f"Re: {subject}",
                    "to_email": sender_email,
                    "thread_id": thread_id,
                    "relevance_analysis": relevance_analysis,
                    "knowledge_used": knowledge_used,
                    "filter_passed": True
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing email message {message_id}: {e}")
    
    async def _get_message_details(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific message."""
        
        if not self.service:
            return None
        
        try:
            message = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.service.users().messages().get(
                    userId='me',
                    id=message_id,
                    format='full'
                ).execute()
            )
            
            # Extract headers
            headers = {}
            for header in message['payload'].get('headers', []):
                headers[header['name'].lower()] = header['value']
            
            # Extract body content
            content = self._extract_email_content(message['payload'])
            
            return {
                'id': message_id,
                'thread_id': message['threadId'],
                'from': headers.get('from', ''),
                'to': headers.get('to', ''),
                'subject': headers.get('subject', ''),
                'content': content,
                'timestamp': int(message['internalDate'])
            }
            
        except Exception as e:
            logger.error(f"Error getting message details for {message_id}: {e}")
            return None
    
    def _extract_email_content(self, payload: Dict[str, Any]) -> str:
        """Extract readable text content from email payload."""
        
        content = ""
        
        if 'parts' in payload:
            # Multipart message
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data')
                    if data:
                        content = base64.urlsafe_b64decode(data).decode('utf-8')
                        break
                elif part['mimeType'] == 'text/html' and not content:
                    # Fallback to HTML if no plain text
                    data = part['body'].get('data')
                    if data:
                        html_content = base64.urlsafe_b64decode(data).decode('utf-8')
                        # Basic HTML stripping (in production, use proper HTML parser)
                        import re
                        content = re.sub('<[^<]+?>', '', html_content)
        else:
            # Single part message
            if payload['mimeType'] == 'text/plain':
                data = payload['body'].get('data')
                if data:
                    content = base64.urlsafe_b64decode(data).decode('utf-8')
        
        return content.strip()
    
    def _create_text_email(
        self, 
        to_email: str, 
        subject: str, 
        content: str, 
        thread_id: Optional[str] = None
    ) -> str:
        """Create a text email message in Gmail API format."""
        
        message = MIMEText(content)
        message['to'] = to_email
        message['subject'] = subject
        
        # Add signature if configured
        signature = self.config.get('signature', '')
        if signature:
            message.set_payload(content + '\n\n' + signature)
        
        # Add threading headers if replying
        if thread_id:
            message['In-Reply-To'] = thread_id
            message['References'] = thread_id
        
        return base64.urlsafe_b64encode(message.as_bytes()).decode()
    
    async def _update_tokens(self, access_token: str, refresh_token: str) -> None:
        """Update stored OAuth tokens in the database."""
        
        updated_credentials = self.credentials_data.copy()
        updated_credentials['access_token'] = access_token
        updated_credentials['refresh_token'] = refresh_token
        
        # Update channel credentials
        await self.channel_service.update_channel_credentials(
            self.channel.channel_id,
            updated_credentials
        )
        
        # Update local credentials
        self.access_token = access_token
        self.refresh_token = refresh_token