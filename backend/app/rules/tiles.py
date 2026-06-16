"""Game rules — tile generation and rack balancing."""

from __future__ import annotations

import random
import uuid

from app.rules.constants import (
    LETTER_WEIGHTS,
    MIN_CONSONANTS,
    MIN_VOWELS,
    MOD_BURN,
    MOD_DOUBLE,
    MOD_NONE,
    MOD_SHIELD,
    RACK_SIZE,
    VOWELS,
)

_LETTERS = list(LETTER_WEIGHTS.keys())
_WEIGHTS = list(LETTER_WEIGHTS.values())
_VOWELS = [letter for letter in _LETTERS if letter in VOWELS]
_VOWEL_W = [LETTER_WEIGHTS[letter] for letter in _VOWELS]
_CONS = [letter for letter in _LETTERS if letter not in VOWELS]
_CONS_W = [LETTER_WEIGHTS[letter] for letter in _CONS]

# Modifier draw table: ~86% plain, 6% x2, 4% shield, 4% burn.
_MOD_TABLE = [MOD_NONE] * 86 + [MOD_DOUBLE] * 6 + [MOD_SHIELD] * 4 + [MOD_BURN] * 4


def random_letter(kind: str | None = None) -> str:
    if kind == "vowel":
        return random.choices(_VOWELS, weights=_VOWEL_W, k=1)[0]

    if kind == "consonant":
        return random.choices(_CONS, weights=_CONS_W, k=1)[0]

    return random.choices(_LETTERS, weights=_WEIGHTS, k=1)[0]


def new_tile(kind: str | None = None) -> dict:
    return {
        "id": uuid.uuid4().hex[:8],
        "letter": random_letter(kind),
        "mod": random.choice(_MOD_TABLE),
    }


def balance_rack(rack: list[dict]) -> None:
    """Mutate `rack` so it keeps >= MIN_VOWELS vowels and MIN_CONSONANTS
    consonants, by re-lettering surplus tiles (ids and mods are preserved)."""

    def vowels():
        return [t for t in rack if t["letter"] in VOWELS]

    def consonants():
        return [t for t in rack if t["letter"] not in VOWELS]

    v, c = vowels(), consonants()

    while len(v) < MIN_VOWELS and len(c) > MIN_CONSONANTS:
        c[-1]["letter"] = random_letter("vowel")
        v, c = vowels(), consonants()

    while len(c) < MIN_CONSONANTS and len(v) > MIN_VOWELS:
        v[-1]["letter"] = random_letter("consonant")
        v, c = vowels(), consonants()


def fill_rack(rack: list[dict]) -> None:
    """Top a rack up to RACK_SIZE tiles, then balance it."""

    while len(rack) < RACK_SIZE:
        rack.append(new_tile())

    balance_rack(rack)
