import logging
import os
import time
from contextlib import asynccontextmanager

import truststore
truststore.inject_into_ssl()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from core.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

from api import chat, knowledge_base, sessions, upload
from core.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup: initialising database tables")
    try:
        create_tables()
        logger.info("startup: database tables ready")
    except Exception as exc:
        logger.error("startup: failed to create tables — %s", exc)
        raise

    logger.info("startup: loading embedding model")
    try:
        from core.rag import configure_llama_settings
        configure_llama_settings()
    except Exception as exc:
        logger.error("startup: failed to load embedding model — %s", exc)
        raise

    logger.info("startup: complete — API is ready")
    yield
    logger.info("shutdown: goodbye")


app = FastAPI(title="RAG Chatbot API", lifespan=lifespan)

_default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://strength-geriatric-dedicate.ngrok-free.dev",
]
_extra = os.environ.get("CORS_ORIGINS", "")
_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    logger.info("→ %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        ms = (time.perf_counter() - start) * 1000
        logger.info("← %s %s %d  %.1fms", request.method, request.url.path, response.status_code, ms)
        return response
    except Exception as exc:
        ms = (time.perf_counter() - start) * 1000
        logger.error("← %s %s ERROR  %.1fms — %s", request.method, request.url.path, ms, exc)
        raise


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(upload.router, prefix="/api")
app.include_router(knowledge_base.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
