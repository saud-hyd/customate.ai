"""
Migration script to add crawled_content_bytes column to storage_usage table.
"""
from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = 'a2c7d456789a'
down_revision = 'previous_migration_id'  # Update this with your last migration ID
branch_labels = None
depends_on = None

def upgrade():
    # Add crawled_content_bytes column to storage_usage table
    op.add_column('storage_usage', 
                  sa.Column('crawled_content_bytes', sa.Integer(), nullable=False, server_default='0'))
    
    # Update existing records to calculate crawled content size
    # This is a more complex operation that would require raw SQL
    # Here's a simplified version:
    
    conn = op.get_bind()
    
    # Get all client IDs
    result = conn.execute("SELECT DISTINCT client_id FROM storage_usage")
    client_ids = [row[0] for row in result]
    
    for client_id in client_ids:
        # Calculate crawled content size for this client
        # This looks for knowledge items without a source document
        result = conn.execute(
            """
            SELECT SUM(LENGTH(ki.content)) 
            FROM knowledge_items ki 
            JOIN knowledge_collections kc ON ki.collection_id = kc.collection_id 
            WHERE kc.client_id = %s AND ki.source_document_id IS NULL
            """, 
            (client_id,)
        )
        
        crawled_size = result.scalar() or 0
        
        # Update storage_usage records for this client
        conn.execute(
            """
            UPDATE storage_usage 
            SET crawled_content_bytes = %s,
                total_bytes = total_bytes + %s 
            WHERE client_id = %s
            """,
            (crawled_size, crawled_size, client_id)
        )

def downgrade():
    # Remove the column when downgrading
    op.drop_column('storage_usage', 'crawled_content_bytes')