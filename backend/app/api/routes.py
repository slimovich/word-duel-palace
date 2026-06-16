"""HTTP API + static frontend.

Two small REST endpoints alongside the WebSocket: a health probe and the word
list used by the client for live "is this a word?" previews (the server stays
authoritative and re-validates every cast regardless). The built frontend is
mounted LAST, at "/", so its catch-all static handler never shadows /ws or /api.
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app.services import Services


def register_api_routes(app: FastAPI, svc: Services) -> None:
    @app.get("/api/health")
    async def health() -> JSONResponse:
        return JSONResponse({"ok": True, "words": len(svc.dictionary), "rooms": svc.store.count()})

    @app.get("/api/words")
    async def words_list() -> PlainTextResponse:
        return PlainTextResponse(svc.dictionary.text)


def mount_frontend(app: FastAPI, svc: Services) -> None:
    """Serve the built SPA at '/'. Call this AFTER all other routes."""
    dist = svc.settings.FRONTEND_DIST

    if os.path.isdir(dist):
        app.mount("/", StaticFiles(directory=dist, html=True), name="static")
    else:

        @app.get("/")
        async def root_placeholder() -> JSONResponse:
            return JSONResponse(
                {
                    "msg": "Word Duel Palace API running. Build the frontend "
                    "(npm run build) to serve the UI from here.",
                }
            )
