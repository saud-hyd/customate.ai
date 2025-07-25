"""
Migration script to add the credentials column to the integrations table.
This script creates a database migration to add the missing credentials JSON column.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

def upgrade():
    # Check if credentials column exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    has_credentials = False
    for col in inspector.get_columns('integrations'):
        if col['name'] == 'credentials':
            has_credentials = True
            break
    
    # If credentials doesn't exist, add it
    if not has_credentials:
        op.add_column('integrations', sa.Column('credentials', JSON, nullable=True))
        
        # If api_key and api_secret exist in the request, we need to migrate them to credentials
        try:
            # This is a simplification - in a real scenario, you'd need to handle
            # the encryption/security aspects properly
            op.execute("""
            UPDATE integrations 
            SET credentials = jsonb_build_object(
                'api_key', api_key,
                'api_secret', api_secret
            )
            WHERE api_key IS NOT NULL
            """)
        except Exception as e:
            print(f"Warning: Could not migrate api_key/api_secret data: {e}")

def downgrade():
    try:
        # If we need to roll back, drop the credentials column
        op.drop_column('integrations', 'credentials')
    except Exception:
        pass