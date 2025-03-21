"""add_magic_link_tokens_table

Revision ID: 20250321_magic_link
Revises: f321eab277bf
Create Date: 2025-03-21 10:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250321_magic_link'
down_revision: Union[str, None] = 'f321eab277bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add magic link tokens table for email auth."""
    # Create magic_link_tokens table
    op.create_table(
        'magic_link_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indices
    op.create_index(op.f('ix_magic_link_tokens_email'), 'magic_link_tokens', ['email'], unique=False)
    op.create_index(op.f('ix_magic_link_tokens_token'), 'magic_link_tokens', ['token'], unique=True)


def downgrade() -> None:
    """Remove magic link tokens table."""
    op.drop_index(op.f('ix_magic_link_tokens_token'), table_name='magic_link_tokens')
    op.drop_index(op.f('ix_magic_link_tokens_email'), table_name='magic_link_tokens')
    op.drop_table('magic_link_tokens')