import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import FileRecord, get_db
from core.parser import parse_file
from core.rag import delete_file_vectors, ingest_documents

logger = logging.getLogger(__name__)
router = APIRouter()


def _process_file(file_id: str) -> None:
    from core.database import SessionLocal

    db = SessionLocal()
    record = None
    try:
        record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if not record:
            logger.error("process_file: record %s not found in DB", file_id)
            return

        logger.info("process_file: starting — %s (%s)", record.name, file_id)
        record.status = "processing"
        record.error_msg = None
        db.commit()

        logger.info("process_file: parsing %s", record.path)
        documents = parse_file(record.path)
        for doc in documents:
            doc.metadata["file_name"] = record.name  # use original name, not UUID path
        logger.info("process_file: parsed %d document(s)", len(documents))

        logger.info("process_file: ingesting into vector store")
        ingest_documents(documents, str(record.id))

        record.status = "indexed"
        db.commit()
        logger.info("process_file: done — %s is now indexed", record.name)

    except Exception as exc:
        logger.exception("process_file: failed for %s — %s", file_id, exc)
        if record is not None:
            try:
                record.status = "error"
                record.error_msg = str(exc)
                db.commit()
            except Exception as db_exc:
                logger.error("process_file: could not save error status — %s", db_exc)
    finally:
        db.close()


@router.post("/process/{file_id}")
def process_file(
    file_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found.")
    if record.status == "processing":
        return {"file_id": file_id, "status": "processing", "message": "Already in progress."}

    background_tasks.add_task(_process_file, file_id)
    return {"file_id": file_id, "status": "processing", "message": "Processing started."}


@router.get("/status/{file_id}")
def get_status(file_id: str, db: Session = Depends(get_db)):
    record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found.")
    return {
        "file_id": file_id,
        "status": record.status,
        "error_msg": record.error_msg,
    }


@router.delete("/vectors/{file_id}")
def remove_vectors(file_id: str, db: Session = Depends(get_db)):
    record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        delete_file_vectors(file_id)
        record.status = "uploaded"
        record.error_msg = None
        db.commit()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"message": "Vectors removed."}
