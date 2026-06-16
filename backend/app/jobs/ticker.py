"""Background jobs — the turn ticker.

A single long-lived task that wakes twice a second and, under the shared lock,
sweeps every active match to:

  * auto-pass a human turn that has run past the 45s limit, and
  * fire a bot's move once its "thinking" timer has elapsed.

It mutates matches through the same domain methods the gateway uses and
broadcasts results through the connection hub, so timer-driven and
player-driven changes are indistinguishable to clients.
"""

from __future__ import annotations

import asyncio
import time

from app.services import Services


async def run_ticker(svc: Services) -> None:
    while True:
        await asyncio.sleep(0.5)
        now = time.time()
        async with svc.lock:
            for match in svc.store.all():
                if match.phase != "playing" or not match.turn_pid:
                    continue

                turn_player = match.players.get(match.turn_pid)

                # Bot's turn: let it move once its think-timer elapses.
                if turn_player and turn_player.is_bot:
                    if match.bot_act_at and now >= match.bot_act_at:
                        match.bot_act_at = 0.0
                        ids = svc.bot.choose_move(turn_player)

                        if ids:
                            result = match.submit_word(turn_player.pid, ids, svc.dictionary)
                            await svc.hub.broadcast_fx(match, result.get("fx", []))
                        else:
                            fx = match.pass_turn(turn_player.pid, reason="passed")
                            await svc.hub.broadcast_fx(match, fx)

                        await svc.hub.broadcast_state(match)

                    continue  # bots don't time out

                if now >= match.turn_ends_at:
                    fx = match.pass_turn(match.turn_pid, reason="timeout")
                    await svc.hub.broadcast_fx(match, fx)
                    await svc.hub.broadcast_state(match)
