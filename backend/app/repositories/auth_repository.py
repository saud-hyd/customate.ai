from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.domain.auth.entities import MagicLinkToken
from app.repositories.base_repository import BaseRepository

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
        token_entity = db.query(MagicLinkToken).filter(
            MagicLinkToken.email == email,
            MagicLinkToken.token == token,
            MagicLinkToken.used == False,
            MagicLinkToken.expires_at > datetime.utcnow()
        ).first()
        
        return token_entity is not None
    
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