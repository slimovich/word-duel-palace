"""Persistence module — the in-memory match store.

This is the single source of truth for "which matches exist" and "which match a
player belongs to." It is deliberately an in-memory implementation: matches are
ephemeral and disappear when empty. The interface (add / get / bind / unbind /
cleanup) is what the rest of the app depends on, so swapping in a Redis- or
DB-backed store later would not touch the gateway or matchmaker.
"""

from __future__ import annotations

from app.match import Match


class MatchStore:
    def __init__(self) -> None:
        self._matches: dict[str, Match] = {}  # code -> Match
        self._player_match: dict[str, str] = {}  # pid -> code

    # ---- matches ------------------------------------------------------
    def add(self, match: Match) -> None:
        self._matches[match.code] = match

    def get(self, code: str | None) -> Match | None:
        return self._matches.get(code) if code else None

    def codes(self) -> set[str]:
        return set(self._matches.keys())

    def all(self) -> list[Match]:
        return list(self._matches.values())

    def count(self) -> int:
        return len(self._matches)

    # ---- player <-> match binding -------------------------------------
    def bind_player(self, pid: str, code: str) -> None:
        self._player_match[pid] = code

    def unbind_player(self, pid: str) -> None:
        self._player_match.pop(pid, None)

    def code_for_player(self, pid: str | None) -> str | None:
        return self._player_match.get(pid) if pid else None

    def match_for_player(self, pid: str | None) -> Match | None:
        return self.get(self.code_for_player(pid))

    # ---- cleanup ------------------------------------------------------
    def cleanup_if_empty(self, code: str | None) -> None:
        """Drop a match (and its player bindings) once everyone has left."""
        match = self.get(code)

        if not match:
            return

        if all(not p.connected for p in match.players.values()):
            for pid in match.players:
                self._player_match.pop(pid, None)

            self._matches.pop(code, None)
