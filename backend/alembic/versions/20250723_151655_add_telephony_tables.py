"""add_telephony_tables

Revision ID: 20250723_151655
Revises: 20250420_add_password_hash
Create Date: 2025-07-23 15:16:55.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250723_151655'
down_revision: Union[str, None] = '20250717_114700'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add telephony tables for voice agent functionality."""
    # Check if tables already exist before creating them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create phone_numbers table if it doesn't exist
    if 'phone_numbers' not in existing_tables:
        op.create_table(
            'phone_numbers',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('number_id', sa.String(length=36), nullable=False),
            sa.Column('client_id', sa.String(length=36), nullable=False),
            
            # Phone number details
            sa.Column('phone_number', sa.String(length=20), nullable=False),
            sa.Column('country_code', sa.String(length=5), nullable=False, default='US'),
            sa.Column('area_code', sa.String(length=10), nullable=True),
            
            # Provider details (Twilio)
            sa.Column('provider', sa.String(length=20), nullable=False, default='twilio'),
            sa.Column('provider_sid', sa.String(length=50), nullable=True),
            sa.Column('provider_data', postgresql.JSON(), nullable=True),
            
            # Status and configuration
            sa.Column('status', sa.String(length=20), nullable=False, default='active'),
            sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
            
            # Voice agent configuration
            sa.Column('voice_enabled', sa.Boolean(), nullable=False, default=True),
            sa.Column('voice_model', sa.String(length=50), nullable=False, default='tts-1'),
            sa.Column('voice_language', sa.String(length=10), nullable=False, default='en'),
            sa.Column('voice_speed', sa.Numeric(precision=3, scale=2), nullable=False, default=1.0),
            
            # Timestamps
            sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
            
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
        )
        
        # Create indices for phone_numbers
        op.create_index(op.f('ix_phone_numbers_number_id'), 'phone_numbers', ['number_id'], unique=True)
        op.create_index(op.f('ix_phone_numbers_phone_number'), 'phone_numbers', ['phone_number'], unique=True)
        op.create_index(op.f('ix_phone_numbers_client_id'), 'phone_numbers', ['client_id'])
        op.create_index(op.f('ix_phone_numbers_provider_sid'), 'phone_numbers', ['provider_sid'], unique=True)
    
    # Create calls table if it doesn't exist
    if 'calls' not in existing_tables:
        op.create_table(
            'calls',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('call_id', sa.String(length=36), nullable=False),
            sa.Column('client_id', sa.String(length=36), nullable=False),
            sa.Column('phone_number_id', sa.String(length=36), nullable=False),
            
            # Call identification
            sa.Column('provider_call_sid', sa.String(length=50), nullable=True),
            sa.Column('session_id', sa.String(length=36), nullable=False),
            
            # Call participants
            sa.Column('caller_number', sa.String(length=20), nullable=False),
            sa.Column('called_number', sa.String(length=20), nullable=False),
            sa.Column('direction', sa.String(length=10), nullable=False, default='inbound'),
            
            # Call status and timing
            sa.Column('status', sa.String(length=20), nullable=False, default='initiated'),
            sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('answer_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('duration_seconds', sa.Integer(), nullable=False, default=0),
            
            # Call quality and metadata
            sa.Column('call_quality', sa.String(length=20), nullable=True),
            sa.Column('disconnect_reason', sa.String(length=50), nullable=True),
            sa.Column('provider_data', postgresql.JSON(), nullable=True),
            
            # Voice processing stats
            sa.Column('total_voice_segments', sa.Integer(), nullable=False, default=0),
            sa.Column('total_response_time_ms', sa.Integer(), nullable=False, default=0),
            sa.Column('average_response_time_ms', sa.Integer(), nullable=False, default=0),
            
            # Cost tracking
            sa.Column('cost_per_minute', sa.Numeric(precision=6, scale=4), nullable=True),
            sa.Column('total_cost', sa.Numeric(precision=8, scale=4), nullable=True),
            
            # Timestamps
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
            
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['phone_number_id'], ['phone_numbers.number_id'], ondelete='CASCADE'),
        )
        
        # Create indices for calls
        op.create_index(op.f('ix_calls_call_id'), 'calls', ['call_id'], unique=True)
        op.create_index(op.f('ix_calls_provider_call_sid'), 'calls', ['provider_call_sid'], unique=True)
        op.create_index(op.f('ix_calls_client_id'), 'calls', ['client_id'])
        op.create_index(op.f('ix_calls_phone_number_id'), 'calls', ['phone_number_id'])
        op.create_index('ix_calls_client_status', 'calls', ['client_id', 'status'])
        op.create_index('ix_calls_created_at', 'calls', ['created_at'])
        op.create_index('ix_calls_duration', 'calls', ['duration_seconds'])
    
    # Create voice_sessions table if it doesn't exist
    if 'voice_sessions' not in existing_tables:
        op.create_table(
            'voice_sessions',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('session_id', sa.String(length=36), nullable=False),
            sa.Column('call_id', sa.String(length=36), nullable=False),
            sa.Column('client_id', sa.String(length=36), nullable=False),
            
            # Voice processing details
            sa.Column('audio_input_url', sa.Text(), nullable=True),
            sa.Column('audio_output_url', sa.Text(), nullable=True),
            
            # Transcription details (STT)
            sa.Column('transcribed_text', sa.Text(), nullable=True),
            sa.Column('transcription_confidence', sa.Numeric(precision=4, scale=3), nullable=True),
            sa.Column('transcription_language', sa.String(length=10), nullable=True),
            sa.Column('stt_processing_time_ms', sa.Integer(), nullable=True),
            
            # Chat processing (reuses existing EnhancedChatService)
            sa.Column('chat_session_id', sa.String(length=36), nullable=True),
            sa.Column('chat_response_text', sa.Text(), nullable=True),
            sa.Column('chat_processing_time_ms', sa.Integer(), nullable=True),
            
            # Speech synthesis details (TTS)
            sa.Column('tts_model', sa.String(length=50), nullable=False, default='tts-1'),
            sa.Column('tts_voice', sa.String(length=20), nullable=False, default='alloy'),
            sa.Column('tts_speed', sa.Numeric(precision=3, scale=2), nullable=False, default=1.0),
            sa.Column('tts_processing_time_ms', sa.Integer(), nullable=True),
            
            # Quality metrics
            sa.Column('total_processing_time_ms', sa.Integer(), nullable=True),
            sa.Column('user_sentiment', sa.String(length=20), nullable=True),
            sa.Column('response_relevance_score', sa.Numeric(precision=3, scale=2), nullable=True),
            
            # Timestamps
            sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['call_id'], ['calls.call_id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['chat_session_id'], ['chat_sessions.session_id'], ondelete='SET NULL'),
        )
        
        # Create indices for voice_sessions
        op.create_index(op.f('ix_voice_sessions_session_id'), 'voice_sessions', ['session_id'], unique=True)
        op.create_index(op.f('ix_voice_sessions_call_id'), 'voice_sessions', ['call_id'])
        op.create_index(op.f('ix_voice_sessions_client_id'), 'voice_sessions', ['client_id'])
        op.create_index(op.f('ix_voice_sessions_chat_session_id'), 'voice_sessions', ['chat_session_id'])
        op.create_index('ix_voice_sessions_started_at', 'voice_sessions', ['started_at'])
        op.create_index('ix_voice_sessions_processing_time', 'voice_sessions', ['total_processing_time_ms'])
    
    # Create call_events table if it doesn't exist
    if 'call_events' not in existing_tables:
        op.create_table(
            'call_events',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('event_id', sa.String(length=36), nullable=False),
            sa.Column('call_id', sa.String(length=36), nullable=False),
            
            # Event details
            sa.Column('event_type', sa.String(length=50), nullable=False),
            sa.Column('event_data', postgresql.JSON(), nullable=True),
            sa.Column('event_source', sa.String(length=20), nullable=False, default='system'),
            
            # Event context
            sa.Column('sequence_number', sa.Integer(), nullable=True),
            sa.Column('processing_time_ms', sa.Integer(), nullable=True),
            
            # Timestamps
            sa.Column('occurred_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['call_id'], ['calls.call_id'], ondelete='CASCADE'),
        )
        
        # Create indices for call_events
        op.create_index(op.f('ix_call_events_event_id'), 'call_events', ['event_id'], unique=True)
        op.create_index(op.f('ix_call_events_call_id'), 'call_events', ['call_id'])
        op.create_index(op.f('ix_call_events_event_type'), 'call_events', ['event_type'])
        op.create_index('ix_call_events_call_event_type', 'call_events', ['call_id', 'event_type'])
        op.create_index('ix_call_events_occurred_at', 'call_events', ['occurred_at'])
        op.create_index('ix_call_events_sequence', 'call_events', ['call_id', 'sequence_number'])


def downgrade() -> None:
    """Remove telephony tables."""
    # Drop tables in reverse order of creation (respecting foreign key constraints)
    op.drop_index('ix_call_events_sequence', table_name='call_events')
    op.drop_index('ix_call_events_occurred_at', table_name='call_events')
    op.drop_index('ix_call_events_call_event_type', table_name='call_events')
    op.drop_index(op.f('ix_call_events_event_type'), table_name='call_events')
    op.drop_index(op.f('ix_call_events_call_id'), table_name='call_events')
    op.drop_index(op.f('ix_call_events_event_id'), table_name='call_events')
    op.drop_table('call_events')
    
    op.drop_index('ix_voice_sessions_processing_time', table_name='voice_sessions')
    op.drop_index('ix_voice_sessions_started_at', table_name='voice_sessions')
    op.drop_index(op.f('ix_voice_sessions_chat_session_id'), table_name='voice_sessions')
    op.drop_index(op.f('ix_voice_sessions_client_id'), table_name='voice_sessions')
    op.drop_index(op.f('ix_voice_sessions_call_id'), table_name='voice_sessions')
    op.drop_index(op.f('ix_voice_sessions_session_id'), table_name='voice_sessions')
    op.drop_table('voice_sessions')
    
    op.drop_index('ix_calls_duration', table_name='calls')
    op.drop_index('ix_calls_created_at', table_name='calls')
    op.drop_index('ix_calls_client_status', table_name='calls')
    op.drop_index(op.f('ix_calls_phone_number_id'), table_name='calls')
    op.drop_index(op.f('ix_calls_client_id'), table_name='calls')
    op.drop_index(op.f('ix_calls_provider_call_sid'), table_name='calls')
    op.drop_index(op.f('ix_calls_call_id'), table_name='calls')
    op.drop_table('calls')
    
    op.drop_index(op.f('ix_phone_numbers_provider_sid'), table_name='phone_numbers')
    op.drop_index(op.f('ix_phone_numbers_client_id'), table_name='phone_numbers')
    op.drop_index(op.f('ix_phone_numbers_phone_number'), table_name='phone_numbers')
    op.drop_index(op.f('ix_phone_numbers_number_id'), table_name='phone_numbers')
    op.drop_table('phone_numbers')