"""Match module — the live duel between two players.

A Match owns the full game loop: seating players, dealing racks, running turns,
resolving cast words into damage/shield/burn, enforcing win conditions and
serializing a personalized snapshot for each side. It is pure game state — it
performs no I/O and knows nothing about sockets. The realtime gateway and the
background ticker drive it and broadcast whatever it returns.

(Formerly `game.Room`.)
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from app.auth import new_bot_id, new_player_id
from app.match.player import Player
from app.rules import (
    BOT_NAMES,
    BOT_THINK,
    BURN_DAMAGE,
    MAX_HP,
    MIN_WORD_LEN,
    MOD_BURN,
    MOD_SHIELD,
    SHIELD_GAIN,
    TURN_SECONDS,
    bot_think_time,
    compute_damage,
)


@dataclass
class Match:
    code: str
    players: dict[str, Player] = field(default_factory=dict)
    order: list[str] = field(default_factory=list)  # join order -> turn order
    phase: str = "waiting"  # waiting | playing | gameover
    turn_pid: str | None = None
    turn_ends_at: float = 0.0  # epoch seconds
    turn_seq: int = 0  # increments each turn (for timer guarding)
    winner: str | None = None
    log: list[dict] = field(default_factory=list)
    rematch_ready: set = field(default_factory=set)  # pids who clicked rematch
    bot_act_at: float = 0.0  # epoch time a bot should make its move

    # ---- seating ------------------------------------------------------
    def add_player(self, name: str) -> Player:
        pid = new_player_id()
        p = Player(pid=pid, name=name or f"Player {len(self.players) + 1}")
        self.players[pid] = p
        self.order.append(pid)

        return p

    def add_bot(self, difficulty: str = "medium") -> Player:
        if difficulty not in BOT_THINK:
            difficulty = "medium"

        p = Player(pid=new_bot_id(), name=BOT_NAMES[difficulty], is_bot=True, difficulty=difficulty)
        self.players[p.pid] = p
        self.order.append(p.pid)

        return p

    def has_bot(self) -> bool:
        return any(p.is_bot for p in self.players.values())

    def is_full(self) -> bool:
        return len(self.players) >= 2

    def opponent_of(self, pid: str) -> Player | None:
        for other in self.order:
            if other != pid:
                return self.players.get(other)

        return None

    def add_log(self, text: str, kind: str = "info") -> None:
        self.log.append({"text": text, "kind": kind})
        self.log = self.log[-10:]

    # ---- lifecycle ----------------------------------------------------
    def start(self) -> None:
        self.phase = "playing"
        self.rematch_ready = set()

        for p in self.players.values():
            p.fill_rack()

        self.add_log("The duel begins! Letters drawn.", "system")
        # First player (host / join order index 0) starts.
        self._begin_turn(self.order[0])

    def request_rematch(self, pid: str) -> bool:
        """Mark a player ready for a rematch. When both connected players are
        ready, reset the match and start a fresh duel. Returns True if started."""

        if self.phase != "gameover":
            return False

        self.rematch_ready.add(pid)

        # Bots always accept a rematch.
        for p in self.order:
            if self.players[p].is_bot:
                self.rematch_ready.add(p)

        connected = [p for p in self.order if self.players[p].connected]

        if len(connected) >= 2 and all(p in self.rematch_ready for p in connected):
            self._reset_and_start()
            return True

        return False

    def _reset_and_start(self) -> None:
        for p in self.players.values():
            p.hp = MAX_HP
            p.shield = 0
            p.pending_burn = 0
            p.rack = []

        self.log = []
        self.winner = None
        self.rematch_ready = set()
        self.phase = "waiting"

        if self.is_full():
            self.start()

    # ---- turns --------------------------------------------------------
    def _begin_turn(self, pid: str) -> list[dict]:
        """Switch active turn to pid, apply any pending burn, return fx list."""
        self.turn_pid = pid
        self.turn_seq += 1
        self.turn_ends_at = time.time() + TURN_SECONDS
        fx: list[dict] = []

        player = self.players[pid]

        if player.pending_burn > 0 and self.phase == "playing":
            burn = player.pending_burn
            player.pending_burn = 0
            lost = player.take_damage(burn)
            self.add_log(f"{player.name} suffers {lost} burn damage!", "burn")
            fx.append({"type": "burn", "target": pid, "amount": lost})

            if player.hp <= 0:
                self._end_game(self.opponent_of(pid))

        # Schedule a bot's move a moment after its turn begins.
        if player.is_bot and self.phase == "playing":
            self.bot_act_at = time.time() + bot_think_time(player.difficulty)

        return fx

    def _end_game(self, winner: Player | None) -> None:
        self.phase = "gameover"
        self.winner = winner.pid if winner else None

        if winner:
            self.add_log(f"{winner.name} wins the duel!", "system")

    def pass_turn(self, pid: str, reason: str = "passed") -> list[dict]:
        if self.phase != "playing" or self.turn_pid != pid:
            return []

        player = self.players[pid]

        if reason == "timeout":
            self.add_log(f"{player.name} ran out of time. Turn skipped.", "warn")
        elif reason == "invalid":
            self.add_log("Invalid word. Turn skipped.", "warn")
        else:
            self.add_log(f"{player.name} passed.", "warn")

        opp = self.opponent_of(pid)

        return self._begin_turn(opp.pid)

    def submit_word(self, pid: str, tile_ids: list[str], dictionary) -> dict:
        """
        Validate and resolve a submitted word.
        Returns a result dict: {ok, reason?, fx:[...]} ; the caller broadcasts
        fresh state afterwards.
        """

        if self.phase != "playing":
            return {"ok": False, "reason": "Game is not in progress."}

        if self.turn_pid != pid:
            return {"ok": False, "reason": "It is not your turn."}

        player = self.players[pid]
        # Resolve tile ids against the server's authoritative rack copy.
        rack_by_id = {t["id"]: t for t in player.rack}

        if not tile_ids or len(tile_ids) < MIN_WORD_LEN:
            return {"ok": False, "reason": f"Words must be at least {MIN_WORD_LEN} letters."}

        if len(set(tile_ids)) != len(tile_ids):
            return {"ok": False, "reason": "Duplicate tiles in submission."}

        tiles: list[dict] = []

        for tid in tile_ids:
            t = rack_by_id.get(tid)

            if not t:
                return {"ok": False, "reason": "Tiles not in your rack."}

            tiles.append(t)

        word = "".join(t["letter"] for t in tiles).lower()

        if word not in dictionary:
            # Invalid word: flash red but KEEP the turn. The player can try
            # again until they cast a valid word or the timer runs out.
            fx = [{"type": "invalid", "target": pid, "word": word.upper()}]
            return {"ok": False, "reason": "not_a_word", "word": word.upper(), "fx": fx}

        # Valid word -> compute damage, apply effects.
        damage, breakdown = compute_damage(tiles)
        opp = self.opponent_of(pid)

        # Shield tiles grant the caster shield.
        shield_tiles = sum(1 for t in tiles if t.get("mod") == MOD_SHIELD)
        gained_shield = shield_tiles * SHIELD_GAIN

        if gained_shield:
            player.shield += gained_shield

        # Burn tiles add to opponent's pending burn.
        burn_tiles = sum(1 for t in tiles if t.get("mod") == MOD_BURN)

        if burn_tiles:
            opp.pending_burn += burn_tiles * BURN_DAMAGE

        opp.take_damage(damage)

        # Build a descriptive log line.
        extras = []

        if breakdown["doubled"]:
            extras.append("x2")

        if gained_shield:
            extras.append(f"+{gained_shield} shield")

        if burn_tiles:
            extras.append("burn")

        suffix = f" ({', '.join(extras)})" if extras else ""
        self.add_log(
            f"{player.name} played {word.upper()} for {damage} damage{suffix}.",
            "play",
        )

        fx = [
            {
                "type": "play",
                "by": pid,
                "target": opp.pid,
                "word": word.upper(),
                "damage": damage,
                "breakdown": breakdown,
                "shield": gained_shield,
                "burn": burn_tiles * BURN_DAMAGE if burn_tiles else 0,
            }
        ]

        # Remove used tiles, refill rack.
        used = set(tile_ids)
        player.rack = [t for t in player.rack if t["id"] not in used]
        player.fill_rack()

        # Win check, else hand turn to opponent.
        if opp.hp <= 0:
            self._end_game(player)
        else:
            fx += self._begin_turn(opp.pid)

        return {"ok": True, "fx": fx}

    # ---- serialization ------------------------------------------------
    def state_for(self, pid: str) -> dict:
        """Personalized snapshot: full rack for `pid`, hidden count for opp."""
        you = self.players.get(pid)
        opp = self.opponent_of(pid)
        remaining = max(0, self.turn_ends_at - time.time()) if self.phase == "playing" else 0

        return {
            "type": "state",
            "phase": self.phase,
            "roomId": self.code,
            "turnPid": self.turn_pid,
            "turnEndsAt": int(self.turn_ends_at * 1000),
            "turnRemaining": round(remaining, 1),
            "turnSeconds": TURN_SECONDS,
            "winner": self.winner,
            "log": self.log,
            "you": (
                None
                if not you
                else {
                    "id": you.pid,
                    "name": you.name,
                    "hp": you.hp,
                    "maxHp": MAX_HP,
                    "shield": you.shield,
                    "pendingBurn": you.pending_burn,
                    "rack": you.rack,
                    "yourTurn": self.turn_pid == pid and self.phase == "playing",
                    "connected": you.connected,
                    "rematchReady": you.pid in self.rematch_ready,
                }
            ),
            "opp": (
                None
                if not opp
                else {
                    "id": opp.pid,
                    "name": opp.name,
                    "hp": opp.hp,
                    "maxHp": MAX_HP,
                    "shield": opp.shield,
                    "pendingBurn": opp.pending_burn,
                    "rackCount": len(opp.rack),
                    "connected": opp.connected,
                    "rematchReady": opp.pid in self.rematch_ready,
                }
            ),
        }
