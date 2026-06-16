"""Application configuration — paths and tunables resolved at startup."""

from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        # backend/app/config.py -> backend/
        self.BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.PROJECT_DIR = os.path.dirname(self.BACKEND_DIR)
        self.WORDS_FILE = os.path.join(self.BACKEND_DIR, "words.txt")
        self.FRONTEND_DIST = os.path.join(self.PROJECT_DIR, "frontend", "dist")
        self.LOG_DIR = os.path.join(self.BACKEND_DIR, "logs")


settings = Settings()
