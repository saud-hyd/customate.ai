# Path: backend/app/repositories/auth_repository.py
# Usage: Repository for magic link tokens and verification tokens with fixed database queries

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
from sqlalchemy.orm import Session
from app.domain.auth.entities import MagicLinkToken
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

class MagicLinkTokenRepository:
    """Repository for magic link tokens."""
    
    def create_token(self, db: Session, email: str, token: str) -> MagicLinkToken:
        """Create a new magic link token."""
        # Set expiration (15 minutes from now)
        expires_at = datetime.utcnow() + timedelta(minutes=15)
        
        # Create token entity
        token_entity = MagicLinkToken(
            email=email,
            token=token,
            expires_at=expires_at
        )
        
        db.add(token_entity)
        db.commit()
        db.refresh(token_entity)
        
        return token_entity
    
    def get_token(self, db: Session, token: str) -> Optional[MagicLinkToken]:
        """Get token by value."""
        return db.query(MagicLinkToken).filter(MagicLinkToken.token == token).first()
    
    def verify_token(self, db: Session, email: str, token: str) -> bool:
        """Verify if token is valid and not expired."""
        logger.info(f"Verifying token for email: {email}, token: {token[:10]}...")
        
        try:
            # First check if token exists at all
            any_token = db.query(MagicLinkToken).filter(
                MagicLinkToken.email == email,
                MagicLinkToken.token == token
            ).first()
            
            if not any_token:
                logger.error(f"No token found for email: {email}")
                return False
                
            # Now check if it's valid (not used and not expired)
            valid_token = db.query(MagicLinkToken).filter(
                MagicLinkToken.email == email,
                MagicLinkToken.token == token,
                MagicLinkToken.used == False,
                MagicLinkToken.expires_at > datetime.utcnow()
            ).first()
            
            if valid_token:
                return True
                
            # Token exists but is either used or expired
            if any_token.used:
                logger.error(f"Token for {email} has already been used")
            if any_token.expires_at <= datetime.utcnow():
                logger.error(f"Token for {email} expired at {any_token.expires_at}")
                
            return False
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}", exc_info=True)
            return False    
        
    def use_token(self, db: Session, email: str, token: str) -> bool:
        """Mark token as used."""
        token_entity = db.query(MagicLinkToken).filter(
            MagicLinkToken.email == email,
            MagicLinkToken.token == token
        ).first()
        
        if token_entity:
            token_entity.used = True
            db.add(token_entity)
            db.commit()
            return True
        
        return False
    
    def get_token_data(self, db: Session, token: str) -> Optional[Dict[str, Any]]:
        """Get token data from database."""
        try:
            # FIXED: Use MagicLinkToken instead of self.model
            token_record = db.query(MagicLinkToken).filter(
                MagicLinkToken.token == token,
                MagicLinkToken.used == False,
                MagicLinkToken.expires_at > datetime.utcnow()
            ).first()
            
            if token_record:
                return {
                    "email": token_record.email,
                    "token": token_record.token,
                    "created_at": token_record.created_at,
                    "expires_at": token_record.expires_at
                }
            return None
        except Exception as e:
            logger.error(f"Error getting token data: {str(e)}")
            return None
        
    def delete_tokens_for_email(self, db: Session, email: str) -> None:
        """Delete all tokens for a specific email."""
        try:
            db.query(MagicLinkToken).filter(MagicLinkToken.email == email).delete()
            db.flush()
        except Exception as e:
            logger.error(f"Error deleting tokens for email {email}: {str(e)}")        