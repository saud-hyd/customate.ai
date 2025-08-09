import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, computed_field

# Simple environment detection
IS_PRODUCTION = bool(os.getenv("RENDER"))  # Render sets this automatically

# Load .env.development only in local development
if not IS_PRODUCTION:
    try:
        from dotenv import load_dotenv
        
        if os.path.exists(".env.development"):
            load_dotenv(".env.development")
            print("Loaded .env.development")
        elif os.path.exists(".env"):
            load_dotenv()
            print("Using .env fallback")
    except ImportError:
        pass
else:
    print("Production mode - using Render environment variables")

class Settings(BaseSettings):
    """Application settings with environment-aware defaults."""
    
    # Application settings
    APP_NAME: str = Field(default="Customate.ai")
    API_VERSION: str = Field(default="v1")
    DEBUG: bool = Field(default=not IS_PRODUCTION)  # Auto-detect: False in prod, True in dev
    
    # Security settings - ALWAYS REQUIRED
    SECRET_KEY: str = Field(...)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    
    # Database settings - ALWAYS REQUIRED
    DB_USER: str = Field(...)
    DB_PASSWORD: str = Field(...)
    DB_HOST: str = Field(...)
    DB_PORT: str = Field(default="5432")
    DB_NAME: str = Field(...)
    DB_SSLMODE: str = Field(default="require")
    
    # Email settings - Optional with sensible defaults
    EMAIL_SENDER: str = Field(default="noreply@customate.ai")
    EMAIL_PASSWORD: str = Field(default="")
    SMTP_SERVER: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=465)
    
    # Frontend URL - Environment aware
    FRONTEND_URL: str = Field(
        default="https://customate-frontend.onrender.com" if IS_PRODUCTION 
        else "http://localhost:3000"
    )
    
    # OAuth settings - Optional with environment-aware defaults
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    OAUTH_REDIRECT_URI: str = Field(
        default="https://customate-backend.onrender.com/api/auth/oauth/callback" if IS_PRODUCTION
        else "http://localhost:8000/api/auth/oauth/callback"
    )
    
    # LLM settings - Optional
    DEEPSEEK_API_KEY: Optional[str] = Field(default=None)
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    CLAUDE_API_KEY: Optional[str] = Field(default=None)
    
    DEFAULT_LLM_PROVIDER: str = Field(default="openai")
    DEFAULT_LLM_MODEL: str = Field(default="gpt-4.1-mini-2025-04-14")
    DEFAULT_EMBEDDING_MODEL: str = Field(default="text-embedding-3-small")
    
    # Storage settings
    STORAGE_PROVIDER: str = Field(default="local")
    STORAGE_BUCKET: Optional[str] = Field(default=None)
    
    # Stripe settings - Required if using payments
    STRIPE_SECRET_KEY: str = Field(default="sk_test_dummy")
    STRIPE_PUBLIC_KEY: str = Field(default="pk_test_dummy")
    STRIPE_WEBHOOK_SECRET: str = Field(default="whsec_dummy")
    
    # Stripe plan IDs - Optional with dummy defaults
    STRIPE_FREE_PLAN_ID: str = Field(default="price_free")
    STRIPE_BASIC_MONTHLY_PLAN_ID: str = Field(default="price_basic_monthly")
    STRIPE_BASIC_ANNUAL_PLAN_ID: str = Field(default="price_basic_annual")
    STRIPE_STANDARD_MONTHLY_PLAN_ID: str = Field(default="price_standard_monthly")
    STRIPE_STANDARD_ANNUAL_PLAN_ID: str = Field(default="price_standard_annual")
    STRIPE_PROFESSIONAL_MONTHLY_PLAN_ID: str = Field(default="price_professional_monthly")
    STRIPE_PROFESSIONAL_ANNUAL_PLAN_ID: str = Field(default="price_professional_annual")
    
    # Google Cloud Pub/Sub settings for Gmail integration
    GOOGLE_CLOUD_PROJECT_ID: Optional[str] = Field(default=None)
    GMAIL_PUBSUB_TOPIC: str = Field(default="gmail-notifications")
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = Field(default=None)
    
    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        """Construct database URL with SSL settings."""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?sslmode={self.DB_SSLMODE}"
    
    def is_email_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.EMAIL_SENDER and self.EMAIL_PASSWORD and 
                   self.EMAIL_SENDER != "noreply@customate.ai")
    
    def is_oauth_configured(self) -> bool:
        """Check if OAuth is properly configured."""
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)
    
    def is_stripe_configured(self) -> bool:
        """Check if Stripe is properly configured."""
        return bool(self.STRIPE_SECRET_KEY and 
                   not self.STRIPE_SECRET_KEY.startswith("sk_test_dummy"))
    
    def is_google_cloud_configured(self) -> bool:
        """Check if Google Cloud Pub/Sub is properly configured."""
        return bool(self.GOOGLE_CLOUD_PROJECT_ID and self.GMAIL_PUBSUB_TOPIC)

# Create settings instance
settings = Settings()

# Optional: Print configuration status
if not IS_PRODUCTION:
    print(f"Email configured: {settings.is_email_configured()}")
    print(f"OAuth configured: {settings.is_oauth_configured()}")
    print(f"Stripe configured: {settings.is_stripe_configured()}")
    print(f"Google Cloud configured: {settings.is_google_cloud_configured()}")