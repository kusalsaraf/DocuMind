import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import ChatMessage, ChatSession, get_db
from models.schemas import MessageResponse, SessionResponse, SessionTitleUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sessions", response_model=SessionResponse, status_code=201)
def create_session(db: Session = Depends(get_db)):
    logger.info("create_session: creating new session")
    try:
        session = ChatSession()
        db.add(session)
        db.commit()
        db.refresh(session)
        logger.info("create_session: created session_id=%s", session.id)
        return session
    except Exception as exc:
        logger.error("create_session: failed — %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create session.")


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    logger.info("list_sessions: fetching sessions with at least one message")
    try:
        from sqlalchemy import exists
        sessions = (
            db.query(ChatSession)
            .filter(exists().where(ChatMessage.session_id == ChatSession.id))
            .order_by(ChatSession.updated_at.desc())
            .all()
        )
        logger.info("list_sessions: returned %d session(s)", len(sessions))
        return sessions
    except Exception as exc:
        logger.error("list_sessions: failed — %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch sessions.")


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    logger.info("delete_session: session_id=%s", session_id)
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        logger.warning("delete_session: session_id=%s not found", session_id)
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        db.delete(session)
        db.commit()
        logger.info("delete_session: deleted session_id=%s (cascade removes messages)", session_id)
        return {"message": "Deleted"}
    except Exception as exc:
        logger.error("delete_session: failed session_id=%s — %s", session_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete session.")


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    logger.info("get_session_messages: session_id=%s", session_id)
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        logger.warning("get_session_messages: session_id=%s not found", session_id)
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        logger.info("get_session_messages: returned %d message(s) for session_id=%s", len(messages), session_id)
        return messages
    except Exception as exc:
        logger.error("get_session_messages: failed session_id=%s — %s", session_id, exc)
        raise HTTPException(status_code=500, detail="Failed to fetch messages.")


@router.patch("/sessions/{session_id}/title", response_model=SessionResponse)
def update_session_title(session_id: str, body: SessionTitleUpdate, db: Session = Depends(get_db)):
    logger.info("update_session_title: session_id=%s title=%r", session_id, body.title)
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        logger.warning("update_session_title: session_id=%s not found", session_id)
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        session.title = body.title
        session.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)
        logger.info("update_session_title: updated session_id=%s", session_id)
        return session
    except Exception as exc:
        logger.error("update_session_title: failed session_id=%s — %s", session_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update title.")
