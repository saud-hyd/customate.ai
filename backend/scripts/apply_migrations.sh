#!/bin/bash
# backend/scripts/apply_migrations.sh

# Exit on any error
set -e

echo "Starting Alembic migrations..."

# Change to project root directory
cd "$(dirname "$0")/.."

# Create alembic tables if they don't exist
echo "Initializing alembic tables..."
alembic upgrade head

echo "Migrations completed successfully!"