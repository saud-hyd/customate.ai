from __future__ import with_statement

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import models and config
from app.core.config.settings import settings
from app.core.database.session import Base

# Import all models here to ensure they're discoverable by Alembic
from app.domain.client.entities import Client, ClientSettings, Subscription
from app.domain.chat.entities import ChatSession, ChatMessage, ConversationContext
from app.domain.knowledge.entities import KnowledgeCollection, KnowledgeItem, DocumentSource, VectorEmbedding

# this is the Alembic Config object
config = context.config

# Override the SQLAlchemy URL with our application settings
config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))

# Interpret the config file for Python logging
fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()