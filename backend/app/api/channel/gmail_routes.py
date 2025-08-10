# backend/app/api/channel/gmail_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, EmailStr

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.services.auth.gmail_auth_service import GmailAuthService
from app.services.channel.channel_service import ChannelService
from app.repositories.channel_repository import ChannelRepository
from app.core import logger
from app.core.config.settings import settings

router = APIRouter(prefix="/channel/gmail", tags=["gmail"])

# Schema classes
class GmailOAuthRequest(BaseModel):
    client_id: str = Field(..., description="Google OAuth client ID")
    client_secret: str = Field(..., description="Google OAuth client secret")
    redirect_uri: str = Field(..., description="OAuth redirect URI")

class GmailOAuthResponse(BaseModel):
    authorization_url: str = Field(..., description="Gmail OAuth authorization URL")
    state: str = Field(..., description="OAuth state for CSRF protection")

class GmailTokenExchange(BaseModel):
    code: str = Field(..., description="OAuth authorization code")
    state: str = Field(..., description="OAuth state")

class GmailChannelCreate(BaseModel):
    name: str = Field(..., description="Display name for the Gmail channel")
    email_address: EmailStr = Field(..., description="Gmail email address")
    access_token: str = Field(..., description="OAuth access token")
    refresh_token: str = Field(..., description="OAuth refresh token")
    client_id: str = Field(..., description="Google OAuth client ID")
    client_secret: str = Field(..., description="Google OAuth client secret")
    config: Optional[Dict[str, Any]] = Field(
        default_factory=lambda: {
            "auto_reply": True,
            "signature": "",
            "label_ids": ["INBOX"],
            "watch_labels": ["UNREAD"]
        },
        description="Gmail-specific configuration"
    )

class GmailSearchRequest(BaseModel):
    query: str = Field(..., description="Gmail search query")
    max_results: int = Field(default=10, ge=1, le=50, description="Maximum number of results")
    label_ids: Optional[list[str]] = Field(None, description="Gmail label IDs to filter")

@router.post("/oauth/authorize", response_model=GmailOAuthResponse)
async def initiate_gmail_oauth(
    oauth_request: GmailOAuthRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Initiate Gmail OAuth 2.0 authorization flow.
    Returns authorization URL for user to grant Gmail access.
    """
    try:
        gmail_auth = GmailAuthService(db)
        
        result = gmail_auth.get_authorization_url(
            client_id=oauth_request.client_id,
            client_secret=oauth_request.client_secret,
            redirect_uri=oauth_request.redirect_uri,
            user_id=client.client_id
        )
        
        logger.info(f"Gmail OAuth initiated for client {client.client_id}")
        
        return GmailOAuthResponse(
            authorization_url=result["authorization_url"],
            state=result["state"]
        )
        
    except Exception as e:
        logger.error(f"Gmail OAuth initiation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Gmail authorization: {str(e)}"
        )

@router.post("/oauth/callback")
async def handle_gmail_oauth_callback(
    token_exchange: GmailTokenExchange,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Handle Gmail OAuth callback and exchange code for tokens.
    Returns user info and tokens for channel creation.
    """
    try:
        gmail_auth = GmailAuthService(db)
        
        # Exchange code for tokens
        result = gmail_auth.exchange_code_for_tokens(
            code=token_exchange.code,
            state=token_exchange.state
        )
        
        logger.info(f"Gmail OAuth completed for client {client.client_id}, email: {result['user_info']['email']}")
        
        return {
            "status": "success",
            "message": "Gmail authorization successful",
            "tokens": {
                "access_token": result["access_token"],
                "refresh_token": result["refresh_token"],
                "client_id": result["client_id"],
                "client_secret": result["client_secret"]
            },
            "user_info": result["user_info"]
        }
        
    except Exception as e:
        logger.error(f"Gmail OAuth callback failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth callback failed: {str(e)}"
        )

@router.post("/create")
async def create_gmail_channel(
    channel_data: GmailChannelCreate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Create a new Gmail channel using OAuth tokens.
    """
    try:
        channel_service = ChannelService(db)
        gmail_auth = GmailAuthService(db)
        
        # Validate credentials
        is_valid = gmail_auth.validate_credentials(
            access_token=channel_data.access_token,
            refresh_token=channel_data.refresh_token,
            client_id=channel_data.client_id,
            client_secret=channel_data.client_secret
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Gmail credentials"
            )
        
        # Create channel
        credentials = {
            "access_token": channel_data.access_token,
            "refresh_token": channel_data.refresh_token,
            "client_id": channel_data.client_id,
            "client_secret": channel_data.client_secret,
            "type": "oauth2"
        }
        
        # Prepare channel data dictionary
        channel_dict = {
            "name": channel_data.name,
            "platform": "gmail",
            "platform_identifier": channel_data.email_address,
            "credentials": credentials,
            "config": channel_data.config
        }
        
        channel = channel_service.create_channel(client.client_id, channel_dict)
        
        # Set up Gmail watch for push notifications using Google Cloud Pub/Sub
        try:
            from app.services.channel.gmail_pubsub_service import GmailPubSubService
            from app.core.config.settings import settings
            
            if settings.is_google_cloud_configured():
                pubsub_service = GmailPubSubService(db)
                
                # Use environment configuration
                project_id = settings.GOOGLE_CLOUD_PROJECT_ID
                topic_name = settings.GMAIL_PUBSUB_TOPIC
                
                # Create Pub/Sub topic if it doesn't exist
                if pubsub_service.create_pubsub_topic(project_id, topic_name):
                    # Set up Gmail watch
                    watch_response = pubsub_service.setup_gmail_watch(channel, topic_name, project_id)
                    logger.info(f"Gmail watch set up for channel {channel.channel_id}: {watch_response}")
                else:
                    logger.warning(f"Failed to create/verify Pub/Sub topic: {topic_name}")
            else:
                logger.info("Google Cloud Pub/Sub not configured - Gmail will use manual processing")
            
        except Exception as e:
            logger.warning(f"Could not set up Gmail watch: {e}")
        
        logger.info(f"Gmail channel created: {channel.channel_id} for {channel_data.email_address}")
        
        return {
            "status": "success",
            "message": "Gmail channel created successfully",
            "channel": {
                "channel_id": channel.channel_id,
                "name": channel.name,
                "platform": channel.platform,
                "email_address": channel.platform_identifier,
                "webhook_url": f"/api/channel/gmail/webhook/pubsub",
                "active": channel.active
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gmail channel creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Gmail channel: {str(e)}"
        )

@router.post("/{channel_id}/search")
async def search_gmail_emails(
    channel_id: str,
    search_request: GmailSearchRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Search emails in the Gmail channel using Gmail query syntax.
    """
    try:
        channel_service = ChannelService(db)
        
        # Get channel
        channel = channel_service.get_channel_by_id(client.client_id, channel_id)
        if not channel or channel.platform != "gmail":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gmail channel not found"
            )
        
        # Create Gmail connector
        from app.services.channel.channel_connector import ChannelConnectorFactory
        connector = ChannelConnectorFactory.create_connector(db, channel)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create Gmail connector"
            )
        
        # Initialize connector
        if not await connector.initialize():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize Gmail connection"
            )
        
        # Search emails
        results = await connector.search_emails(
            query=search_request.query,
            max_results=search_request.max_results,
            label_ids=search_request.label_ids
        )
        
        return {
            "status": "success",
            "query": search_request.query,
            "results_count": len(results),
            "emails": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gmail search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email search failed: {str(e)}"
        )

@router.post("/{channel_id}/refresh-tokens")
async def refresh_gmail_tokens(
    channel_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Refresh Gmail OAuth tokens for a channel.
    """
    try:
        channel_service = ChannelService(db)
        gmail_auth = GmailAuthService(db)
        
        # Get channel
        channel = channel_service.get_channel_by_id(client.client_id, channel_id)
        if not channel or channel.platform != "gmail":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gmail channel not found"
            )
        
        credentials = channel.credentials or {}
        
        # Refresh tokens
        result = gmail_auth.refresh_access_token(
            refresh_token=credentials.get("refresh_token"),
            client_id=credentials.get("client_id"),
            client_secret=credentials.get("client_secret")
        )
        
        # Update channel credentials
        updated_credentials = credentials.copy()
        updated_credentials["access_token"] = result["access_token"]
        if result.get("refresh_token"):
            updated_credentials["refresh_token"] = result["refresh_token"]
        
        # Use update_channel method
        channel_service.update_channel(client.client_id, channel_id, {"credentials": updated_credentials})
        
        logger.info(f"Gmail tokens refreshed for channel {channel_id}")
        
        return {
            "status": "success",
            "message": "Gmail tokens refreshed successfully",
            "expires_at": result.get("expires_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gmail token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.delete("/{channel_id}/revoke")
async def revoke_gmail_access(
    channel_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Revoke Gmail API access and delete the channel.
    """
    try:
        channel_service = ChannelService(db)
        gmail_auth = GmailAuthService(db)
        
        # Get channel
        channel = channel_service.get_channel_by_id(client.client_id, channel_id)
        if not channel or channel.platform != "gmail":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gmail channel not found"
            )
        
        credentials = channel.credentials or {}
        
        # Revoke access token
        access_token = credentials.get("access_token")
        if access_token:
            gmail_auth.revoke_access(access_token)
        
        # Delete channel
        channel_service.delete_channel(client.client_id, channel_id)
        
        logger.info(f"Gmail access revoked and channel deleted: {channel_id}")
        
        return {
            "status": "success",
            "message": "Gmail access revoked and channel deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gmail access revocation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Access revocation failed: {str(e)}"
        )

@router.post("/{channel_id}/setup-watch")
async def setup_gmail_watch(
    channel_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Set up Gmail push notifications via Google Cloud Pub/Sub."""
    try:
        # Get channel
        channel_repo = ChannelRepository()
        channel = channel_repo.get_by_channel_id(db, channel_id)
        
        if not channel or channel.client_id != client.client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )
        
        if channel.platform != "gmail":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Channel is not a Gmail channel"
            )
        
        # Create Gmail connector
        from app.services.channel.channel_connector import ChannelConnectorFactory
        connector = ChannelConnectorFactory.create_connector(db, channel)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create Gmail connector"
            )
        
        # Initialize connector
        initialized = await connector.initialize()
        if not initialized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to initialize Gmail connector - check credentials"
            )
        
        # Set up Gmail watch using the service
        try:
            topic_name = f"projects/{settings.GOOGLE_CLOUD_PROJECT_ID}/topics/{settings.GMAIL_PUBSUB_TOPIC}"
            
            # Call Gmail API watch
            import asyncio
            watch_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: connector.service.users().watch(
                    userId='me',
                    body={
                        'topicName': topic_name,
                        'labelIds': ['INBOX']
                    }
                ).execute()
            )
            
            logger.info(f"Gmail watch setup successful: {watch_result}")
            
            return {
                "status": "success",
                "watch_result": watch_result,
                "topic": topic_name,
                "webhook_url": "https://customate-ai-1.onrender.com/api/channel/gmail/webhook/pubsub"
            }
            
        except Exception as e:
            logger.error(f"Gmail watch setup failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to setup Gmail watch: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Gmail watch setup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gmail watch setup error: {str(e)}"
        )

@router.post("/{channel_id}/process-emails")
async def manually_process_emails(
    channel_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Manually trigger email processing for a Gmail channel.
    Useful for testing while setting up push notifications.
    """
    try:
        channel_service = ChannelService(db)
        
        # Get channel
        channel = channel_service.get_channel_by_id(client.client_id, channel_id)
        if not channel or channel.platform != "gmail":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gmail channel not found"
            )
        
        # Create Gmail connector
        from app.services.channel.channel_connector import ChannelConnectorFactory
        connector = ChannelConnectorFactory.create_connector(db, channel)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create Gmail connector"
            )
        
        # Initialize connector
        if not await connector.initialize():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize Gmail connection"
            )
        
        # Search for recent unread emails
        recent_emails = await connector.search_emails(
            query="is:unread newer_than:1h",
            max_results=20,
            label_ids=["INBOX"]
        )
        
        if not recent_emails:
            return {
                "status": "success",
                "message": "No recent unread emails found",
                "processed_count": 0
            }
        
        # Process each email
        processed_count = 0
        for email_data in recent_emails:
            try:
                message_id = email_data.get('id')
                if message_id:
                    await connector._process_email_message(message_id)
                    processed_count += 1
                    
            except Exception as e:
                logger.error(f"Error processing email {email_data.get('id')}: {e}")
                continue
        
        logger.info(f"Manually processed {processed_count} emails for channel {channel_id}")
        
        return {
            "status": "success",
            "message": f"Processed {processed_count} emails successfully",
            "processed_count": processed_count,
            "total_found": len(recent_emails)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual email processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email processing failed: {str(e)}"
        )