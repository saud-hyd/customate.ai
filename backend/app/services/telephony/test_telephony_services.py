# backend/tests/services/test_telephony_services.py
"""
Unit tests for telephony services.

Tests service orchestration, voice pipeline, and integration with
existing chat services. Focuses on error handling and performance.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.telephony.enhanced_telephony_service import EnhancedTelephonyService
from app.services.telephony.telephony_service_factory import TelephonyServiceFactory
from app.services.voice.voice_service_factory import VoiceServiceFactory
from app.services.voice.openai_voice_service import OpenAIVoiceService
from app.services.voice.voice_pipeline_service import VoicePipelineService
from app.services.voice.voice_chat_bridge import VoiceChatBridge


class TestVoiceServiceFactory:
    """Test VoiceServiceFactory following LLMFactory patterns."""
    
    @patch('app.core.config.settings.OPENAI_API_KEY', 'test-key')
    def test_create_voice_service_default(self):
        """Test creating voice service with default settings."""
        service = VoiceServiceFactory.create_voice_service("client-123")
        
        assert isinstance(service, OpenAIVoiceService)
        assert service.client_id == "client-123"
        assert service.stt_model == "whisper-1"
        assert service.tts_model == "tts-1"
    
    @patch('app.core.config.settings.OPENAI_API_KEY', 'test-key')
    def test_create_voice_service_with_overrides(self):
        """Test creating voice service with setting overrides."""
        override_settings = {
            "stt_model": "whisper-1",
            "tts_model": "tts-1-hd"
        }
        
        service = VoiceServiceFactory.create_voice_service(
            "client-123",
            override_settings=override_settings
        )
        
        assert service.stt_model == "whisper-1"
        assert service.tts_model == "tts-1-hd"
    
    @patch('app.core.config.settings.OPENAI_API_KEY', None)
    def test_create_voice_service_missing_api_key(self):
        """Test error handling when OpenAI API key is missing."""
        with pytest.raises(ValueError, match="OpenAI API key is required"):
            VoiceServiceFactory.create_voice_service("client-123")
    
    def test_get_supported_models(self):
        """Test getting supported models and voices."""
        models = VoiceServiceFactory.get_supported_models()
        
        assert "stt_models" in models
        assert "tts_models" in models
        assert "tts_voices" in models
        assert len(models["tts_voices"]) == 6  # alloy, echo, fable, onyx, nova, shimmer
    
    def test_estimate_costs(self):
        """Test cost estimation calculation."""
        costs = VoiceServiceFactory.estimate_costs(
            stt_minutes=10,
            tts_characters=1000,
            tts_model="tts-1"
        )
        
        assert "stt_cost_usd" in costs
        assert "tts_cost_usd" in costs  
        assert "total_cost_usd" in costs
        assert costs["stt_minutes"] == 10
        assert costs["tts_characters"] == 1000


class TestOpenAIVoiceService:
    """Test OpenAI voice processing service."""
    
    @patch('app.core.config.settings.OPENAI_API_KEY', 'test-key')
    def test_initialization(self):
        """Test service initialization."""
        service = OpenAIVoiceService("client-123")
        
        assert service.client_id == "client-123"
        assert service.stt_model == "whisper-1"
        assert service.tts_model == "tts-1"
        assert service.api_key == "test-key"
    
    @patch('app.core.config.settings.OPENAI_API_KEY', None)
    def test_initialization_missing_key(self):
        """Test initialization fails without API key."""
        with pytest.raises(ValueError, match="OpenAI API key is required"):
            OpenAIVoiceService("client-123")
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.post')
    async def test_transcribe_audio_success(self, mock_post):
        """Test successful audio transcription."""
        # Mock successful OpenAI API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "text": "Hello, how are you?",
            "language": "en",
            "duration": 2.5
        }
        mock_post.return_value = mock_response
        
        with patch('app.core.config.settings.OPENAI_API_KEY', 'test-key'):
            service = OpenAIVoiceService("client-123")
            
            result = await service.transcribe_audio(
                audio_data=b"fake audio data",
                audio_format="wav"
            )
        
        assert result["success"] is True
        assert result["text"] == "Hello, how are you?"
        assert result["language"] == "en"
        assert result["client_id"] == "client-123"
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.post')
    async def test_transcribe_audio_api_error(self, mock_post):
        """Test handling of OpenAI API errors."""
        # Mock API error response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_post.return_value = mock_response
        
        with patch('app.core.config.settings.OPENAI_API_KEY', 'test-key'):
            service = OpenAIVoiceService("client-123")
            
            result = await service.transcribe_audio(
                audio_data=b"fake audio data",
                audio_format="wav"
            )
        
        assert result["success"] is False
        assert "STT API error" in result["error"]
        assert result["text"] == ""
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.post')
    async def test_generate_speech_success(self, mock_post):
        """Test successful speech generation."""
        # Mock successful OpenAI API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b"fake audio data"
        mock_post.return_value = mock_response
        
        with patch('app.core.config.settings.OPENAI_API_KEY', 'test-key'):
            service = OpenAIVoiceService("client-123")
            
            result = await service.generate_speech(
                text="Hello, welcome to our service!",
                voice="alloy"
            )
        
        assert result["success"] is True
        assert result["audio_data"] == b"fake audio data"
        assert result["voice_used"] == "alloy"
        assert result["client_id"] == "client-123"
    
    @pytest.mark.asyncio
    async def test_generate_speech_empty_text(self):
        """Test handling of empty text input."""
        with patch('app.core.config.settings.OPENAI_API_KEY', 'test-key'):
            service = OpenAIVoiceService("client-123")
            
            result = await service.generate_speech(text="")
        
        assert result["success"] is False
        assert "Text cannot be empty" in result["error"]
        assert result["audio_data"] is None
    
    def test_set_default_voice(self):
        """Test setting default voice."""
        with patch('app.core.config.settings.OPENAI_API_KEY', 'test-key'):
            service = OpenAIVoiceService("client-123")
            
            service.set_default_voice("nova")
            assert service.default_voice == "nova"
            
            # Test invalid voice (should not change)
            service.set_default_voice("invalid_voice")
            assert service.default_voice == "nova"  # Should remain unchanged


class TestVoiceChatBridge:
    """Test voice-chat integration bridge."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return Mock(spec=Session)
    
    @pytest.fixture
    def mock_chat_service(self):
        """Mock EnhancedChatService."""
        mock_service = Mock()
        mock_service.process_message = AsyncMock(return_value={
            "session_id": "chat-session-123",
            "message": {"content": "Hello! How can I help you?"},
            "knowledge_used": True,
            "response_time_ms": 500
        })
        return mock_service
    
    @patch('app.services.llm.llm_factory.LLMFactory.create_llm_service')
    @patch('app.services.knowledge.enhanced_search_service.EnhancedSearchService')
    @patch('app.services.chat.context_manager.ContextManager')
    @patch('app.services.chat.enhanced_chat_service.EnhancedChatService')
    def test_initialization(self, mock_chat_service, mock_context, mock_search, mock_llm, mock_db_session):
        """Test bridge initialization."""
        bridge = VoiceChatBridge(mock_db_session, "client-123")
        
        assert bridge.client_id == "client-123"
        assert bridge.db == mock_db_session
        mock_llm.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_voice_message_success(self, mock_db_session):
        """Test successful voice message processing."""
        # Mock dependencies
        with patch.object(VoiceChatBridge, '_initialize_chat_services'):
            bridge = VoiceChatBridge(mock_db_session, "client-123")
            
            # Mock chat service
            bridge.chat_service = Mock()
            bridge.chat_service.process_message = AsyncMock(return_value={
                "session_id": "chat-session-123", 
                "message": {"content": "Hello! How can I help you?"},
                "knowledge_used": True,
                "response_time_ms": 500
            })
            
            # Mock voice session repository
            mock_voice_session = Mock()
            mock_voice_session.session_id = "voice-session-123"
            mock_voice_session.chat_session_id = None
            bridge.voice_session_repo.get_by_call_id = Mock(return_value=mock_voice_session)
            
            result = await bridge.process_voice_message(
                call_id="call-123",
                transcribed_text="Hello there",
                user_info={"caller_number": "+1234567890"}
            )
        
        assert result["success"] is True
        assert result["response_text"] == "Hello! How can I help you?"
        assert result["knowledge_used"] is True


class TestVoicePipelineService:
    """Test complete voice processing pipeline."""
    
    @pytest.fixture
    def mock_voice_service(self):
        """Mock OpenAI voice service."""
        mock_service = Mock()
        mock_service.transcribe_audio = AsyncMock(return_value={
            "success": True,
            "text": "Hello, I need help",
            "language": "en",
            "confidence": 0.95,
            "processing_time_seconds": 1.2
        })
        mock_service.generate_speech = AsyncMock(return_value={
            "success": True,
            "audio_data": b"response audio data",
            "audio_format": "mp3",
            "processing_time_seconds": 0.8
        })
        return mock_service
    
    @pytest.fixture
    def mock_voice_bridge(self):
        """Mock voice chat bridge."""
        mock_bridge = Mock()
        mock_bridge.process_voice_message = AsyncMock(return_value={
            "success": True,
            "response_text": "I'm here to help! What do you need?",
            "knowledge_used": True,
            "processing_time": 800
        })
        return mock_bridge
    
    @pytest.mark.asyncio
    async def test_process_voice_message_complete_pipeline(self, mock_voice_service, mock_voice_bridge):
        """Test complete voice processing pipeline."""
        mock_db = Mock()
        mock_event_repo = Mock()
        mock_event_repo.create_event = Mock()
        
        pipeline = VoicePipelineService(
            db=mock_db,
            client_id="client-123",
            call_id="call-123",
            voice_service=mock_voice_service,
            voice_chat_bridge=mock_voice_bridge,
            event_repo=mock_event_repo
        )
        
        result = await pipeline.process_voice_message(
            audio_data=b"input audio data",
            audio_format="wav",
            caller_info={"caller_number": "+1234567890"}
        )
        
        # Verify pipeline completed successfully
        assert result["success"] is True
        assert result["transcribed_text"] == "Hello, I need help"
        assert result["response_text"] == "I'm here to help! What do you need?"
        assert result["audio_response"] == b"response audio data"
        
        # Verify all pipeline steps were called
        mock_voice_service.transcribe_audio.assert_called_once()
        mock_voice_bridge.process_voice_message.assert_called_once()
        mock_voice_service.generate_speech.assert_called_once()
        
        # Verify events were logged
        assert mock_event_repo.create_event.call_count >= 3  # Started, completed, etc.
    
    @pytest.mark.asyncio
    async def test_process_voice_message_stt_failure(self, mock_voice_service, mock_voice_bridge):
        """Test pipeline handling of STT failure."""
        # Mock STT failure
        mock_voice_service.transcribe_audio = AsyncMock(return_value={
            "success": False,
            "error": "Audio format not supported",
            "text": ""
        })
        
        mock_db = Mock()
        mock_event_repo = Mock()
        mock_event_repo.create_event = Mock()
        
        pipeline = VoicePipelineService(
            db=mock_db,
            client_id="client-123", 
            call_id="call-123",
            voice_service=mock_voice_service,
            voice_chat_bridge=mock_voice_bridge,
            event_repo=mock_event_repo
        )
        
        result = await pipeline.process_voice_message(
            audio_data=b"input audio data",
            audio_format="wav"
        )
        
        # Pipeline should handle failure gracefully
        assert result["success"] is False
        assert "STT failed" in result["error"]
        assert result["fallback_used"] is True  # Should provide fallback response
        
        # Should not proceed to chat or TTS
        mock_voice_bridge.process_voice_message.assert_not_called()


class TestTelephonyServiceFactory:
    """Test TelephonyServiceFactory following LLMFactory patterns."""
    
    @patch('app.core.config.settings.TWILIO_ACCOUNT_SID', 'test-sid')
    @patch('app.core.config.settings.TWILIO_AUTH_TOKEN', 'test-token')
    @patch('app.core.config.settings.OPENAI_API_KEY', 'test-key')
    def test_create_telephony_service(self):
        """Test creating telephony service."""
        mock_db = Mock()
        
        with patch('app.services.telephony.enhanced_telephony_service.EnhancedTelephonyService') as mock_service:
            service = TelephonyServiceFactory.create_telephony_service(
                db=mock_db,
                client_id="client-123"
            )
            
            # Verify service was created with proper dependencies
            mock_service.assert_called_once()
            call_args = mock_service.call_args
            
            assert call_args[1]["client_id"] == "client-123"
            assert call_args[1]["db"] == mock_db
            assert "call_repo" in call_args[1]
            assert "phone_repo" in call_args[1]
            assert "twilio_service" in call_args[1]
    
    @patch('app.core.config.settings.TWILIO_ACCOUNT_SID', None)
    def test_create_telephony_service_missing_twilio_config(self):
        """Test error when Twilio configuration is missing.""" 
        mock_db = Mock()
        
        with pytest.raises(ValueError, match="Twilio Account SID and Auth Token are required"):
            TelephonyServiceFactory.create_telephony_service(
                db=mock_db,
                client_id="client-123"
            )
    
    def test_validate_configuration_valid(self):
        """Test configuration validation with valid settings."""
        with patch('app.core.config.settings.TWILIO_ACCOUNT_SID', 'test-sid'), \
             patch('app.core.config.settings.TWILIO_AUTH_TOKEN', 'test-token'), \
             patch('app.core.config.settings.OPENAI_API_KEY', 'test-key'):
            
            result = TelephonyServiceFactory.validate_configuration()
            
            assert result["valid"] is True
            assert len(result["issues"]) == 0
            assert result["configured_items"]["account_sid"] is True
    
    def test_validate_configuration_invalid(self):
        """Test configuration validation with missing settings."""
        with patch('app.core.config.settings.TWILIO_ACCOUNT_SID', None), \
             patch('app.core.config.settings.TWILIO_AUTH_TOKEN', None):
            
            result = TelephonyServiceFactory.validate_configuration()
            
            assert result["valid"] is False
            assert len(result["issues"]) > 0
            assert "TWILIO_ACCOUNT_SID not configured" in result["issues"]
    
    def test_estimate_costs(self):
        """Test cost estimation for telephony services."""
        costs = TelephonyServiceFactory.estimate_costs(
            call_minutes=60,
            stt_minutes=50,
            tts_characters=5000,
            phone_numbers=2
        )
        
        assert "call_cost_usd" in costs
        assert "phone_number_cost_usd" in costs
        assert "stt_cost_usd" in costs
        assert "tts_cost_usd" in costs
        assert "total_cost_usd" in costs
        assert costs["provider"] == "twilio"


# Integration Tests
class TestTelephonyServiceIntegration:
    """Integration tests for telephony services."""
    
    @pytest.mark.asyncio
    async def test_full_call_processing_flow(self):
        """Test complete call processing from start to finish."""
        # This would test the full flow:
        # 1. Inbound call received
        # 2. Call tracking started
        # 3. Voice input processed through pipeline
        # 4. Response generated and sent
        # 5. Call ended and analytics updated
        
        # Mock all dependencies
        mock_db = Mock()
        
        # This test would be more complex in a real implementation
        # For now, just verify the structure exists
        assert hasattr(EnhancedTelephonyService, 'process_inbound_call')
        assert hasattr(EnhancedTelephonyService, 'process_voice_input')
        assert hasattr(EnhancedTelephonyService, 'end_call')


# Fixtures
@pytest.fixture
def mock_db_session():
    """Mock database session for testing."""
    return Mock(spec=Session)

@pytest.fixture
def sample_audio_data():
    """Sample audio data for testing."""
    return b"fake audio data for testing"

@pytest.fixture
def sample_call_data():
    """Sample call data for testing."""
    return {
        "call_id": "test-call-123",
        "phone_number": "+1234567890",
        "caller_number": "+0987654321",
        "direction": "inbound",
        "twilio_call_sid": "CA1234567890"
    }