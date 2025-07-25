# backend/app/services/telephony/twilio_provider_service.py
from typing import Dict, Any, Optional, List
import httpx
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioException
from datetime import datetime

from app.core.config.settings import settings
from app.core import logger

class TwilioProviderService:
    """
    Twilio telephony provider service.
    
    Handles phone number provisioning, call management, and webhook processing
    for Twilio integration. Follows existing provider service patterns.
    """
    
    def __init__(
        self,
        client_id: str,
        override_settings: Optional[Dict[str, Any]] = None
    ):
        self.client_id = client_id
        
        # Get Twilio credentials
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.webhook_url = getattr(settings, "TWILIO_WEBHOOK_URL", None)
        
        # Apply overrides if provided
        if override_settings:
            self.account_sid = override_settings.get("account_sid", self.account_sid)
            self.auth_token = override_settings.get("auth_token", self.auth_token)
            self.webhook_url = override_settings.get("webhook_url", self.webhook_url)
        
        # Validate configuration
        if not self.account_sid or not self.auth_token:
            logger.error("Twilio credentials not configured!")
            raise ValueError("Twilio Account SID and Auth Token are required")
        
        # Initialize Twilio client
        try:
            self.twilio_client = TwilioClient(self.account_sid, self.auth_token)
            logger.info(f"Twilio service initialized for client {client_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {str(e)}")
            raise ValueError(f"Twilio client initialization failed: {str(e)}")
    
    async def provision_phone_number(
        self,
        area_code: Optional[str] = None,
        country_code: str = "US",
        phone_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Provision a new phone number from Twilio.
        
        Args:
            area_code: Preferred area code (US only)
            country_code: Country code (US, CA, UK, etc.)
            phone_number: Specific phone number to purchase (if available)
            
        Returns:
            Dict with provisioned phone number details
        """
        try:
            logger.info(f"Provisioning phone number for client {self.client_id}: area_code={area_code}, country={country_code}")
            
            if phone_number:
                # Try to purchase specific number
                available_numbers = self.twilio_client.available_phone_numbers(country_code) \
                    .local.list(phone_number=phone_number, limit=1)
            else:
                # Search for available numbers
                search_params = {"limit": 10}
                if area_code:
                    search_params["area_code"] = area_code
                
                available_numbers = self.twilio_client.available_phone_numbers(country_code) \
                    .local.list(**search_params)
            
            if not available_numbers:
                return {
                    "success": False,
                    "error": f"No available phone numbers found for area code {area_code} in {country_code}",
                    "phone_number": None
                }
            
            # Purchase the first available number
            selected_number = available_numbers[0]
            
            # Configure webhook URL if available
            purchase_params = {
                "phone_number": selected_number.phone_number,
                "friendly_name": f"Customate.ai - Client {self.client_id}"
            }
            
            if self.webhook_url:
                purchase_params.update({
                    "voice_url": f"{self.webhook_url}/twilio/voice",
                    "voice_method": "POST",
                    "status_callback": f"{self.webhook_url}/twilio/status",
                    "status_callback_method": "POST"
                })
            
            # Purchase the number
            purchased_number = self.twilio_client.incoming_phone_numbers.create(**purchase_params)
            
            logger.info(f"Successfully provisioned phone number {purchased_number.phone_number} for client {self.client_id}")
            
            return {
                "success": True,
                "phone_number": purchased_number.phone_number,
                "provider_sid": purchased_number.sid,
                "country_code": country_code,
                "friendly_name": purchased_number.friendly_name,
                "capabilities": {
                    "voice": True,
                    "sms": hasattr(purchased_number, "sms_url"),
                    "mms": hasattr(purchased_number, "mms_url")
                },
                "webhook_configured": bool(self.webhook_url),
                "cost_per_month": "$1.15"  # Approximate US pricing
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error provisioning phone number: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {str(e)}",
                "phone_number": None
            }
        except Exception as e:
            logger.error(f"Unexpected error provisioning phone number: {str(e)}")
            return {
                "success": False,
                "error": f"Provisioning failed: {str(e)}",
                "phone_number": None
            }
    
    async def release_phone_number(self, provider_sid: str) -> Dict[str, Any]:
        """
        Release a phone number back to Twilio.
        
        Args:
            provider_sid: Twilio SID for the phone number
            
        Returns:
            Dict with release operation result
        """
        try:
            logger.info(f"Releasing phone number {provider_sid} for client {self.client_id}")
            
            # Delete the phone number
            self.twilio_client.incoming_phone_numbers(provider_sid).delete()
            
            logger.info(f"Successfully released phone number {provider_sid}")
            
            return {
                "success": True,
                "provider_sid": provider_sid,
                "released_at": datetime.utcnow().isoformat()
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error releasing phone number {provider_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {str(e)}",
                "provider_sid": provider_sid
            }
        except Exception as e:
            logger.error(f"Unexpected error releasing phone number {provider_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Release failed: {str(e)}",
                "provider_sid": provider_sid
            }
    
    async def update_phone_number_config(
        self,
        provider_sid: str,
        webhook_url: Optional[str] = None,
        friendly_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update phone number configuration.
        
        Args:
            provider_sid: Twilio SID for the phone number
            webhook_url: New webhook URL
            friendly_name: New friendly name
            
        Returns:
            Dict with update operation result
        """
        try:
            logger.info(f"Updating phone number config {provider_sid} for client {self.client_id}")
            
            update_params = {}
            
            if webhook_url:
                update_params.update({
                    "voice_url": f"{webhook_url}/twilio/voice",
                    "voice_method": "POST",
                    "status_callback": f"{webhook_url}/twilio/status",
                    "status_callback_method": "POST"
                })
            
            if friendly_name:
                update_params["friendly_name"] = friendly_name
            
            if not update_params:
                return {
                    "success": False,
                    "error": "No update parameters provided",
                    "provider_sid": provider_sid
                }
            
            # Update the phone number
            updated_number = self.twilio_client.incoming_phone_numbers(provider_sid).update(**update_params)
            
            logger.info(f"Successfully updated phone number config {provider_sid}")
            
            return {
                "success": True,
                "provider_sid": provider_sid,
                "phone_number": updated_number.phone_number,
                "friendly_name": updated_number.friendly_name,
                "voice_url": updated_number.voice_url,
                "updated_at": datetime.utcnow().isoformat()
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error updating phone number {provider_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {str(e)}",
                "provider_sid": provider_sid
            }
        except Exception as e:
            logger.error(f"Unexpected error updating phone number {provider_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Update failed: {str(e)}",
                "provider_sid": provider_sid
            }
    
    async def get_call_details(self, twilio_call_sid: str) -> Dict[str, Any]:
        """
        Get call details from Twilio.
        
        Args:
            twilio_call_sid: Twilio call SID
            
        Returns:
            Dict with call details
        """
        try:
            call = self.twilio_client.calls(twilio_call_sid).fetch()
            
            return {
                "success": True,
                "call_sid": call.sid,
                "from_number": call.from_,
                "to_number": call.to,
                "status": call.status,
                "direction": call.direction,
                "start_time": call.start_time.isoformat() if call.start_time else None,
                "end_time": call.end_time.isoformat() if call.end_time else None,
                "duration": call.duration,
                "price": float(call.price) if call.price else None,
                "price_unit": call.price_unit
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error getting call details {twilio_call_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {str(e)}",
                "call_sid": twilio_call_sid
            }
        except Exception as e:
            logger.error(f"Unexpected error getting call details {twilio_call_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to get call details: {str(e)}",
                "call_sid": twilio_call_sid
            }
    
    async def end_call(self, twilio_call_sid: str) -> Dict[str, Any]:
        """
        End an active call.
        
        Args:
            twilio_call_sid: Twilio call SID
            
        Returns:
            Dict with end call operation result
        """
        try:
            logger.info(f"Ending call {twilio_call_sid} for client {self.client_id}")
            
            call = self.twilio_client.calls(twilio_call_sid).update(status="completed")
            
            logger.info(f"Successfully ended call {twilio_call_sid}")
            
            return {
                "success": True,
                "call_sid": twilio_call_sid,
                "status": call.status,
                "ended_at": datetime.utcnow().isoformat()
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error ending call {twilio_call_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {str(e)}",
                "call_sid": twilio_call_sid
            }
        except Exception as e:
            logger.error(f"Unexpected error ending call {twilio_call_sid}: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to end call: {str(e)}",
                "call_sid": twilio_call_sid
            }
    
    def generate_twiml_response(self, audio_url: Optional[str] = None, text: Optional[str] = None) -> str:
        """
        Generate TwiML response for Twilio webhooks.
        
        Args:
            audio_url: URL to audio file to play
            text: Text to speak using TTS
            
        Returns:
            TwiML XML string
        """
        from twilio.twiml import VoiceResponse
        
        response = VoiceResponse()
        
        if audio_url:
            response.play(audio_url)
        elif text:
            response.say(text, voice="alice")
        else:
            response.say("Hello! Welcome to Customate AI.", voice="alice")
        
        # Add gather for continuous interaction
        gather = response.gather(
            input="speech",
            timeout=10,
            speech_timeout="auto",
            action=f"{self.webhook_url}/twilio/process" if self.webhook_url else None
        )
        
        return str(response)
    
    async def validate_webhook_signature(
        self,
        url: str,
        post_vars: Dict[str, Any],
        signature: str
    ) -> bool:
        """
        Validate Twilio webhook signature for security.
        
        Args:
            url: Request URL
            post_vars: POST variables
            signature: X-Twilio-Signature header
            
        Returns:
            True if signature is valid
        """
        try:
            from twilio.request_validator import RequestValidator
            
            validator = RequestValidator(self.auth_token)
            return validator.validate(url, post_vars, signature)
            
        except Exception as e:
            logger.error(f"Webhook signature validation error: {str(e)}")
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if Twilio service is operational."""
        try:
            # Test API connectivity by fetching account info
            account = self.twilio_client.api.accounts(self.account_sid).fetch()
            
            return {
                "healthy": True,
                "service": "Twilio Provider",
                "client_id": self.client_id,
                "account_sid": self.account_sid,
                "account_status": account.status,
                "webhook_configured": bool(self.webhook_url)
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "service": "Twilio Provider",
                "client_id": self.client_id,
                "error": str(e)
            }
    
    def get_configuration(self) -> Dict[str, Any]:
        """Get current Twilio configuration."""
        return {
            "provider": "twilio",
            "client_id": self.client_id,
            "account_sid": self.account_sid,
            "webhook_url": self.webhook_url,
            "configured": bool(self.account_sid and self.auth_token)
        }