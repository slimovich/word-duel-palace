"""Service container — the wired-together dependencies shared across modules.

A single `Services` instance is built once in the app factory and threaded into
the gateway, the API routes and the background ticker. It keeps construction in
one place and makes dependencies explicit: nothing reaches for a global.

The `lock` is the one asyncio mutex guarding all match-state mutation. Both the
gateway (player actions) and the ticker (timeouts, bot moves) acquire it, so
state is only ever touched by one coroutine at a time.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

from app.ai import BotEngine
from app.config import Settings
from app.config import settings as default_settings
from app.matchmaking import Matchmaker
from app.persistence import MatchStore
from app.realtime import ConnectionHub
from app.rules import Dictionary

logger = logging.getLogger(__name__)


@dataclass
class Services:
    settings: Settings
    dictionary: Dictionary
    store: MatchStore
    matchmaker: Matchmaker
    bot: BotEngine
    hub: ConnectionHub
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @classmethod
    def build(cls, settings: Settings | None = None) -> "Services":
        settings = settings or default_settings
        dictionary = Dictionary.load(settings.WORDS_FILE)
        logger.info("loaded %d words, %d anagram keys", len(dictionary), dictionary.anagram_count)
        store = MatchStore()

        return cls(
            settings=settings,
            dictionary=dictionary,
            store=store,
            matchmaker=Matchmaker(store),
            bot=BotEngine(dictionary),
            hub=ConnectionHub(),
        )
