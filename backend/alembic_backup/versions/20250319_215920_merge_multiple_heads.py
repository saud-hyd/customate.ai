"""merge multiple heads

Revision ID: f321eab277bf
Revises: 20250319_103000, 20250319_fix_subscription
Create Date: 2025-03-19 21:59:20.847750+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f321eab277bf'
down_revision: Union[str, None] = ('20250319_103000', '20250319_fix_subscription')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
