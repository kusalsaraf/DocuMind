import logging
from urllib.parse import urlparse

from llama_index.core import Settings, StorageContext, VectorStoreIndex
from llama_index.core import Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.postgres import PGVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from core.config import settings

logger = logging.getLogger(__name__)

EMBED_DIM = 768
TABLE_NAME = "document_embeddings"


def configure_llama_settings() -> None:
    logger.info("rag: loading HuggingFace embedding model BAAI/bge-base-en-v1.5")
    try:
        Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
        Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)
        Settings.llm = None
        logger.info("rag: embedding model ready")
    except Exception as exc:
        logger.error("rag: failed to load embedding model — %s", exc)
        raise


def _parse_db_url(url: str) -> dict:
    import os
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
        "user": parsed.username or os.getenv("USER", "postgres"),
        "password": parsed.password or "",
    }


def get_vector_store() -> PGVectorStore:
    try:
        db = _parse_db_url(settings.database_url)
        store = PGVectorStore.from_params(
            host=db["host"],
            port=db["port"],
            database=db["database"],
            user=db["user"],
            password=db["password"],
            table_name=TABLE_NAME,
            embed_dim=EMBED_DIM,
        )
        logger.debug("rag: vector store connected host=%s db=%s table=%s", db["host"], db["database"], TABLE_NAME)
        return store
    except Exception as exc:
        logger.error("rag: failed to connect to vector store — %s", exc)
        raise


def ingest_documents(documents: list[Document], file_id: str) -> None:
    logger.info("rag: ingesting %d document(s) for file_id=%s", len(documents), file_id)
    try:
        for doc in documents:
            doc.metadata["file_id"] = file_id

        vector_store = get_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            show_progress=False,
        )
        logger.info("rag: ingestion complete file_id=%s", file_id)
    except Exception as exc:
        logger.error("rag: ingestion failed file_id=%s — %s", file_id, exc)
        raise


def delete_file_vectors(file_id: str) -> None:
    logger.info("rag: deleting vectors for file_id=%s", file_id)
    try:
        from llama_index.core.vector_stores.types import ExactMatchFilter, MetadataFilters
        vector_store = get_vector_store()
        vector_store.delete_nodes(
            filters=MetadataFilters(
                filters=[ExactMatchFilter(key="file_id", value=file_id)]
            )
        )
        logger.info("rag: vectors deleted file_id=%s", file_id)
    except Exception as exc:
        logger.error("rag: failed to delete vectors file_id=%s — %s", file_id, exc)
        raise


def get_retriever(top_k: int = 5):
    logger.debug("rag: building retriever top_k=%d", top_k)
    try:
        vector_store = get_vector_store()
        index = VectorStoreIndex.from_vector_store(vector_store)
        return index.as_retriever(similarity_top_k=top_k)
    except Exception as exc:
        logger.error("rag: failed to build retriever — %s", exc)
        raise
