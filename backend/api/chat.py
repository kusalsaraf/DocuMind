import logging
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from core.config import settings
from core.database import ChatMessage, ChatSession, get_db
from core.rag import get_retriever
from models.schemas import ChatRequest, ChatResponse, Source

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_HISTORY_MESSAGES = 10

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)

_SYSTEM_PROMPT = """You are a smart, friendly AI assistant embedded in a document knowledge base. \
Your personality: warm, crisp, and conversational — like a knowledgeable friend, not a corporate bot.

Guidelines:
- Use emojis naturally to keep things friendly 😊 (don't overdo it)
- Keep answers concise and punchy — no walls of text
- Use bullet points or bold when it helps clarity
- Vary your phrasing, sound human, never robotic
- For casual chat (hi, thanks, bye, small talk) — respond warmly and naturally
- For document questions — use the provided context accurately; if the answer isn't there, say so honestly but kindly
"""

_SMALL_TALK = {
    "hi", "hello", "hey", "hii", "helo", "heyy", "yo",
    "bye", "goodbye", "good bye", "see you", "see ya", "cya", "tata",
    "thanks", "thank you", "thankyou", "thx", "ty", "thank u",
    "ok", "okay", "k", "cool", "great", "nice", "awesome", "got it",
    "good morning", "good afternoon", "good evening", "good night",
    "how are you", "how r u", "how are u", "whats up", "what's up", "sup",
    "who are you", "what are you", "what can you do", "help",
}


def _is_small_talk(text: str) -> bool:
    lower = text.lower().strip(" !?.,\"'")
    if lower in _SMALL_TALK:
        return True
    # Check if any individual word matches a short keyword (hi, bye, hey, etc.)
    words = set(lower.split())
    if words & _SMALL_TALK:
        return True
    # Check if any multi-word phrase is contained in the text
    return any(phrase in lower for phrase in _SMALL_TALK if len(phrase) > 4)


def _call_gemini(prompt: str) -> str:
    logger.debug("_call_gemini: sending request to Gemini")
    try:
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        resp = requests.post(
            _GEMINI_URL,
            json=payload,
            headers={"x-goog-api-key": settings.gemini_api_key},
            timeout=60,
        )
        resp.raise_for_status()
        answer = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        logger.debug("_call_gemini: response length=%d chars", len(answer))
        return answer
    except requests.exceptions.Timeout:
        logger.error("_call_gemini: request timed out")
        raise HTTPException(status_code=504, detail="Gemini API timed out.")
    except requests.exceptions.HTTPError as exc:
        logger.error("_call_gemini: HTTP error %s — %s", exc.response.status_code, exc)
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc.response.status_code}")
    except Exception as exc:
        logger.error("_call_gemini: unexpected error — %s", exc)
        raise HTTPException(status_code=500, detail="Failed to get response from Gemini.")


def _build_context(nodes) -> str:
    parts = []
    for i, node in enumerate(nodes, 1):
        meta = node.metadata
        loc = meta.get("page_num") or meta.get("sheet_name") or "—"
        parts.append(f"[{i}] {meta.get('file_name', 'unknown')} (p.{loc})\n{node.text}")
    return "\n\n---\n\n".join(parts)


def _extract_sources(nodes) -> list[Source]:
    sources = []
    for node in nodes:
        meta = node.metadata
        loc = meta.get("page_num") or meta.get("sheet_name")
        sources.append(Source(
            file_name=meta.get("file_name", "unknown"),
            page=str(loc) if loc else None,
            excerpt=node.text[:300].strip(),
            score=round(float(node.score), 4) if node.score is not None else None,
        ))
    return sources


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: DBSession = Depends(get_db)):
    question = str(req.question).strip()
    logger.info("chat: session_id=%s question=%r", req.session_id, question[:80])

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    session = db.query(ChatSession).filter(ChatSession.id == req.session_id).first()
    if not session:
        logger.warning("chat: session_id=%s not found", req.session_id)
        raise HTTPException(status_code=404, detail="Session not found.")

    db_msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == req.session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(MAX_HISTORY_MESSAGES)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in reversed(db_msgs)]
    history_text = "".join(
        f"{'User' if t['role'] == 'user' else 'Assistant'}: {t['content']}\n"
        for t in history
    )

    # Small talk: skip retrieval, respond naturally
    if _is_small_talk(question):
        logger.info("chat: small talk detected session_id=%s", req.session_id)
        prompt = (
            _SYSTEM_PROMPT
            + (f"\nConversation so far:\n{history_text}\n" if history_text else "")
            + f"\nUser: {question}\nAssistant:"
        )
        answer = _call_gemini(prompt)
        return _persist_and_respond(session, question, answer, [], db)

    # Document question: retrieve context
    try:
        retriever = get_retriever(top_k=5)
        nodes = retriever.retrieve(question)
        logger.info("chat: retrieved %d node(s) session_id=%s", len(nodes), req.session_id)
    except Exception as exc:
        logger.error("chat: retrieval failed session_id=%s — %s", req.session_id, exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve context from knowledge base.")

    if not nodes:
        logger.info("chat: no relevant nodes found session_id=%s", req.session_id)
        prompt = (
            _SYSTEM_PROMPT
            + "\nNo relevant documents found in the knowledge base for this question."
            + (f"\nConversation so far:\n{history_text}\n" if history_text else "")
            + f"\nUser: {question}\nAssistant:"
        )
        answer = _call_gemini(prompt)
        return _persist_and_respond(session, question, answer, [], db)

    context = _build_context(nodes)
    prompt = (
        _SYSTEM_PROMPT
        + f"\n📄 Document context:\n{context}\n"
        + (f"\nConversation so far:\n{history_text}\n" if history_text else "")
        + f"\nUser: {question}\nAssistant:"
    )

    logger.info("chat: calling Gemini session_id=%s context_nodes=%d", req.session_id, len(nodes))
    answer = _call_gemini(prompt)
    sources = _extract_sources(nodes)
    return _persist_and_respond(session, question, answer, sources, db)


def _persist_and_respond(
    session: ChatSession,
    question: str,
    answer: str,
    sources: list[Source],
    db: DBSession,
) -> ChatResponse:
    user_msg = ChatMessage(session_id=session.id, role="user", content=question)
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=answer,
        sources=[s.model_dump() for s in sources] if sources else None,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    _update_session_meta(session, question, db)
    db.commit()
    db.refresh(assistant_msg)
    logger.info("chat: answered session_id=%s answer_length=%d", session.id, len(answer))
    return ChatResponse(message_id=assistant_msg.id, answer=answer, sources=sources)


def _update_session_meta(session: ChatSession, question: str, db: DBSession) -> None:
    session.updated_at = datetime.now(timezone.utc)
    if session.title == "New Chat":
        session.title = question[:50]
