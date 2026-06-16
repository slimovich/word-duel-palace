"""Game rules module — pure, dependency-free game definitions.

Exposes constants, tile generation, damage scoring, and the dictionary.
"""

from app.rules.constants import (  # noqa: F401
    BOT_NAMES,
    BOT_THINK,
    BURN_DAMAGE,
    LETTER_WEIGHTS,
    MAX_HP,
    MIN_WORD_LEN,
    MOD_BURN,
    MOD_DOUBLE,
    MOD_NONE,
    MOD_SHIELD,
    RACK_SIZE,
    RARE_BONUS,
    SHIELD_GAIN,
    TURN_SECONDS,
    VOWELS,
    bot_think_time,
)
from app.rules.dictionary import Dictionary  # noqa: F401
from app.rules.scoring import compute_damage  # noqa: F401
from app.rules.tiles import balance_rack, fill_rack, new_tile, random_letter  # noqa: F401
