"""Game rules — damage scoring."""

from __future__ import annotations

from app.rules.constants import MOD_DOUBLE, RARE_BONUS


def compute_damage(tiles: list[dict]) -> tuple[int, dict]:
    """
    Returns (total_damage, breakdown).

    Per-tile contribution = (1 + rare bonus for that letter), doubled if the
    tile carries an x2 modifier. Word-length bonuses are added on top of the
    summed tile contributions.
    """
    per_tile = 0
    rare_total = 0

    for t in tiles:
        letter = t["letter"].upper()
        contrib = 1 + RARE_BONUS.get(letter, 0)
        rare_total += RARE_BONUS.get(letter, 0)

        if t.get("mod") == MOD_DOUBLE:
            contrib *= 2

        per_tile += contrib

    length = len(tiles)
    length_bonus = 0

    if length >= 7:
        length_bonus += 5

    if length >= 5:
        length_bonus += 2

    total = per_tile + length_bonus
    breakdown = {
        "base": length,
        "rare": rare_total,
        "length_bonus": length_bonus,
        "doubled": any(t.get("mod") == MOD_DOUBLE for t in tiles),
        "total": total,
    }

    return total, breakdown
