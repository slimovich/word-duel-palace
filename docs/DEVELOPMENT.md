# Development

## Prerequisites

- **Python 3.13** (any 3.11+ interpreter works, but the backend's `.venv` is
  built with 3.13) and **[Poetry](https://python-poetry.org/)** for dependency
  management (`brew install poetry`, or see Poetry's install docs).
- **Node 18+** (Node 22 recommended). If you use `nvm`, the Makefiles run
  `nvm use 22` automatically for frontend commands.
- GNU **make**.

## Install

```bash
make install        # backend (poetry install -> backend/.venv) + frontend (npm) dependencies
```

The backend's `poetry.toml` sets `virtualenvs.in-project = true`, so
`poetry install` creates `backend/.venv` rather than a venv in Poetry's global
cache — the Makefile's `PYTHON` variable points straight at it.

Or per side:

```bash
make backend-install
make frontend-install
```

## Run (single origin — recommended)

Builds the frontend and serves both the UI and the WebSocket from one process:

```bash
make run            # http://localhost:8000  (binds 0.0.0.0 by default)
```

Override host/port:

```bash
make run HOST=127.0.0.1 PORT=9000
```

Open the URL in **two browser tabs** to test a 2-player match, or click an AI
difficulty on the home screen for solo play.

## Run (dev mode — hot reload)

Two terminals:

```bash
make backend        # FastAPI with --reload on :8000
make frontend       # Vite dev server on :5173
```

Vite proxies `/ws` and `/api` to `:8000` (see `frontend/vite.config.js`), so open
**`http://localhost:5173`**. Frontend edits hot-reload; backend edits reload via
uvicorn. (`make dev` just prints this reminder.)

## LAN / multi-device play

The server binds `0.0.0.0`, so other devices on the same network can reach it:

1. Find this machine's LAN IP (macOS: `ipconfig getifaddr en0`).
2. On the other device (same Wi-Fi, **not** a guest network), open
   `http://<that-ip>:8000`.
3. One side **Create Game**, the other **Join Game** with the code.

The WebSocket uses `location.host`, so no extra configuration is needed. If a
device can't connect: confirm the same network, use `http://` with the `:8000`
port, and (rarely) allow incoming connections if a firewall is enabled.

## Tests & smoke checks

```bash
make test                       # backend imports + dictionary load
curl -s localhost:8000/api/health
```

The backend logic is plain dataclasses, so it's easy to exercise directly:

```bash
cd backend
python3 -c "from app.match import Match; r=Match('T'); a=r.add_player('A'); b=r.add_bot('hard'); \
            r.start(); print('turn=A:', r.turn_pid==a.pid, '| racks:', len(a.rack), len(b.rack))"
```

## The dictionary

`backend/words.txt` is the **ENABLE** word list (public domain), filtered to
lowercase 2–7 letter words. To regenerate from a source list:

```bash
cd backend
python3 - <<'PY'
out = sorted({w.strip() for w in open("source.txt")
              if 2 <= len(w.strip()) <= 7 and w.strip().isalpha() and w.strip().islower()})
open("words.txt", "w").write("\n".join(out))
print(len(out), "words")
PY
```

The previous macOS `web2`-derived list is kept at `backend/words.web2.bak.txt`.

## Common tasks

| I want to… | Where |
|---|---|
| Change HP, rack size, turn length, damage | `backend/app/rules/constants.py` |
| Tune tile/modifier rates or the letter bag | `backend/app/rules/constants.py` (`LETTER_WEIGHTS`) + `app/rules/tiles.py` (`_MOD_TABLE`) |
| Adjust bot strength or think time | `backend/app/rules/constants.py` (`BOT_THINK`) + `backend/app/ai/bot.py` (`choose_move`) |
| Tweak visuals/animations | `frontend/src/styles.css` |
| Change a sound | `frontend/src/audio.js` |
| Add a WebSocket message | `backend/app/realtime/gateway.py` (`_handle_message`) + `frontend/src/App.jsx` |

## Cleaning

```bash
make clean          # remove frontend/dist + Python caches
make clean-all      # also remove node_modules
```
