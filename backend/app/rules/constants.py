"""Game rules — tuning constants. Pure data, no dependencies."""

from __future__ import annotations

import random

# Core
MAX_HP = 40
RACK_SIZE = 7
MIN_WORD_LEN = 2
TURN_SECONDS = 45

# Rare-letter damage bonuses (added to that single letter's contribution).
RARE_BONUS = {
    "J": 3,
    "Q": 3,
    "X": 3,
    "Z": 3,
    "K": 1,
    "V": 1,
    "W": 1,
    "Y": 1,
}

# Weighted letter bag (loosely English frequency). Values are relative weights.
LETTER_WEIGHTS = {
    "E": 12,
    "A": 9,
    "R": 9,
    "I": 9,
    "O": 8,
    "T": 8,
    "N": 7,
    "S": 7,
    "L": 6,
    "C": 5,
    "U": 5,
    "D": 5,
    "P": 4,
    "M": 4,
    "H": 4,
    "G": 3,
    "B": 3,
    "F": 3,
    "Y": 3,
    "W": 2,
    "K": 2,
    "V": 2,
    "X": 1,
    "Z": 1,
    "J": 1,
    "Q": 1,
}

VOWELS = set("AEIOU")

# A rack keeps at least this many of each so a word is (almost) always spellable.
MIN_VOWELS = 2
MIN_CONSONANTS = 2

# Tile modifiers (enchanted tiles). ~14% of fresh tiles are special.
MOD_NONE = None
MOD_DOUBLE = "x2"  # doubles this letter's damage contribution
MOD_SHIELD = "shield"  # valid word grants +SHIELD_GAIN shield
MOD_BURN = "burn"  # opponent takes +BURN_DAMAGE at the start of their turn

SHIELD_GAIN = 3
BURN_DAMAGE = 2

# Bot tuning
BOT_THINK = {  # think time per difficulty (seconds, random range)
    "easy": (2.4, 4.0),
    "medium": (1.6, 2.8),
    "hard": (1.0, 1.9),
}
BOT_NAMES = {"easy": "Apprentice", "medium": "Sorcerer", "hard": "Archmage"}


def bot_think_time(difficulty: str) -> float:
    lo, hi = BOT_THINK.get(difficulty, BOT_THINK["medium"])

    return random.uniform(lo, hi)
