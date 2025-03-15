from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.domain.auth.entities import OTPVerification
from app.repositories.base_repository import BaseRepository

class OTPRepository(BaseRepository[OTPVerification, dict, dict]):
    """Repository for OTP verification entities."""
    
    def __init__(self):
        super().__init__(OTPVerification)
    
    def create_otp(self, db: Session, email: str, otp: str, expiry_minutes: int = 10) -> OTPVerification:
        """Create a new OTP verification record."""
        # Check if there's an existing record for this email
        existing = db.query(self.model).filter(self.model.email == email).first()
        
        # Calculate expiry time
        expires_at = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        
        if existing:
            # Update existing record
            existing.otp = otp
            existing.created_at = datetime.utcnow()
            existing.expires_at = expires_at
            existing.verified = 0
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new record
            otp_record = self.model(
                email=email,
                otp=otp,
                expires_at=expires_at
            )
            db.add(otp_record)
            db.commit()
            db.refresh(otp_record)
            return otp_record
    
    def verify_otp(self, db: Session, email: str, otp: str) -> bool:
        """Verify if an OTP is valid for the given email."""
        record = db.query(self.model).filter(
            self.model.email == email,
            self.model.otp == otp,
            self.model.expires_at > datetime.utcnow()
        ).first()
        
        if record:
            # Mark as verified
            record.verified = 1
            db.add(record)
            db.commit()
            return True
        
        return False
    
    def is_verified(self, db: Session, email: str) -> bool:
        """Check if an email has been verified."""
        record = db.query(self.model).filter(
            self.model.email == email,
            self.model.verified == 1
        ).first()
        
        return record is not None