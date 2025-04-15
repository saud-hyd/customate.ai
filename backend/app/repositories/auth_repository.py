from datetime import datetime, timedelta
from typing import Optional
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