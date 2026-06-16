"""Logging configuration — console + a self-healing, date-named file handler.

Every log line goes to both stdout and a file named with today's date
(`logs/app-YYYY-MM-DD.log`). The file handler is "self-healing": on every
single write it checks whether today's file still exists and whether the date
has rolled over since it was opened. If either is true it (re)creates the
file instead of writing into a handle pointing at a stale or deleted inode.
That gives two things for free: a fresh file each day, and recovery if the
current log file is deleted out from under a running process.
"""

from __future__ import annotations

import logging
import os
from datetime import date


class DailyFileHandler(logging.Handler):
    """Writes to `<directory>/<prefix>-<YYYY-MM-DD>.log`.

    The target file is (re)opened in append mode on demand — not just once at
    startup — so a new day or a missing file is picked up on the very next
    log call, with no rollover timer and no need to restart the process.
    """

    def __init__(self, directory: str, prefix: str = "app", encoding: str = "utf-8") -> None:
        super().__init__()
        self._directory = directory
        self._prefix = prefix
        self._encoding = encoding
        self._stream = None
        self._path: str | None = None

    def _path_for(self, day: date) -> str:
        return os.path.join(self._directory, f"{self._prefix}-{day.isoformat()}.log")

    def _ensure_stream(self) -> None:
        path = self._path_for(date.today())

        if self._stream is not None and path == self._path and os.path.exists(path):
            return

        if self._stream is not None:
            try:
                self._stream.close()
            except Exception:
                pass

        os.makedirs(self._directory, exist_ok=True)
        self._stream = open(path, "a", encoding=self._encoding)
        self._path = path

    def emit(self, record: logging.LogRecord) -> None:
        try:
            self._ensure_stream()
            self._stream.write(self.format(record) + "\n")
            self._stream.flush()
        except Exception:
            self.handleError(record)

    def close(self) -> None:
        if self._stream is not None:
            try:
                self._stream.close()
            except Exception:
                pass

            self._stream = None

        super().close()


_FORMAT = "%(asctime)s.%(msecs)03d %(levelname)-8s %(name)s:%(funcName)s:%(lineno)d - %(message)s"
_DATEFMT = "%Y-%m-%d %H:%M:%S"


_UVICORN_LOGGERS = ("uvicorn", "uvicorn.access")


def configure_logging(log_dir: str, level: int = logging.INFO) -> logging.Logger:
    """Attach a console handler and a `DailyFileHandler` to the root logger.

    Every module then just does `logging.getLogger(__name__)` and inherits
    both handlers. Safe to call more than once — it won't stack duplicates.

    Also feeds uvicorn's own startup/access/error logs into the same file.
    Uvicorn configures `uvicorn` / `uvicorn.access` with `propagate=False`
    *before* it imports this app (see `Config.__init__` -> `configure_logging`,
    which runs ahead of `Config.load()` -> importing `main:app`), so nothing
    reaches our root handlers — they need the file handler attached directly.
    `uvicorn.error` is deliberately left out of that list: it has no handler
    of its own and `propagate=True`, so it already bubbles up into `uvicorn`
    (its parent logger, dotted-name hierarchy) — attaching to both would
    double-write every startup/shutdown line. Console output for these
    loggers is already covered by uvicorn's own handlers, so only the file
    handler is added here, not the console one.
    """
    root = logging.getLogger()
    file_handler = next((h for h in root.handlers if isinstance(h, DailyFileHandler)), None)

    if file_handler is None:
        root.setLevel(level)
        formatter = logging.Formatter(_FORMAT, datefmt=_DATEFMT)

        console = logging.StreamHandler()
        console.setFormatter(formatter)
        root.addHandler(console)

        file_handler = DailyFileHandler(log_dir)
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    for name in _UVICORN_LOGGERS:
        uv_logger = logging.getLogger(name)

        if file_handler not in uv_logger.handlers:
            uv_logger.addHandler(file_handler)

    return root
