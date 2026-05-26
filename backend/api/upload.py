import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from core.config import settings
from core.database import FileRecord, get_db
from core.rag import delete_file_vectors
from models.schemas import FileResponse as FileResp

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
    "application/vnd.ms-excel": "excel",
}
MAX_SIZE_BYTES = 20 * 1024 * 1024


@router.post("/upload", response_model=FileResp)
async def upload_file(file: UploadFile, db: Session = Depends(get_db)):
    logger.info("upload: received file=%s content_type=%s", file.filename, file.content_type)

    if file.content_type not in ALLOWED_TYPES:
        logger.warning("upload: rejected unsupported type=%s file=%s", file.content_type, file.filename)
        raise HTTPException(status_code=400, detail="Only PDF and Excel files are supported.")

    try:
        contents = await file.read()
    except Exception as exc:
        logger.error("upload: failed to read file=%s — %s", file.filename, exc)
        raise HTTPException(status_code=500, detail="Failed to read uploaded file.")

    if len(contents) > MAX_SIZE_BYTES:
        logger.warning("upload: rejected file=%s size=%d exceeds 20MB", file.filename, len(contents))
        raise HTTPException(status_code=400, detail="File exceeds 20 MB limit.")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = uuid.uuid4()
    ext = Path(file.filename or "file").suffix
    dest = upload_dir / f"{file_id}{ext}"

    try:
        dest.write_bytes(contents)
        logger.info("upload: saved to disk path=%s size=%d bytes", dest, len(contents))
    except Exception as exc:
        logger.error("upload: failed to write to disk — %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save file to disk.")

    try:
        record = FileRecord(
            id=file_id,
            name=file.filename or dest.name,
            size=len(contents),
            type=ALLOWED_TYPES[file.content_type],
            path=str(dest),
            status="uploaded",
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info("upload: DB record created file_id=%s name=%s", file_id, record.name)
        return record
    except Exception as exc:
        logger.error("upload: DB insert failed file_id=%s — %s", file_id, exc)
        if dest.exists():
            dest.unlink()
        raise HTTPException(status_code=500, detail="Failed to save file record.")


@router.get("/files", response_model=list[FileResp])
def list_files(db: Session = Depends(get_db)):
    logger.info("list_files: fetching all records")
    try:
        files = db.query(FileRecord).order_by(FileRecord.created_at.desc()).all()
        logger.info("list_files: returned %d file(s)", len(files))
        return files
    except Exception as exc:
        logger.error("list_files: DB query failed — %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch files.")


@router.delete("/files/{file_id}")
def delete_file(file_id: str, db: Session = Depends(get_db)):
    logger.info("delete_file: file_id=%s", file_id)
    record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not record:
        logger.warning("delete_file: file_id=%s not found", file_id)
        raise HTTPException(status_code=404, detail="File not found.")

    if os.path.exists(record.path):
        try:
            os.remove(record.path)
            logger.info("delete_file: removed from disk path=%s", record.path)
        except Exception as exc:
            logger.warning("delete_file: could not remove from disk — %s", exc)

    if record.status == "indexed":
        try:
            delete_file_vectors(str(record.id))
            logger.info("delete_file: vectors removed file_id=%s", file_id)
        except Exception as exc:
            logger.warning("delete_file: could not remove vectors file_id=%s — %s", file_id, exc)

    try:
        db.delete(record)
        db.commit()
        logger.info("delete_file: DB record deleted file_id=%s", file_id)
    except Exception as exc:
        logger.error("delete_file: DB delete failed file_id=%s — %s", file_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete file record.")

    return {"message": "Deleted"}


@router.get("/files/{file_id}/view")
def view_file(file_id: str, db: Session = Depends(get_db)):
    logger.info("view_file: file_id=%s", file_id)
    record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not record:
        logger.warning("view_file: file_id=%s not found in DB", file_id)
        raise HTTPException(status_code=404, detail="File not found.")
    if not os.path.exists(record.path):
        logger.warning("view_file: file_id=%s not on disk path=%s", file_id, record.path)
        raise HTTPException(status_code=404, detail="File not on disk.")

    media_type = (
        "application/pdf"
        if record.type == "pdf"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    logger.info("view_file: serving name=%s media_type=%s", record.name, media_type)
    return FileResponse(path=record.path, media_type=media_type, filename=record.name)
