"""add_password_hash

Revision ID: 20250420_add_password_hash
Revises: 20250401_analytics
Create Date: 2025-04-20 00:00:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20250420_add_password_hash'
down_revision: Union[str, None] = '20250401_analytics'  # Most recent migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Add password_hash column to clients table."""
    # Check if column already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('clients')]
    
    # Only add the column if it doesn't already exist
    if 'password_hash' not in columns:
        op.add_column('clients', sa.Column('password_hash', sa.String(255), nullable=True))
        
        # Migrate existing API keys to password hashes
        # This assumes API keys were stored in plaintext as passwords
        from app.core.security.authentication import get_password_hash
        try:
            # Get all clients
            result = conn.execute("SELECT client_id, api_key FROM clients")
            for row in result:
                client_id, api_key = row
                if api_key:
                    # Hash the API key and update as password hash
                    password_hash = get_password_hash(api_key)
                    conn.execute(
                        "UPDATE clients SET password_hash = :password_hash WHERE client_id = :client_id",
                        {"password_hash": password_hash, "client_id": client_id}
                    )
        except Exception as e:
            print(f"Warning: Could not migrate API keys to password hashes: {e}")

def downgrade() -> None:
    """Remove password_hash column from clients table."""
    op.drop_column('clients', 'password_hash')