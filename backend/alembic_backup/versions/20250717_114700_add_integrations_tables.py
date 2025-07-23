"""Add integrations tables

Revision ID: 20250717_114700
Revises: 20250420_add_password_hash
Create Date: 2024-07-17 04:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '20250717_114700'
down_revision = '20250420_add_password_hash'  # Point to the last good migration
branch_labels = None
depends_on = None

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

def upgrade():
    # Create integrations table
    op.create_table(
        'integrations',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column('integration_id', sa.String(length=36), nullable=False, unique=True, index=True, default=generate_uuid),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('status_message', sa.Text(), nullable=True),
        sa.Column('credentials', postgresql.JSON(), nullable=True),
        sa.Column('endpoint_url', sa.String(length=255), nullable=True),
        sa.Column('config', postgresql.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_sync', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('integration_id'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
    )
    
    # Create indexes for better performance
    op.create_index('idx_integrations_client_id', 'integrations', ['client_id'])
    op.create_index('idx_integrations_provider', 'integrations', ['provider'])
    op.create_index('idx_integrations_status', 'integrations', ['status'])
    op.create_index('idx_integrations_is_active', 'integrations', ['is_active'])
    op.create_index('idx_integrations_client_provider', 'integrations', ['client_id', 'provider'])

    # Create integration_syncs table
    op.create_table(
        'integration_syncs',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column('sync_id', sa.String(length=36), nullable=False, unique=True, index=True, default=generate_uuid),
        sa.Column('integration_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('items_processed', sa.Integer(), nullable=False, default=0),
        sa.Column('items_created', sa.Integer(), nullable=False, default=0),
        sa.Column('items_updated', sa.Integer(), nullable=False, default=0),
        sa.Column('items_failed', sa.Integer(), nullable=False, default=0),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sync_details', postgresql.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sync_id'),
        sa.ForeignKeyConstraint(['integration_id'], ['integrations.integration_id'], ondelete='CASCADE'),
    )
    
    # Create indexes for integration_syncs
    op.create_index('idx_integration_syncs_integration_id', 'integration_syncs', ['integration_id'])
    op.create_index('idx_integration_syncs_status', 'integration_syncs', ['status'])
    op.create_index('idx_integration_syncs_start_time', 'integration_syncs', ['start_time'])

def downgrade():
    # Drop indexes first
    op.drop_index('idx_integration_syncs_start_time', table_name='integration_syncs')
    op.drop_index('idx_integration_syncs_status', table_name='integration_syncs')
    op.drop_index('idx_integration_syncs_integration_id', table_name='integration_syncs')
    
    op.drop_index('idx_integrations_client_provider', table_name='integrations')
    op.drop_index('idx_integrations_is_active', table_name='integrations')
    op.drop_index('idx_integrations_status', table_name='integrations')
    op.drop_index('idx_integrations_provider', table_name='integrations')
    op.drop_index('idx_integrations_client_id', table_name='integrations')
    
    # Drop tables
    op.drop_table('integration_syncs')
    op.drop_table('integrations')