"""Word Duel Palace backend — a modular, server-authoritative game server.

Modules:
  auth         - anonymous player/bot identity and name validation
  matchmaking  - room codes, match creation and lookup
  match        - the live duel (Match) and its players (Player)
  rules        - pure game definitions: constants, tiles, scoring, dictionary
  persistence  - the in-memory match store
  realtime     - the WebSocket gateway and connection hub
  jobs         - the background turn/bot ticker
  ai           - the bot opponent engine
  api          - HTTP health/word endpoints and static frontend mounting

`create_app()` (in factory.py) wires them together.
"""

from app.factory import create_app  # noqa: F401
