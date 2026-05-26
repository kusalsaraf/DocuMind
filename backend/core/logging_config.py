import logging
import logging.handlers
from pathlib import Path

LOG_DIR = Path("logs")
LOG_FILE = LOG_DIR / "app.log"
LOG_FMT = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s"
LOG_DATEFMT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    formatter = logging.Formatter(LOG_FMT, datefmt=LOG_DATEFMT)

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    console.setLevel(logging.INFO)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    root.addHandler(console)

    try:
        LOG_DIR.mkdir(exist_ok=True)
        file_handler = logging.handlers.RotatingFileHandler(
            LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.DEBUG)
        root.addHandler(file_handler)
    except OSError:
        root.warning("Could not create log directory — file logging disabled")

    for noisy in ("uvicorn.access", "httpx", "httpcore", "sentence_transformers"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
