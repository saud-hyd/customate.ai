"""
Migration script to ensure both endpoint_url and api_endpoint exist in the integrations table.
This script creates a database migration to reconcile the column naming discrepancy.
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Check if endpoint_url column exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    has_endpoint_url = False
    for col in inspector.get_columns('integrations'):
        if col['name'] == 'endpoint_url':
            has_endpoint_url = True
            break
    
    # If endpoint_url doesn't exist but api_endpoint does, create endpoint_url
    if not has_endpoint_url:
        has_api_endpoint = False
        for col in inspector.get_columns('integrations'):
            if col['name'] == 'api_endpoint':
                has_api_endpoint = True
                break
        
        if has_api_endpoint:
            # Add endpoint_url column
            op.add_column('integrations', sa.Column('endpoint_url', sa.String(255), nullable=True))
            
            # Copy data from api_endpoint to endpoint_url
            op.execute(
                "UPDATE integrations SET endpoint_url = api_endpoint"
            )

def downgrade():
    try:
        # If we need to roll back, drop the endpoint_url column
        op.drop_column('integrations', 'endpoint_url')
    except:
        pass