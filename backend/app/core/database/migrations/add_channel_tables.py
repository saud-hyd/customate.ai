# backend/app/core/database/migrations/add_storage_tracking_to_crawl_jobs.py
"""
Migration script to add storage tracking fields to website_crawl_jobs table.
"""
from alembic import op
import sqlalchemy as sa
from alembic import context

# Revision identifiers
revision = 'a3c8d456789b'
down_revision = 'previous_migration_id'  # Update this with your last migration ID
branch_labels = None
depends_on = None

def upgrade():
    """Upgrade the database schema."""
    # Add crawled_bytes and estimated_bytes columns to website_crawl_jobs table
    op.add_column('website_crawl_jobs', 
                  sa.Column('crawled_bytes', sa.BigInteger(), nullable=True))
    op.add_column('website_crawl_jobs', 
                  sa.Column('estimated_bytes', sa.BigInteger(), nullable=True))
    
    # Update status enum to include "paused_storage_limit"
    # This is PostgreSQL specific
    conn = op.get_bind()
    dialect = context.get_context().dialect.name
    
    if dialect == 'postgresql':
        # For PostgreSQL, we need to modify the enum type
        # First create a temp column with the new enum values
        op.execute("""
        ALTER TABLE website_crawl_jobs 
        ADD COLUMN status_new VARCHAR(50)
        """)
        
        # Update the new column with values from the old one
        op.execute("""
        UPDATE website_crawl_jobs
        SET status_new = status
        """)
        
        # Drop the old column
        op.execute("""
        ALTER TABLE website_crawl_jobs
        DROP COLUMN status
        """)
        
        # Rename the new column
        op.execute("""
        ALTER TABLE website_crawl_jobs
        RENAME COLUMN status_new TO status
        """)
        
        # Add NOT NULL constraint
        op.execute("""
        ALTER TABLE website_crawl_jobs
        ALTER COLUMN status SET NOT NULL
        """)
    else:
        # For other databases, we can simply modify the column
        # This is more of a placeholder and might need adjustment for specific databases
        pass
    
    # Set default values for existing records
    op.execute("""
    UPDATE website_crawl_jobs
    SET 
        crawled_bytes = 0,
        estimated_bytes = max_pages * 10240  -- 10KB per page
    WHERE crawled_bytes IS NULL
    """)

def downgrade():
    """Downgrade the database schema."""
    # Remove the columns
    op.drop_column('website_crawl_jobs', 'crawled_bytes')
    op.drop_column('website_crawl_jobs', 'estimated_bytes')
    
    # We don't revert the status enum changes - too complex and potentially destructive