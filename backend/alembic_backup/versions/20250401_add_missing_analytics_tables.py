"""add_missing_analytics_tables

Revision ID: 20250401_analytics
Revises: 20250321_magic_link
Create Date: 2025-04-01 10:00:00.000000+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250401_analytics'
down_revision: Union[str, None] = '20250321_magic_link'  # This is your last migration ID
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing analytics tables if they don't exist."""
    # Check if tables already exist before creating them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create daily_stats table if it doesn't exist
    if 'daily_stats' not in existing_tables:
        op.create_table(
            'daily_stats',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('stat_id', sa.String(length=36), nullable=False),
            sa.Column('client_id', sa.String(length=36), nullable=False),
            sa.Column('date', sa.String(length=10), nullable=False),  # Format: YYYY-MM-DD
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
        op.create_index('ix_daily_stats_client_date', 'daily_stats', ['client_id', 'date'], unique=True)


def downgrade() -> None:
    """Remove analytics tables."""
    op.drop_index('ix_daily_stats_client_date', table_name='daily_stats')
    op.drop_index(op.f('ix_daily_stats_stat_id'), table_name='daily_stats')
    op.drop_table('daily_stats')