"""Application factory — wires the modules into a FastAPI app.

`create_app()` builds the service container, attaches the realtime gateway and
the HTTP API, launches the background ticker on startup, and mounts the built
frontend LAST so its catch-all static handler never shadows /ws or /api.
"""

from __future__ import annotations

import asyncio

from fastapi import FastAPI

from app.api import mount_frontend, register_api_routes
from app.config import settings
from app.jobs import run_ticker
from app.logging_config import configure_logging
from app.realtime import register_gateway
from app.services import Services


def create_app() -> FastAPI:
    configure_logging(settings.LOG_DIR)

    app = FastAPI(title="Word Duel Palace")
    svc = Services.build()

    register_gateway(app, svc)  # /ws
    register_api_routes(app, svc)  # /api/*

    @app.on_event("startup")
    async def _startup() -> None:
        asyncio.create_task(run_ticker(svc))

    mount_frontend(app, svc)  # "/" — must be registered last

    return app
