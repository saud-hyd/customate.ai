# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Customate.ai is a multi-tenant chatbot platform that enables businesses to create, customize, and deploy AI-powered chatbots with industry-specific behaviors and custom knowledge bases. The platform consists of a FastAPI backend, multiple React frontends, and an embeddable widget system.

## Architecture

### Backend (FastAPI + PostgreSQL)
- **Location**: `backend/`
- **Framework**: FastAPI with Pydantic v2 for data validation
- **Database**: PostgreSQL with pgvector extension for vector embeddings
- **ORM**: SQLAlchemy 2.0 with Alembic migrations
- **Authentication**: JWT tokens with optional OAuth (Google)
- **Key Features**: Multi-tenant with client context, subscription limits, analytics middleware, streaming chat responses

### Frontend Applications
1. **Dashboard** (`frontend/dashboard/`) - Main client dashboard (React + Tailwind CSS)
2. **Marketing** (`frontend/marketing/`) - Public marketing website with i18n support
3. **Admin** (`frontend/admin/`) - Administrative interface
4. **Widget** (`frontend/widget-app/`) - Embeddable chat widget

### Domain Architecture
- **Domain Layer**: `backend/app/domain/` - Contains entities for analytics, auth, channel, chat, client, integration, knowledge, notification, subscription
- **Repository Pattern**: `backend/app/repositories/` - Data access layer
- **Service Layer**: `backend/app/services/` - Business logic including LLM services (Claude, OpenAI), knowledge processing, integrations
- **API Layer**: `backend/app/api/` - REST endpoints organized by feature

## Common Development Commands

### Backend Development
```bash
cd backend

# Install dependencies
pip install -r requirements.txt
# or using poetry
poetry install

# Run development server
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Run tests
pytest
pytest tests/api/  # specific test directory
```

### Frontend Development
```bash
# Dashboard
cd frontend/dashboard
npm install
npm start  # development server on localhost:3000
npm run build  # production build
npm test  # run tests

# Marketing site
cd frontend/marketing
npm install
npm start  # development server on localhost:3000
npm run build

# Widget build (from project root)
npm run build:widget
npm run build:all  # builds all components
```

## Environment Configuration

### Development Setup
- Backend uses `.env.development` for local development
- Production automatically detects Render environment variables
- Settings are managed through `backend/app/core/config/settings.py` with Pydantic settings

### Required Environment Variables
```bash
# Database (Required)
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=5432
DB_NAME=
SECRET_KEY=

# LLM APIs (At least one required)
OPENAI_API_KEY=
CLAUDE_API_KEY=
DEEPSEEK_API_KEY=

# Optional: OAuth, Email, Stripe
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_SENDER=
EMAIL_PASSWORD=
STRIPE_SECRET_KEY=
```

## Key Services & Integrations

### LLM Integration
- Supports OpenAI, Anthropic Claude, and DeepSeek
- Factory pattern in `backend/app/services/llm/llm_factory.py`
- Configurable per client with fallback defaults

### Knowledge Base System
- Vector similarity search using pgvector
- Document processing supports PDF, DOCX, text files
- Web crawling with `trafilatura` and `beautifulsoup4`
- Embedding service with configurable models

### External Integrations
- **Salesforce, Shopify, Zendesk** via provider pattern in `backend/app/services/integration/providers/`
- **Social Channels**: Facebook, Instagram, Twitter, WhatsApp connectors
- **Payment Processing**: Stripe integration with subscription management

### Widget System
- Embeddable React widget with real-time chat
- CORS configured for cross-origin embedding
- Streaming responses via Server-Sent Events
- Widget settings and theming API

## Database Schema

### Core Tables
- `clients` - Multi-tenant client accounts
- `subscriptions` - Stripe subscription management
- `knowledge_bases` - Custom knowledge bases per client
- `documents` - Uploaded/crawled documents with vector embeddings
- `chat_sessions` and `chat_messages` - Conversation history
- `integrations` - External service connections
- `analytics_*` tables - Usage tracking and reporting

### Migrations
- Located in `backend/alembic/versions/`
- Migration scripts handle schema changes and data migrations
- Fresh installation scripts in `backend/alembic_fresh/versions/`

## Testing Strategy

### Backend Tests
- **API Tests**: `backend/tests/api/` - FastAPI endpoint testing
- **Integration Tests**: `backend/tests/integration/` - End-to-end feature testing
- **Service Tests**: `backend/tests/services/` - Business logic testing

### Frontend Tests
- React Testing Library for component tests
- Each frontend app has its own test configuration in `package.json`

## Deployment Configuration

- **Backend**: Deployed on Render with automatic environment detection
- **Frontend**: Vercel deployment with multiple environment stages
- **Database**: Render PostgreSQL with pgvector extension
- **Widget**: Builds to static files for CDN distribution

## Key Development Notes

- The platform uses client context middleware for multi-tenancy
- Subscription limits are enforced at the middleware level
- All API routes are prefixed with `/api`
- Widget routes support CORS for embedding
- Streaming chat responses use Server-Sent Events
- Analytics middleware tracks all API usage
- Settings validation uses Pydantic with computed fields for complex configuration