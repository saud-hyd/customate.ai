# app/api/chatbot/session_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.chat_repository import ChatSessionRepository, ChatMessageRepository

router = APIRouter(prefix="/chatbot", tags=["chatbot_sessions"])

@router.get("/sessions", response_model=List[Dict[str, Any]])
async def get_chat_sessions(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
    limit: int = 100,
    skip: int = 0
):
    """Get all chat sessions for the current client."""
    session_repo = ChatSessionRepository()
    # Get all sessions for the client first
    sessions = session_repo.get_by_client_id(db, current_client.client_id)
    
    # Manually implement pagination
    paginated_sessions = sessions[skip:skip+limit] if sessions else []
    
    result = []
    for session in paginated_sessions:
        # Get message count
        message_count = len(session.messages) if hasattr(session, 'messages') else 0
        
        # Calculate duration
        duration_seconds = 0
        if message_count > 0 and hasattr(session, 'messages') and len(session.messages) > 0:
            first_msg_time = min(msg.created_at for msg in session.messages)
            last_msg_time = max(msg.created_at for msg in session.messages)
            duration_seconds = int((last_msg_time - first_msg_time).total_seconds())
        
        result.append({
            "session_id": session.session_id,
            "user_id": session.user_id,
            "ip_address": session.ip_address,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "message_count": message_count,
            "duration_seconds": duration_seconds,
            "status": "completed" if message_count > 1 else "abandoned"
        })
    
    return result

@router.delete("/sessions/{session_id}", status_code=204)
async def delete_chat_session(
    session_id: str,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Delete a chat session and all associated messages."""
    # Verify session belongs to client
    session_repo = ChatSessionRepository()
    session = session_repo.get_by_session_id(db, session_id)
    
    if not session or session.client_id != current_client.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Delete session (this should cascade delete messages)
    session_repo.delete(db, id=session.id)
    
    return None