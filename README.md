# Word Duel Palace

A browser-based, real-time **2-player online word battle** game. Forge words
from enchanted wooden tiles to out-spell your rival and drain their HP to zero —
or duel the **Palace AI** solo across three difficulties.

> Original theme, art, names, sounds, and code. The visual style is a cozy
> wooden-tiles / parchment / fantasy-classroom motif, and the two duelist mages
> are hand-drawn SVG. Nothing is copied from any existing game.

```
┌──────────────────────────────────────────────────────────────┐
│  React + Vite frontend  ──HTTP/WebSocket──►  FastAPI backend   │
│  (battle arena, audio,        /ws            (authoritative:    │
│   effects, tooltips)        /api/*            rooms, turns,     │
│                                               racks, HP, dict,  │
│                                               timers, bot AI)   │
└──────────────────────────────────────────────────────────────┘
```

## Features

- **Real-time multiplayer** over WebSockets with a fully **server-authoritative**
  game state (the client is never trusted with rules or validation).
- **Room codes** (skribbl.io-style): create a game, share a 5-char code, opponent joins.
- **Solo vs AI** with three difficulties — **Easy** (Apprentice), **Medium**
  (Sorcerer), **Hard** (Archmage).
- **Enchanted tiles**: Gilded (×2 damage), Warding (+3 shield), Ember (burn).
- **Live feedback**: per-tile point values, running damage total, and a
  client-side "✓ valid / ✗ not a word" check that gates the Cast button.
- **Juicy effects**: tiles fly up when picked and dissolve into smoke on cast,
  spell bolts fly between mages, damage bursts, HP-bar shakes, and original
  Web-Audio sound effects + music (no audio files).
- **Side-view battle arena** with two animated mages, hearts/HP, and a battle log.

## Quick start

Requires **Python 3.11+** and **Node 18+** (Node 22 recommended).

```bash
make install     # install backend (pip) + frontend (npm) deps
make run         # build the frontend and serve everything on http://localhost:8000
```

Open <http://localhost:8000> in two browser tabs to test a 2-player match, or
click an AI difficulty on the home screen to play solo.

For **LAN play** (e.g. phone + laptop on the same Wi-Fi), the server already
binds `0.0.0.0`, so open `http://<your-LAN-IP>:8000` on the other device.

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for dev mode, ports, and tips.

## Repository layout

```
word-duel-palace/
├── Makefile              # root automation (drives both sides)
├── README.md             # this file
├── docs/                 # documentation
│   ├── ARCHITECTURE.md   # how the pieces fit together
│   ├── GAMEPLAY.md       # rules, damage, tiles, AI difficulties
│   ├── PROTOCOL.md       # WebSocket + HTTP message reference
│   └── DEVELOPMENT.md    # setup, running, LAN, testing
├── backend/              # FastAPI server (authoritative game logic)
│   ├── main.py           # thin entrypoint: app = create_app()
│   ├── app/              # modular package
│   │   ├── factory.py    # create_app(): wiring  ·  services.py: container
│   │   ├── auth/         # player/bot identity, name validation
│   │   ├── matchmaking/  # room codes, match creation/lookup
│   │   ├── match/        # Match + Player: turns, casting, win, serialization
│   │   ├── rules/        # constants, tiles, scoring, dictionary (pure)
│   │   ├── persistence/  # in-memory MatchStore
│   │   ├── realtime/     # /ws gateway + ConnectionHub
│   │   ├── jobs/         # background turn/bot ticker
│   │   ├── ai/           # bot opponent engine
│   │   └── api/          # HTTP endpoints + static frontend mount
│   ├── words.txt         # bundled dictionary (ENABLE, 2–7 letters)
│   ├── pyproject.toml    # Poetry deps + pytest/black/isort/flake8/pymarkdown config
│   ├── poetry.lock
│   ├── tests/
│   ├── Makefile
│   └── README.md
└── frontend/             # React + Vite client
    ├── src/
    │   ├── App.jsx       # screen routing + networking glue
    │   ├── net.js        # WebSocket client
    │   ├── dict.js       # client-side word validation
    │   ├── audio.js      # synthesized SFX + music
    │   ├── styles.css    # the whole theme
    │   └── components/   # Home, Lobby, Game, Character, Tile, …
    ├── vite.config.js
    ├── Makefile
    └── README.md
```

## Make targets

| Target | What it does |
|---|---|
| `make install` | Install backend + frontend dependencies |
| `make run` | Build the frontend, then serve the app on `HOST:PORT` (default `0.0.0.0:8000`) |
| `make backend` | Run the backend only (autoreload), serving an existing build |
| `make frontend` | Run the Vite dev server (proxies `/ws` + `/api` to the backend) |
| `make build` | Build the frontend into `frontend/dist` |
| `make test` | Smoke-test the backend (imports + dictionary) |
| `make clean` | Remove build artifacts and Python caches |

Override host/port: `make run HOST=127.0.0.1 PORT=9000`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — components, data flow, state model.
- [Gameplay](docs/GAMEPLAY.md) — full rules, damage formula, enchanted tiles, AI.
- [Protocol](docs/PROTOCOL.md) — every WebSocket and HTTP message.
- [Development](docs/DEVELOPMENT.md) — running locally, dev mode, LAN, testing.

## Tech stack

- **Frontend:** React 18, Vite 5, plain CSS, Web Audio API.
- **Backend:** FastAPI, Uvicorn, `websockets`.
- **Dictionary:** ENABLE word list (public domain), filtered to 2–7 letters.
