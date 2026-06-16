"""Realtime gateway — the connection hub.

Holds the live WebSocket per player id and knows how to push frames to one
player or to everyone in a match. This is the only place that touches sockets;
match/store/matchmaker stay transport-agnostic. Send failures are swallowed —
a dropped socket is reconciled by the disconnect handler, not here.
"""

from __future__ import annotations

import json

from fastapi import WebSocket

from app.match import Match


class ConnectionHub:
    def __init__(self) -> None:
        self._sockets: dict[str, WebSocket] = {}  # pid -> ws

    def register(self, pid: str, ws: WebSocket) -> None:
        self._sockets[pid] = ws

    def unregister(self, pid: str) -> None:
        self._sockets.pop(pid, None)

    async def send(self, pid: str, payload: dict) -> None:
        ws = self._sockets.get(pid)

        if ws is None:
            return

        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            pass

    async def broadcast_state(self, match: Match) -> None:
        for pid in list(match.players.keys()):
            await self.send(pid, match.state_for(pid))

    async def broadcast_fx(self, match: Match, fx: list[dict]) -> None:
        if not fx:
            return

        for pid in list(match.players.keys()):
            await self.send(pid, {"type": "fx", "events": fx})
