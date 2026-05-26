from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class FileResponse(BaseModel):
    id: UUID
    name: str
    size: int
    type: str
    status: str
    error_msg: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProcessResponse(BaseModel):
    file_id: str
    status: str
    message: str


class Source(BaseModel):
    file_name: str
    page: Optional[str] = None
    excerpt: str
    score: Optional[float] = None


class ChatRequest(BaseModel):
    session_id: UUID
    question: str


class ChatResponse(BaseModel):
    message_id: UUID
    answer: str
    sources: List[Source]


class SessionResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionTitleUpdate(BaseModel):
    title: str


class MessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    sources: Optional[List[Source]] = None
    created_at: datetime

    model_config = {"from_attributes": True}
