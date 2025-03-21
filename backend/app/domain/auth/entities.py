from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean
from app.core.database.session import Base

class MagicLinkToken(Base):
    """Magic link token entity."""
    
    __tablename__ = "magic_link_tokens"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<MagicLinkToken {self.email}>"