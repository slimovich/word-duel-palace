# Word Duel Palace — Backend

The **authoritative game server**: FastAPI + a single WebSocket endpoint that
carries all real-time traffic. It owns every piece of game state (matches,
players, turns, racks, HP, shields, burn, the dictionary, timers, and the bot
AI). The client renders state and sends intents; it is never trusted with rules.

The code is organized as a small **modular package** (`app/`); `main.py` is a
thin entrypoint kept so `uvicorn main:app` still works.

## Layout

```
main.py                # entrypoint: `app = create_app()`
app/
  config.py            # paths/tunables (Settings)
  services.py          # Services container — builds & wires every module
  factory.py           # create_app(): assembles routes, ticker, static mount
  auth/                # anonymous player/bot ids, name validation
  matchmaking/         # room codes, match creation/lookup (Matchmaker)
  match/               # the live duel — Match + Player
  rules/               # pure game defs: constants, tiles, scoring, dictionary
  persistence/         # in-memory MatchStore (code→match, player→match)
  realtime/            # WebSocket gateway + ConnectionHub
  jobs/                # background turn/bot ticker
  ai/                  # bot opponent engine (anagram search + difficulty)
  api/                 # HTTP /api/health, /api/words, static frontend mount
```

| Module | Responsibility |
|---|---|
| `app.auth` | Mint unguessable player ids (also session tokens) and bot ids; trim/cap display names. |
| `app.matchmaking` | Generate collision-free 5-char room codes; create matches; find an open match by code. |
| `app.match` | `Match` (live duel) + `Player`: turns, casting, shields/burn/×2, win detection, rematch, JSON serialization. |
| `app.rules` | Pure, dependency-free game logic: constants, tile generation/balancing, damage scoring, the `Dictionary`. |
| `app.persistence` | `MatchStore` — the single source of truth for which matches exist and who is in them. In-memory; swappable. |
| `app.realtime` | `ConnectionHub` (sockets) + the `/ws` gateway that routes inbound frames to domain calls. |
| `app.jobs` | The 2 Hz ticker: auto-passes expired turns and fires bot moves. |
| `app.ai` | `BotEngine` — finds playable words via the dictionary's anagram index and picks one by difficulty. |
| `app.api` | HTTP health/word endpoints; mounts the built frontend last. |
| `words.txt` | Bundled dictionary — the ENABLE word list filtered to 2–7 letter lowercase words (~51.9k). Loaded into a `set` at startup. |
| `words.web2.bak.txt` | The previous macOS `web2`-derived list, kept as a backup. |
| `pyproject.toml` / `poetry.lock` | Dependencies (`fastapi`, `uvicorn[standard]`, `websockets`) and dev tooling (pytest, black, isort, flake8, pymarkdown, coverage), managed by [Poetry](https://python-poetry.org/). |

## Run

Dependencies are managed by **Poetry**, installed into an in-project `.venv`
(Python 3.13) — `poetry.toml` here sets `virtualenvs.in-project = true` so
that's where `poetry install` puts it, and the Makefile points straight at it.

```bash
make install      # poetry install  ->  backend/.venv
make run          # uvicorn main:app --host 0.0.0.0 --port 8000
make dev          # same, with --reload
```

Override host/port: `make run HOST=127.0.0.1 PORT=9000`.
Override the interpreter: `make run PYTHON=python3`.
Override the Poetry binary: `make install POETRY=/path/to/poetry`.

`.venv/` is gitignored — each clone creates its own via `make install`.

## Dev tooling

```bash
make pytest          # pytest + coverage report
make lint             # flake8
make format            # isort + black (writes changes)
make format-check       # isort + black, check only
make markdown-lint        # pymarkdown over the project's docs
```

All of these read their settings from `pyproject.toml` (`[tool.pytest.ini_options]`,
`[tool.flake8]` via the `Flake8-pyproject` plugin, `[tool.black]`, `[tool.isort]`,
`[tool.coverage.*]`, `[tool.pymarkdown]`).

The server serves `../frontend/dist` at `/` when that build exists, so a single
process hosts both the UI and the WebSocket. If there is no build, `/` returns a
short JSON notice instead.

## HTTP endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | `{ ok, words, rooms }` liveness + counts. |
| `GET` | `/api/words` | Newline-separated dictionary for the client's live word check. The server still re-validates every submission. |
| `WS` | `/ws` | All game traffic. See [`../docs/PROTOCOL.md`](../docs/PROTOCOL.md). |
| `GET` | `/*` | Static frontend (when built). |

## How the authoritative loop works

1. A client connects to `/ws` and sends `create` or `join`. The gateway
   (`app.realtime`) routes the frame to the matchmaker/store.
2. When two players are present (human + human, or human + bot), the match
   `start()`s: racks are dealt and the first turn begins.
3. On `submit`, the `Match` checks **it is your turn**, **the tiles are in your
   rack**, **the word is in the dictionary**, and computes damage itself.
4. A background ticker (`app.jobs.run_ticker`) enforces the 45-second turn limit
   and drives bot moves; it runs under the single `asyncio.Lock` held on the
   `Services` container and shared with the gateway, so state mutations never race.
5. After every change the server broadcasts a **personalized** `state` snapshot
   to each player (your full rack; the opponent's rack is only a count) plus
   transient `fx` events for animations.

## Bot AI

Bots are server-side `Player`s with `is_bot=True` and a `difficulty`, driven by
`app.ai.BotEngine`. On a bot's turn the ticker waits a difficulty-dependent
"think time", then asks the engine for a move:

- **Word search** uses an **anagram index** built at startup (`sorted-letters →
  a word`). For a rack it checks letter *combinations* (≤99 for 7 tiles) instead
  of permutations, so finding every playable word takes well under a millisecond.
- **Move selection** by difficulty:
  - **easy** → a weaker word from the bottom half, and a 15% chance to fumble (pass);
  - **medium** → a strong-but-not-optimal word (~70th percentile by damage);
  - **hard** → the maximum-damage word, exploiting ×2/burn tiles.

Bots never disconnect and auto-accept rematches.

See [`../docs/GAMEPLAY.md`](../docs/GAMEPLAY.md) for the damage formula and tile
effects, and [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the bigger
picture.
