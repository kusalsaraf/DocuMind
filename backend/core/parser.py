import logging
from pathlib import Path

import pandas as pd
import pdfplumber
from llama_index.core import Document

logger = logging.getLogger(__name__)


def parse_pdf(path: str) -> list[Document]:
    logger.info("parse_pdf: opening %s", path)
    docs = []
    try:
        with pdfplumber.open(path) as pdf:
            total_pages = len(pdf.pages)
            logger.info("parse_pdf: %d page(s) found in %s", total_pages, path)
            for i, page in enumerate(pdf.pages):
                try:
                    text = (page.extract_text() or "").strip()
                    if text:
                        docs.append(Document(
                            text=text,
                            metadata={
                                "file_path": path,
                                "file_name": Path(path).name,
                                "page_num": str(i + 1),
                                "source_type": "pdf",
                            },
                        ))
                    else:
                        logger.debug("parse_pdf: page %d has no extractable text", i + 1)
                except Exception as exc:
                    logger.warning("parse_pdf: failed to extract page %d — %s", i + 1, exc)
    except Exception as exc:
        logger.error("parse_pdf: failed to open %s — %s", path, exc)
        raise

    logger.info("parse_pdf: extracted %d document(s) from %s", len(docs), path)
    return docs


def parse_excel(path: str) -> list[Document]:
    logger.info("parse_excel: opening %s", path)
    docs = []
    try:
        xls = pd.ExcelFile(path)
        logger.info("parse_excel: %d sheet(s) found — %s", len(xls.sheet_names), xls.sheet_names)
        for sheet in xls.sheet_names:
            try:
                df = xls.parse(sheet)
                if df.empty:
                    logger.debug("parse_excel: sheet=%s is empty, skipping", sheet)
                    continue
                table_md = df.to_markdown(index=False)
                docs.append(Document(
                    text=f"Sheet: {sheet}\n\n{table_md}",
                    metadata={
                        "file_path": path,
                        "file_name": Path(path).name,
                        "sheet_name": str(sheet),
                        "source_type": "excel",
                    },
                ))
                logger.debug("parse_excel: sheet=%s parsed %d rows", sheet, len(df))
            except Exception as exc:
                logger.warning("parse_excel: failed to parse sheet=%s — %s", sheet, exc)
    except Exception as exc:
        logger.error("parse_excel: failed to open %s — %s", path, exc)
        raise

    logger.info("parse_excel: extracted %d document(s) from %s", len(docs), path)
    return docs


def parse_file(path: str) -> list[Document]:
    ext = Path(path).suffix.lower()
    logger.info("parse_file: path=%s ext=%s", path, ext)
    try:
        if ext == ".pdf":
            return parse_pdf(path)
        if ext in (".xlsx", ".xls"):
            return parse_excel(path)
        raise ValueError(f"Unsupported file type: {ext}")
    except ValueError:
        raise
    except Exception as exc:
        logger.error("parse_file: unexpected error for %s — %s", path, exc)
        raise
