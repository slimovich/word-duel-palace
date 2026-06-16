# Word Duel Palace — Frontend

The React + Vite client: a side-view battle arena with two hand-drawn SVG mages,
the tile rack, original synthesized audio, and all the visual effects. It renders
whatever state the server sends and forwards player intents over a WebSocket —
it holds **no authoritative game logic**.

## Files

| File | Responsibility |
|---|---|
| `src/main.jsx` | React entry point. |
| `src/App.jsx` | Connects the WebSocket, routes between Home / Lobby / Game screens, wires audio reactions to game events, exposes actions (create, join, vs-bot, submit, pass, rematch). |
| `src/net.js` | Tiny WebSocket client (same-origin `/ws`) with a pub/sub + send-queue. |
| `src/dict.js` | Loads `/api/words` once and exposes a live `checkWord()` for the Cast-button gating. The server still re-validates. |
| `src/audio.js` | All sound effects and the background music, synthesized at runtime with the Web Audio API (no audio files). |
| `src/styles.css` | The entire theme: arena, tiles, characters, animations, effects. |
| `src/components/` | `Home`, `Lobby`, `Game`, `Character` (SVG mage), `Tile`, `BattleLog`, `HpBar`, `TopBar`. |

## Run

```bash
make install     # npm install
make build       # production build into dist/  (served by the backend)
make dev         # Vite dev server on :5173, proxying /ws + /api to the backend
```

> Uses `nvm use 22` automatically when nvm is present, so a modern Node is used
> even if your default `node` is older.

## Two ways to run

1. **Single-origin (recommended for play):** `make build`, then the backend
   serves `dist/` at `/`. Open `http://localhost:8000`.
2. **Dev mode (hot reload):** run the backend (`make backend` in `../backend`)
   and `make dev` here. Vite serves the UI on `:5173` and proxies `/ws` and
   `/api` to `:8000` (see `vite.config.js`).

The WebSocket URL is derived from `location.host`, so the same build works on
`localhost`, a LAN IP, or behind a proxy with no configuration.

## Effects & audio (all original)

- **Tile interaction:** picked tiles fly up from the rack; on cast each tile
  dissolves into a staggered puff of smoke and the spell box empties.
- **Combat:** a spell bolt flies between mages, the attacker lunges, the defender
  staggers, and damage bursts out as bold red numbers; HP bars shake and recolor
  (green / yellow / red).
- **Audio:** wooden taps, a magical chime, error thunk, impact, low-HP pulse,
  victory/defeat stingers, a ticking timer, and a toggleable music loop — every
  sound is generated with oscillators and filtered noise at runtime.

See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for how the client
consumes server state and `fx` events.
