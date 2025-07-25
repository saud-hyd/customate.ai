"""
Migration script to update the subscriptions table with additional fields
to support enhanced subscription management and Stripe integration.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, BOOLEAN
from alembic.context import get_context
import logging

logger = logging.getLogger(__name__)

def upgrade():
    """Upgrade the database schema."""
    # Get the database dialect to handle JSON type appropriately
    context = get_context()
    dialect = context.dialect.name
    
    # Define JSON type based on dialect
    json_type = sa.JSON if dialect == 'postgresql' else sa.Text
    
    # Check if columns exist before adding them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get existing columns in the subscriptions table
    existing_columns = {col['name'] for col in inspector.get_columns('subscriptions')}
    
    # Add new columns if they don't exist
    if 'storage_limit_bytes' not in existing_columns:
        op.add_column('subscriptions', sa.Column('storage_limit_bytes', sa.BigInteger, nullable=True))
        logger.info("Added storage_limit_bytes column to subscriptions table")
    
    if 'collections_limit' not in existing_columns:
        op.add_column('subscriptions', sa.Column('collections_limit', sa.Integer, nullable=True))
        logger.info("Added collections_limit column to subscriptions table")
    
    if 'payment_method_id' not in existing_columns:
        op.add_column('subscriptions', sa.Column('payment_method_id', sa.String(255), nullable=True))
        logger.info("Added payment_method_id column to subscriptions table")
    
    if 'auto_renew' not in existing_columns:
        op.add_column('subscriptions', sa.Column('auto_renew', sa.Boolean, server_default='true', nullable=False))
        logger.info("Added auto_renew column to subscriptions table")
    
    if 'billing_cycle' not in existing_columns:
        op.add_column('subscriptions', sa.Column('billing_cycle', sa.String(20), server_default='monthly', nullable=False))
        logger.info("Added billing_cycle column to subscriptions table")
    
    if 'is_trial' not in existing_columns:
        op.add_column('subscriptions', sa.Column('is_trial', sa.Boolean, server_default='false', nullable=False))
        logger.info("Added is_trial column to subscriptions table")
    
    if 'trial_ends_at' not in existing_columns:
        op.add_column('subscriptions', sa.Column('trial_ends_at', sa.DateTime, nullable=True))
        logger.info("Added trial_ends_at column to subscriptions table")
    
    if 'stripe_data' not in existing_columns:
        op.add_column('subscriptions', sa.Column('stripe_data', json_type, nullable=True))
        logger.info("Added stripe_data column to subscriptions table")
    
    # Update all existing subscriptions to have default storage and collections limits
    # based on their plan type
    if 'storage_limit_bytes' in existing_columns or 'collections_limit' in existing_columns:
        try:
            # Update free plan limits
            op.execute("""
                UPDATE subscriptions 
                SET 
                    storage_limit_bytes = 52428800,  -- 50 MB
                    collections_limit = 3
                WHERE plan_type = 'free' AND (storage_limit_bytes IS NULL OR collections_limit IS NULL);
            """)
            
            # Update basic plan limits
            op.execute("""
                UPDATE subscriptions 
                SET 
                    storage_limit_bytes = 524288000,  -- 500 MB
                    collections_limit = 10
                WHERE plan_type = 'basic' AND (storage_limit_bytes IS NULL OR collections_limit IS NULL);
            """)
            
            # Update professional plan limits
            op.execute("""
                UPDATE subscriptions 
                SET 
                    storage_limit_bytes = 2147483648,  -- 2 GB
                    collections_limit = 50
                WHERE plan_type = 'professional' AND (storage_limit_bytes IS NULL OR collections_limit IS NULL);
            """)
            
            # Update enterprise plan limits
            op.execute("""
                UPDATE subscriptions 
                SET 
                    storage_limit_bytes = 10737418240,  -- 10 GB
                    collections_limit = 250
                WHERE plan_type = 'enterprise' AND (storage_limit_bytes IS NULL OR collections_limit IS NULL);
            """)
            
            logger.info("Updated existing subscriptions with default storage and collections limits")
        except Exception as e:
            logger.error(f"Error updating existing subscriptions: {str(e)}")
    
    # Create index on client_id for faster lookups
    try:
        op.create_index(
            index_name='ix_subscriptions_client_id',
            table_name='subscriptions',
            columns=['client_id']
        )
        logger.info("Created index on client_id in subscriptions table")
    except Exception as e:
        logger.warning(f"Could not create index, it may already exist: {str(e)}")

def downgrade():
    """Downgrade the database schema."""
    # Drop all the columns we added
    columns_to_drop = [
        'storage_limit_bytes',
        'collections_limit',
        'payment_method_id',
        'auto_renew',
        'billing_cycle',
        'is_trial',
        'trial_ends_at',
        'stripe_data'
    ]
    
    for column in columns_to_drop:
        try:
            op.drop_column('subscriptions', column)
            logger.info(f"Dropped {column} column from subscriptions table")
        except Exception as e:
            logger.warning(f"Could not drop column {column}: {str(e)}")
    
    # Drop the index we created
    try:
        op.drop_index(index_name='ix_subscriptions_client_id', table_name='subscriptions')
        logger.info("Dropped index on client_id in subscriptions table")
    except Exception as e:
        logger.warning(f"Could not drop index: {str(e)}")