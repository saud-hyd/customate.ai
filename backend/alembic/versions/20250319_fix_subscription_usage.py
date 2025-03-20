"""restore_subscription_usage_table

Revision ID: 20250319_fix_subscription
Revises: 20250318_130000
Create Date: 2025-03-19 09:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250319_fix_subscription'
down_revision: Union[str, None] = '20250318_130000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to restore subscription_usage table."""
    # Recreate subscription_usage table
    op.create_table(
        'subscription_usage',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('usage_id', sa.String(length=36), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
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
    op.create_index('ix_subscription_usage_client_month', 'subscription_usage', ['client_id', 'month_year'], unique=True)


def downgrade() -> None:
    """Downgrade schema to remove subscription_usage table."""
    op.drop_index('ix_subscription_usage_client_month', table_name='subscription_usage')
    op.drop_index(op.f('ix_subscription_usage_usage_id'), table_name='subscription_usage')
    op.drop_table('subscription_usage')