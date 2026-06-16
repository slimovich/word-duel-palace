"""Auth / identity module.

The game is anonymous — there are no passwords. "Auth" here means **identity**:
minting unguessable player ids, naming bots, and validating display names. A
player's id, returned only to that player on create/join, doubles as their
session secret: every action is checked against the connection that owns it.
"""

from __future__ import annotations

import uuid

MAX_NAME_LEN = 16


def new_player_id() -> str:
    """An unguessable id for a human player (also acts as a session token)."""

    return uuid.uuid4().hex[:12]


def new_bot_id() -> str:
    """A clearly-marked id for a bot player."""

    return "bot_" + uuid.uuid4().hex[:8]


def sanitize_name(name: str | None) -> str:
    """Trim and cap a submitted display name. May return ''. The caller
    supplies a fallback (e.g. "Player 2") when empty."""

    return (name or "").strip()[:MAX_NAME_LEN]
