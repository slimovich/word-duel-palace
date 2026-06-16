# Protocol

All real-time traffic flows over a single WebSocket at **`/ws`**. Every message
is a JSON object with a `type` field. Two HTTP endpoints support it.

## HTTP

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/health` | `{ "ok": true, "words": 51852, "rooms": 0 }` |
| `GET` | `/api/words` | `text/plain`, newline-separated dictionary (for the client's live word check). |
| `WS` | `/ws` | The game socket (below). |

## Client → Server

| `type` | Fields | Meaning |
|---|---|---|
| `create` | `name`, `bot?` | Create a room. If `bot` is `"easy"`/`"medium"`/`"hard"`, a bot opponent is added and the match starts immediately. |
| `join` | `roomId`, `name` | Join an existing room by 5-char code. |
| `add_bot` | `difficulty` | While waiting in a room you created, fill the open slot with a bot and start. |
| `submit` | `tiles: [tileId, …]` | Play a word formed by these rack tiles, in order. |
| `pass` | — | Skip your turn. |
| `rematch` | — | Mark yourself ready for a rematch after a game ends. |
| `ping` | — | Keep-alive; server replies `pong`. |

`name` is trimmed to 16 chars. `roomId` is case-insensitive on the wire.

## Server → Client

| `type` | Fields | Meaning |
|---|---|---|
| `created` | `roomId`, `playerId` | You created the room; `playerId` is your private id. |
| `joined` | `roomId`, `playerId` | You joined successfully. |
| `state` | (full snapshot, below) | Authoritative, personalized game state. Sent after every change. |
| `fx` | `events: [...]` | Transient animation/sound cues (below). |
| `error` | `message` | Non-fatal problem (e.g. "Room not found", "Room is full"). |
| `pong` | — | Reply to `ping`. |

### `state` snapshot

```jsonc
{
  "type": "state",
  "phase": "waiting" | "playing" | "gameover",
  "roomId": "X7K2P",
  "turnPid": "abc123…",          // id of the player whose turn it is (or null)
  "turnEndsAt": 1718500000000,   // epoch ms the turn clock expires
  "turnRemaining": 41.3,         // seconds left at send time
  "turnSeconds": 45,             // full turn length
  "winner": null,                // playerId when phase == "gameover", else null
  "log": [ { "text": "…", "kind": "play|warn|burn|system|info" } ],

  "you": {
    "id": "abc123…", "name": "Merlin",
    "hp": 40, "maxHp": 40, "shield": 0, "pendingBurn": 0,
    "rack": [ { "id": "9f2a1c0b", "letter": "E", "mod": null } ],
    "yourTurn": true, "connected": true, "rematchReady": false
  },

  "opp": {
    "id": "def456…", "name": "Morgana",
    "hp": 33, "maxHp": 40, "shield": 0, "pendingBurn": 0,
    "rackCount": 7,               // opponent's rack is hidden — only a count
    "connected": true, "rematchReady": false
  }
}
```

`you.rack` reveals your own tiles only. A tile is `{ id, letter, mod }` where
`mod` is `null`, `"x2"`, `"shield"`, or `"burn"`.

### `fx` events

Sent in batches: `{ "type": "fx", "events": [ … ] }`. The client uses them only
to drive animations and sounds — they carry no authority.

```jsonc
// a valid word was cast
{ "type": "play", "by": "<casterPid>", "target": "<opponentPid>",
  "word": "CROWN", "damage": 8,
  "breakdown": { "base": 5, "rare": 1, "length_bonus": 2,
                 "doubled": false, "total": 8 },
  "shield": 0, "burn": 0 }

// an invalid word was submitted (turn is NOT lost)
{ "type": "invalid", "target": "<casterPid>", "word": "NMH" }

// burn damage applied at the start of a turn
{ "type": "burn", "target": "<playerPid>", "amount": 2 }
```

## Typical exchanges

**Create + opponent joins**

```
C→S  {type:"create", name:"Merlin"}
S→C  {type:"created", roomId:"X7K2P", playerId:"abc…"}
S→C  {type:"state", phase:"waiting", …}
        … opponent joins on another socket …
S→C  {type:"state", phase:"playing", turnPid:"abc…", …}
```

**Cast a word**

```
C→S  {type:"submit", tiles:["id1","id2","id3","id4","id5"]}
S→C  {type:"fx", events:[ {type:"play", word:"CROWN", damage:8, …} ]}
S→C  {type:"state", …}        // damage applied, rack refilled, turn passed
```

**Play vs AI**

```
C→S  {type:"create", name:"Merlin", bot:"hard"}
S→C  {type:"created", …}
S→C  {type:"state", phase:"playing", …}   // Archmage already in the room
```
