# Architecture

Word Duel Palace is a thin React client driven by an **authoritative** FastAPI
server. All rules, validation, randomness, and timing live on the server; the
client only renders state and sends intents.

## Components

```
┌─────────────────────────────┐         ┌────────────────────────────────────────┐
│            Browser           │         │              FastAPI server             │
│                             │  WSS/WS  │   app package (Services container)       │
│  App.jsx ── net.js ─────────┼─────────►│  realtime: /ws gateway + ConnectionHub   │
│   │  routes screens          │   JSON   │       │ matchmaking → persistence (store)│
│   ├─ Home / Lobby / Game     │◄─────────┼───────┤ match: Match / Player            │
│   ├─ dict.js  ◄── /api/words │   HTTP   │       │ rules: tiles · scoring · dict    │
│   └─ audio.js (Web Audio)    │          │  jobs: ticker (timeouts + bot moves)     │
│  state → React render        │          │  ai: BotEngine (anagram index)           │
└─────────────────────────────┘          └────────────────────────────────────────┘
```

- **`net.js`** keeps one WebSocket to `/ws` (derived from `location.host`) and a
  small pub/sub. Messages sent before the socket opens are queued.
- **`App.jsx`** holds the connection, the latest `state` snapshot, and the
  `playerId`, and routes to Home / Lobby / Game based on `state.phase`.
- **`Services`** (server) is the single container wiring every module together;
  it holds the one `asyncio.Lock` that guards all state mutation so the gateway
  and the background ticker never race.
- **`ConnectionHub`** (`app.realtime`) maps player ids → sockets; the
  **`MatchStore`** (`app.persistence`) maps room codes → `Match` and player ids →
  match.
- **`Match`/`Player`** (`app.match`) are plain dataclasses holding the entire game
  state and the logic to mutate it.

## Data flow

1. **Identity:** client sends `create`/`join`; server replies `created`/`joined`
   with a `roomId` and a private `playerId`.
2. **Snapshots:** after every change the server sends each player a **personalized**
   `state` message — your full rack, but only a *count* of the opponent's rack.
   The client is a pure function of this snapshot.
3. **Effects:** alongside `state`, the server emits transient `fx` events
   (`play`, `invalid`, `burn`) that the client turns into animations/sounds. They
   carry no authority — losing one only skips an animation.
4. **Intents:** the client sends `submit` / `pass` / `rematch` / `add_bot`. The
   server validates and applies them, then broadcasts new state.

See [PROTOCOL.md](PROTOCOL.md) for exact message shapes.

## The ticker

A single `asyncio` task (`app.jobs.run_ticker`) wakes ~twice a second and, per
playing match:

- if it is a **bot's** turn and its think-timer elapsed → ask the `BotEngine`
  for a move and apply it;
- otherwise, if the 45-second turn clock expired → skip the turn (timeout).

Because it shares the `Services` lock with the WebSocket gateway, timeouts and
bot moves are serialized with player actions.

## Why server-authoritative

The client computes a *preview* of damage and a *convenience* word check (via the
downloaded dictionary) purely for UX. The server independently re-checks turn
ownership, tile availability, dictionary membership, and recomputes damage on
every `submit`. A tampered client cannot play tiles it doesn't have, play out of
turn, submit non-words, or inflate damage.

## Frontend module map

| Module | Role |
|---|---|
| `App.jsx` | connection, screen routing, audio reactions, action dispatch |
| `components/Home.jsx` | name entry, create/join, "duel the Palace AI" buttons |
| `components/Lobby.jsx` | room code + copy, add-a-bot, waiting state |
| `components/Game.jsx` | the arena: rack, spell building, validation, casting, effects, overlays |
| `components/Character.jsx` | original SVG mage (two colour variants) |
| `components/Tile.jsx` | a wooden tile: value, modifier, hover tooltip, animations |
| `net.js` / `dict.js` / `audio.js` | networking / word check / sound |

## Backend module map

The backend is a modular package (`app/`); `main.py` is a thin entrypoint
(`app = create_app()`). `app/factory.py` assembles everything; `app/services.py`
is the dependency container threaded into the gateway, API and ticker.

| Module | Role |
|---|---|
| `app/auth` | Anonymous player/bot ids (ids double as session tokens), name validation |
| `app/matchmaking` | Room-code generation, match creation & lookup (`Matchmaker`) |
| `app/match` | `Match` + `Player`: tiles, damage, turns, effects, win, rematch, serialization |
| `app/rules` | Pure game defs: constants, tile gen/balancing, damage scoring, `Dictionary` |
| `app/persistence` | `MatchStore` — in-memory registry of matches and player→match bindings |
| `app/realtime` | `/ws` gateway (message router) + `ConnectionHub` (sockets) |
| `app/jobs` | Background ticker: turn timeouts + bot move scheduling |
| `app/ai` | `BotEngine`: anagram-index word search + difficulty-based selection |
| `app/api` | HTTP `/api/health`, `/api/words`, static frontend mount |
| `app/config.py`·`services.py`·`factory.py` | Settings, the wired `Services` container, `create_app()` |
