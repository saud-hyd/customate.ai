from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer
from app.core.database.session import Base

class OTPVerification(Base):
    """OTP verification entity."""
    
    __tablename__ = "otp_verifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    otp = Column(String(6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    verified = Column(Integer, default=0)  # 0 = not verified, 1 = verified
    
    def __repr__(self):
        return f"<OTPVerification {self.email}>"