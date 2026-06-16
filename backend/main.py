"""Word Duel Palace — server entrypoint.

Thin shim kept so `uvicorn main:app` (used by the Makefiles, launch.json and the
docs) keeps working. All wiring lives in the modular `app` package; see
`app/__init__.py` for the module map and `app/factory.py` for the assembly.
"""

from __future__ import annotations

from app import create_app

app = create_app()
