"""Matchmaking module — minting room codes and creating/finding matches.

The game uses skribbl-style private rooms: a host creates a match and shares its
5-character code; the second player joins by code. The Matchmaker generates a
collision-free code, registers the new Match with the store, and offers a helper
for finding an open match by code.
"""

from __future__ import annotations

import random

from app.match import Match
from app.persistence import MatchStore

# Avoids easily-confused characters (no 0/O/1/I).
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_CODE_LEN = 5


class Matchmaker:
    def __init__(self, store: MatchStore) -> None:
        self._store = store

    def make_room_code(self) -> str:
        existing = self._store.codes()

        while True:
            code = "".join(random.choice(_CODE_ALPHABET) for _ in range(_CODE_LEN))

            if code not in existing:
                return code

    def create_match(self) -> Match:
        match = Match(code=self.make_room_code())
        self._store.add(match)

        return match

    def find_open_match(self, code: str) -> Match | None:
        """Return a joinable match for `code`, or None if missing/full."""
        match = self._store.get((code or "").strip().upper())

        if not match or match.is_full():
            return None

        return match
