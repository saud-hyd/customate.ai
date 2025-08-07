"""Enable pgvector extension and optimize vector storage

Revision ID: enable_pgvector_opt
Revises: 20250717_114700_add_integrations_tables
Create Date: 2025-08-07 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = 'enable_pgvector_opt'
down_revision: Union[str, None] = '[AUTO_GENERATED]'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade to pgvector with backward compatibility."""
    print("Starting pgvector migration...")
    
    # 1. Enable pgvector extension
    print("Installing pgvector extension...")
    op.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    
    # 2. Add new vector column alongside existing one
    print("Adding native vector column...")
    op.execute(text("""
        ALTER TABLE vector_embeddings 
        ADD COLUMN embedding_vector vector(512)
    """))
    
    # 3. First, make the vector column nullable to allow clearing old data
    print("Making vector column nullable...")
    op.execute(text("ALTER TABLE vector_embeddings ALTER COLUMN vector DROP NOT NULL"))
    
    # 4. Handle existing embeddings - they need to be regenerated as 512D
    # Mark existing 384D embeddings for regeneration by clearing them
    print("Clearing existing 384D embeddings for regeneration as 512D...")
    op.execute(text("""
        -- Clear existing vectors so they'll be regenerated as 512D
        UPDATE vector_embeddings 
        SET vector = NULL
        WHERE vector IS NOT NULL
    """))
    
    print("Note: Existing embeddings cleared and will be regenerated as 512D vectors")
    
    # 4. Create optimized indexes for vector operations
    print("Creating vector indexes for fast similarity search...")
    
    # IVFFLAT index for cosine similarity (balanced performance)
    op.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_vector_embeddings_cosine_ivfflat 
        ON vector_embeddings 
        USING ivfflat (embedding_vector vector_cosine_ops)
        WITH (lists = 100)
    """))
    
    # IVFFLAT index for L2 distance
    op.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_vector_embeddings_l2_ivfflat 
        ON vector_embeddings 
        USING ivfflat (embedding_vector vector_l2_ops)
        WITH (lists = 100)
    """))
    
    # IVFFLAT index for inner product
    op.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_vector_embeddings_ip_ivfflat 
        ON vector_embeddings 
        USING ivfflat (embedding_vector vector_ip_ops)
        WITH (lists = 100)
    """))
    
    # 5. Create additional indexes for common queries
    print("Creating lookup indexes...")
    op.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_vector_embeddings_item_id_lookup 
        ON vector_embeddings (item_id)
    """))
    
    # 6. Update table statistics for query planner
    print("Updating table statistics...")
    op.execute(text("ANALYZE vector_embeddings"))
    
    print("pgvector migration completed successfully!")


def downgrade() -> None:
    """Downgrade from pgvector (remove indexes and column)."""
    print("Rolling back pgvector changes...")
    
    # Drop vector indexes
    op.execute(text("DROP INDEX IF EXISTS ix_vector_embeddings_cosine_ivfflat"))
    op.execute(text("DROP INDEX IF EXISTS ix_vector_embeddings_l2_ivfflat"))
    op.execute(text("DROP INDEX IF EXISTS ix_vector_embeddings_ip_ivfflat"))
    op.execute(text("DROP INDEX IF EXISTS ix_vector_embeddings_item_id_lookup"))
    
    # Drop the vector column
    op.execute(text("ALTER TABLE vector_embeddings DROP COLUMN IF EXISTS embedding_vector"))
    
    # Note: We don't drop the extension to avoid breaking other potential users
    print("pgvector rollback completed!")