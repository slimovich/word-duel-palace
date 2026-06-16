"""Match module — a single duelist's authoritative state.

A Player owns HP, shield, pending burn and a tile rack. Rack generation and
balancing live in the rules module; this class is just the stateful holder plus
the two operations the match performs on a player: filling the rack and taking
damage (through shield first).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.rules import MAX_HP, fill_rack


@dataclass
class Player:
    pid: str
    name: str
    hp: int = MAX_HP
    shield: int = 0
    pending_burn: int = 0
    rack: list[dict] = field(default_factory=list)
    connected: bool = True
    is_bot: bool = False
    difficulty: str = "medium"  # easy | medium | hard (bots only)

    def fill_rack(self) -> None:
        """Top the rack up to RACK_SIZE and keep it balanced."""
        fill_rack(self.rack)

    def take_damage(self, amount: int) -> int:
        """Apply damage through shield first. Returns hp actually lost."""

        if self.shield > 0:
            absorbed = min(self.shield, amount)
            self.shield -= absorbed
            amount -= absorbed

        before = self.hp
        self.hp = max(0, self.hp - amount)

        return before - self.hp
