"""Realtime gateway — the WebSocket endpoint and message router.

This is the seam between the network and the game. It owns the `/ws` endpoint,
parses inbound JSON frames, and translates each into calls on the domain
modules (matchmaker, store, match) under the shared async lock, then broadcasts
the result through the connection hub. It holds no game logic of its own.

Every connection carries a small mutable `session` dict ({"pid": ...}); the
create/join handlers stamp it with the player's id, which thereafter authorizes
every action on that socket against the store's player->match binding.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.auth import sanitize_name

if TYPE_CHECKING:
    from app.services import Services


async def _handle_message(svc: Services, session: dict, ws: WebSocket, msg: dict) -> None:
    mtype = msg.get("type")
    store, hub, lock = svc.store, svc.hub, svc.lock

    if mtype == "create":
        bot_diff = msg.get("bot")  # None for a human game, else easy/medium/hard
        async with lock:
            match = svc.matchmaker.create_match()
            player = match.add_player(sanitize_name(msg.get("name")))
            session["pid"] = player.pid
            hub.register(player.pid, ws)
            store.bind_player(player.pid, match.code)

            if bot_diff:
                match.add_bot(bot_diff)

                if match.is_full():
                    match.start()

        await hub.send(
            player.pid,
            {
                "type": "created",
                "roomId": match.code,
                "playerId": player.pid,
            },
        )
        await hub.broadcast_state(match)
        return

    if mtype == "add_bot":
        match = store.match_for_player(session.get("pid"))

        if match:
            async with lock:
                if match.phase == "waiting" and not match.is_full():
                    match.add_bot(msg.get("difficulty", "medium"))

                    if match.is_full():
                        match.start()

            await hub.broadcast_state(match)

        return

    if mtype == "join":
        async with lock:
            match = svc.matchmaker.find_open_match(msg.get("roomId") or "")

            if not match:
                # Distinguish "missing" from "full" for a clearer message.
                exists = store.get((msg.get("roomId") or "").strip().upper())
                message = "Room is full." if exists else "Room not found."
                await ws.send_text(json.dumps({"type": "error", "message": message}))
                return

            player = match.add_player(sanitize_name(msg.get("name")))
            session["pid"] = player.pid
            hub.register(player.pid, ws)
            store.bind_player(player.pid, match.code)
            await hub.send(
                player.pid,
                {
                    "type": "joined",
                    "roomId": match.code,
                    "playerId": player.pid,
                },
            )

            if match.is_full() and match.phase == "waiting":
                match.start()

        await hub.broadcast_state(match)
        return

    # All remaining actions require an established identity + match.
    pid = session.get("pid")

    if not pid:
        return

    match = store.match_for_player(pid)

    if not match:
        return

    if mtype == "submit":
        tile_ids = msg.get("tiles") or []
        async with lock:
            result = match.submit_word(pid, tile_ids, svc.dictionary)

        if not result.get("ok") and result.get("reason") not in ("not_a_word",):
            await hub.send(pid, {"type": "error", "message": result["reason"]})
            # Non-fatal validation error: no turn change, just refresh state.
            await hub.broadcast_state(match)
            return

        await hub.broadcast_fx(match, result.get("fx", []))
        await hub.broadcast_state(match)
        return

    if mtype == "pass":
        async with lock:
            fx = match.pass_turn(pid, reason="passed")
        await hub.broadcast_fx(match, fx)
        await hub.broadcast_state(match)
        return

    if mtype == "rematch":
        async with lock:
            # Marks this player ready; the match restarts once both players are.
            match.request_rematch(pid)
        await hub.broadcast_state(match)
        return

    if mtype == "ping":
        await hub.send(pid, {"type": "pong"})
        return


def register_gateway(app: FastAPI, svc: Services) -> None:
    """Attach the `/ws` endpoint, closing over the shared services."""

    @app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket) -> None:
        await ws.accept()
        session: dict = {"pid": None}

        try:
            while True:
                raw = await ws.receive_text()

                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                await _handle_message(svc, session, ws, msg)

        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            await _on_disconnect(svc, session)


async def _on_disconnect(svc: Services, session: dict) -> None:
    pid = session.get("pid")

    if not pid:
        return

    async with svc.lock:
        svc.hub.unregister(pid)
        code = svc.store.code_for_player(pid)
        match = svc.store.get(code)

        if match and pid in match.players:
            match.players[pid].connected = False
            match.add_log(f"{match.players[pid].name} disconnected.", "warn")

            # If the game was in progress, end it for the survivor.
            if match.phase == "playing":
                survivor = match.opponent_of(pid)

                if survivor and survivor.connected:
                    match._end_game(survivor)

        if match:
            await svc.hub.broadcast_state(match)
            svc.store.cleanup_if_empty(code)
