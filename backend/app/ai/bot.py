"""AI module — the bot opponent.

When no second human is available a player can duel a bot. The BotEngine finds
every word a rack can spell (via the dictionary's anagram index, checking letter
*combinations* rather than permutations) and picks one according to difficulty:

  easy   - a weak word, and sometimes fumbles the turn entirely
  medium - a strong-ish but non-optimal word
  hard   - always the highest-damage word

The engine is pure: it reads a rack and returns ordered tile ids (or None to
pass). The match applies the move; the ticker decides when.
"""

from __future__ import annotations

import itertools
import random

from app.match import Player
from app.rules import MIN_WORD_LEN, Dictionary, compute_damage


class BotEngine:
    def __init__(self, dictionary: Dictionary) -> None:
        self._dict = dictionary

    @staticmethod
    def _order_tiles_for_word(tiles: list[dict], word: str) -> list[str]:
        """Return tile ids ordered so their letters spell `word`."""
        pool: dict[str, list[str]] = {}

        for t in tiles:
            pool.setdefault(t["letter"].lower(), []).append(t["id"])

        return [pool[ch].pop() for ch in word]

    def find_valid_moves(self, rack: list[dict]) -> list[tuple[list[str], int]]:
        """All playable words from a rack as (ordered_tile_ids, damage)."""
        moves: list[tuple[list[str], int]] = []
        n = len(rack)

        for r in range(MIN_WORD_LEN, n + 1):
            for combo in itertools.combinations(range(n), r):
                tiles = [rack[i] for i in combo]
                key = "".join(sorted(t["letter"].lower() for t in tiles))
                word = self._dict.anagram(key)

                if word:
                    ids = self._order_tiles_for_word(tiles, word)
                    dmg, _ = compute_damage(tiles)
                    moves.append((ids, dmg))

        return moves

    def choose_move(self, bot: Player) -> list[str] | None:
        """Pick tile ids for the bot to play, or None to pass, by difficulty."""
        moves = self.find_valid_moves(bot.rack)

        if not moves:
            return None

        moves.sort(key=lambda m: m[1])  # ascending damage
        diff = bot.difficulty

        if diff == "easy":
            if random.random() < 0.15:
                return None  # easy bot sometimes fumbles its turn

            pool = moves[: max(1, len(moves) // 2)]  # weaker half
            return random.choice(pool)[0]

        if diff == "hard":
            return moves[-1][0]  # strongest word

        # medium: a strong-ish but not optimal word
        idx = min(len(moves) - 1, int(len(moves) * 0.7))

        return moves[idx][0]
