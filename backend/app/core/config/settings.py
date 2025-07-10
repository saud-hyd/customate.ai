# backend/app/core/config/settings.py
import os
import secrets
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, computed_field

# Load dotenv if installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application settings
    APP_NAME: str = Field(default="Customate.ai")
    API_VERSION: str = Field(default="v1")
    DEBUG: bool = Field(default=True)
    
    # Security settings
    SECRET_KEY: str = Field(default_factory=lambda: os.getenv("SECRET_KEY", secrets.token_hex(32)))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    
    # Email settings
    EMAIL_SENDER: str = Field(default=os.getenv("EMAIL_SENDER", "saud.smarvel@gmail.com"))
    EMAIL_PASSWORD: str = Field(default=os.getenv("EMAIL_PASSWORD", "cpbv wqrd mcta cckr"))
    SMTP_SERVER: str = Field(default=os.getenv("SMTP_SERVER", "smtp.gmail.com"))
    SMTP_PORT: int = Field(default=int(os.getenv("SMTP_PORT", "465")))
    FRONTEND_URL: str = Field(default=os.getenv("FRONTEND_URL", "https://customate-ai.vercel.app"))
    
    # OAuth settings
    GOOGLE_CLIENT_ID: str = Field(default=os.getenv("GOOGLE_CLIENT_ID", ""))
    GOOGLE_CLIENT_SECRET: str = Field(default=os.getenv("GOOGLE_CLIENT_SECRET", ""))
    OAUTH_REDIRECT_URI: str = Field(default=os.getenv("OAUTH_REDIRECT_URI", "http://localhost:3000/auth/callback"))
    
    # Database settings - Read from environment or use Render values as fallback
    DB_USER: str = Field(default=os.getenv("DB_USER", "customate_db_user"))
    DB_PASSWORD: str = Field(default=os.getenv("DB_PASSWORD", "iLurfjNqC501zly5wQhw0kRyRrbob9B1"))
    DB_HOST: str = Field(default=os.getenv("DB_HOST", "dpg-cvp5f3a4d50c73bogp50-a.oregon-postgres.render.com"))
    DB_PORT: str = Field(default=os.getenv("DB_PORT", "5432"))
    DB_NAME: str = Field(default=os.getenv("DB_NAME", "customate_db"))
    DB_SSLMODE: str = Field(default=os.getenv("DB_SSLMODE", "require"))
    
    # LLM settings
    DEEPSEEK_API_KEY: Optional[str] = Field(default=os.getenv("DEEPSEEK_API_KEY", "sk-457a5f4d6d0049d59c47469819b19703"))
    OPENAI_API_KEY: Optional[str] = Field(default=os.getenv("OPENAI_API_KEY", "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"))
    
    # Storage settings
    STORAGE_PROVIDER: str = Field(default=os.getenv("STORAGE_PROVIDER", "local"))
    STORAGE_BUCKET: Optional[str] = Field(default=None)
    
    # Stripe settings
    STRIPE_SECRET_KEY: str = Field(default=os.getenv("STRIPE_SECRET_KEY", "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"))
    STRIPE_PUBLIC_KEY: str = Field(default=os.getenv("STRIPE_PUBLIC_KEY", "pk_live_51R4HBGHYm0UQygR1mnxGDebLpegOTsH01YAG5xLIJ9DwxzR08HyZJhIgbyUgVYu840QP3qTgtPp2bHLSsP5iwFOr00KkqxJAoV"))
    STRIPE_WEBHOOK_SECRET: str = Field(default=os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_sample"))
    
    # Stripe product/price IDs
    STRIPE_FREE_PLAN_ID: str = Field(default=os.getenv("STRIPE_FREE_PLAN_ID", "price_free"))
    
    # Basic Plan Price IDs
    STRIPE_BASIC_MONTHLY_PLAN_ID: str = Field(default=os.getenv("STRIPE_BASIC_MONTHLY_PLAN_ID", "price_1RjJE7HYm0UQygR1NOLEapaB"))  
    STRIPE_BASIC_ANNUAL_PLAN_ID: str = Field(default=os.getenv("STRIPE_BASIC_ANNUAL_PLAN_ID", "price_1RjJE7HYm0UQygR1hEMx23Xi"))    
    
    # Standard Plan Price IDs  
    STRIPE_STANDARD_MONTHLY_PLAN_ID: str = Field(default=os.getenv("STRIPE_STANDARD_MONTHLY_PLAN_ID", "price_1RjJGTHYm0UQygR1A0VvnPWi"))  
    STRIPE_STANDARD_ANNUAL_PLAN_ID: str = Field(default=os.getenv("STRIPE_STANDARD_ANNUAL_PLAN_ID", "price_1RjJNrHYm0UQygR1XXFwIOPN"))    
    
    # Professional Plan Price IDs
    STRIPE_PROFESSIONAL_MONTHLY_PLAN_ID: str = Field(default=os.getenv("STRIPE_PROFESSIONAL_MONTHLY_PLAN_ID", "price_1RjJP7HYm0UQygR1296EgDEv"))  
    STRIPE_PROFESSIONAL_ANNUAL_PLAN_ID: str = Field(default=os.getenv("STRIPE_PROFESSIONAL_ANNUAL_PLAN_ID", "price_1RjJQlHYm0UQygR1yDT6jXPS"))
        
    @computed_field
    def DATABASE_URL(self) -> str:
        """Construct database URL with appropriate SSL settings."""
        # Base URL construction
        base_url = f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        
        # Add SSL mode for non-localhost connections if required
        if self.DB_HOST != "localhost" and self.DB_SSLMODE == "require":
            return f"{base_url}?sslmode=require"
        
        return base_url

    model_config = {
        "extra": "allow",  # This allows extra attributes that aren't declared
    }

# Create settings instance
settings = Settings()