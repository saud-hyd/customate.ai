"""Add analytics tables

Revision ID: 20250311_analytics
Revises: 2c16cb147036
Create Date: 2025-03-11 16:45:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250311_analytics'
down_revision: Union[str, None] = '2c16cb147036'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add analytics tables."""
    # Create api_usage_logs table
    op.create_table(
        'api_usage_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('log_id', sa.String(length=36), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('endpoint', sa.String(length=255), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('response_time_ms', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_api_usage_logs_log_id'), 'api_usage_logs', ['log_id'], unique=True)
    
    # Create chat_metrics table
    op.create_table(
        'chat_metrics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('metric_id', sa.String(length=36), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('total_messages', sa.Integer(), nullable=True, default=0),
        sa.Column('average_response_time_ms', sa.Float(), nullable=True),
        sa.Column('knowledge_usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('user_satisfaction', sa.Float(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['session_id'], ['chat_sessions.session_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_metrics_metric_id'), 'chat_metrics', ['metric_id'], unique=True)
    
    # Create knowledge_metrics table
    op.create_table(
        'knowledge_metrics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('metric_id', sa.String(length=36), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('collection_id', sa.String(length=36), nullable=True),
        sa.Column('search_count', sa.Integer(), nullable=True, default=0),
        sa.Column('average_relevance_score', sa.Float(), nullable=True),
        sa.Column('items_count', sa.Integer(), nullable=True, default=0),
        sa.Column('document_count', sa.Integer(), nullable=True, default=0),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['collection_id'], ['knowledge_collections.collection_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_metrics_metric_id'), 'knowledge_metrics', ['metric_id'], unique=True)
    
    # Create subscription_usage table
    op.create_table(
        'subscription_usage',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('usage_id', sa.String(length=36), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),  # Changed to Integer to match subscriptions.id
        sa.Column('month_year', sa.String(length=7), nullable=False),
        sa.Column('messages_used', sa.Integer(), nullable=True, default=0),
        sa.Column('messages_limit', sa.Integer(), nullable=True),
        sa.Column('active_users', sa.Integer(), nullable=True, default=0),
        sa.Column('active_users_limit', sa.Integer(), nullable=True),
        sa.Column('storage_used_bytes', sa.Integer(), nullable=True, default=0),
        sa.Column('storage_limit_bytes', sa.Integer(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscription_usage_usage_id'), 'subscription_usage', ['usage_id'], unique=True)
    
    # Create daily_stats table
    op.create_table(
        'daily_stats',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('stat_id', sa.String(length=36), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('total_sessions', sa.Integer(), nullable=True, default=0),
        sa.Column('total_messages', sa.Integer(), nullable=True, default=0),
        sa.Column('total_searches', sa.Integer(), nullable=True, default=0),
        sa.Column('total_users', sa.Integer(), nullable=True, default=0),
        sa.Column('average_response_time_ms', sa.Float(), nullable=True),
        sa.Column('knowledge_usage_ratio', sa.Float(), nullable=True),
        sa.Column('stats_metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_daily_stats_stat_id'), 'daily_stats', ['stat_id'], unique=True)
    
    # Create unique constraints for date-based tables
    op.create_index('ix_chat_metrics_client_date', 'chat_metrics', ['client_id', 'date'], unique=True)
    op.create_index('ix_knowledge_metrics_client_collection_date', 'knowledge_metrics', ['client_id', 'collection_id', 'date'], unique=True)
    op.create_index('ix_subscription_usage_client_month', 'subscription_usage', ['client_id', 'month_year'], unique=True)
    op.create_index('ix_daily_stats_client_date', 'daily_stats', ['client_id', 'date'], unique=True)
    
    # Create indexes for performance
    op.create_index('ix_api_usage_logs_timestamp', 'api_usage_logs', ['timestamp'], unique=False)
    op.create_index('ix_api_usage_logs_endpoint', 'api_usage_logs', ['endpoint'], unique=False)
    op.create_index('ix_api_usage_logs_client_timestamp', 'api_usage_logs', ['client_id', 'timestamp'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove analytics tables."""
    # Drop tables in reverse order of creation
    op.drop_table('daily_stats')
    op.drop_table('subscription_usage')
    op.drop_table('knowledge_metrics')
    op.drop_table('chat_metrics')
    op.drop_table('api_usage_logs')