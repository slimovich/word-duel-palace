# Gameplay

## Goal

Reduce your opponent's HP from **40 to 0** by spelling valid English words from
your rack of wooden letter tiles. Turns alternate; first to drop the rival to 0
wins.

## A turn

- Each player holds a rack of **7 tiles**.
- On your turn you build **one word of 2+ letters** from your rack.
- The word is validated against the dictionary (server-authoritative).
  - **Valid** → it deals damage, the used tiles are removed and the rack refills
    to 7, and the turn passes to your opponent.
  - **Invalid** → it flashes red but **you keep your turn** and may try again
    until you cast a valid word or the clock runs out.
- A turn lasts **45 seconds**. If it expires, the turn is skipped. You may also
  **Pass** voluntarily, and **Shuffle** reorders your rack (cosmetic only).

The client disables the **Cast** button until the composed word is both 2+
letters and present in the dictionary, so invalid words normally can't be sent.

## Damage formula

```
per-tile contribution = (1 + rare_bonus(letter)) × (2 if the tile is Gilded)

rare_bonus:  J Q X Z → +3      K V W Y → +1      all others → 0

length bonus:  +2 if the word is 5+ letters
               +5 if the word is 7+ letters     (cumulative: a 7-letter word gets +7)

total damage = sum(per-tile contributions) + length bonus
```

Each tile also shows its base value (`1 + rare_bonus`) in the corner, and the
arena shows a **live running total** (⚔️) plus chips for the length bonus, ×2,
shield, and burn as you build the word.

### Examples

| Word | Breakdown | Damage |
|---|---|---|
| `AX` | A(1)+X(4) | **5** |
| `CAT` | 1+1+1 | **3** |
| `QUIZ` | Q(4)+U(1)+I(1)+Z(4) | **10** |
| `CROWN` | C+R+O+W(2)+N + length(+2) | **8** |
| `HOMER` (5 letters) | 5×1 + length(+2) | **7** |

## Enchanted tiles

About 14% of freshly drawn tiles carry a modifier, clearly marked on the tile:

| Tile | Marker | Effect |
|---|---|---|
| **Gilded** | `×2` | Doubles **this tile's** damage contribution when played. |
| **Warding** | `🛡` | Grants you **+3 shield** when played. Shield absorbs incoming damage before HP. |
| **Ember** | `🔥` | The opponent takes **+2 burn damage** at the start of their next turn. |

Hovering a tile for ~1 second shows a tooltip with its name, effect, and value.

## Tiles & racks

- Letters are drawn from a **weighted frequency bag** (common vowels and
  consonants are far more likely than rare letters like J/Q/X/Z).
- Every rack is kept **balanced**: at least **2 vowels** and **2 consonants**, so
  you always have something playable (no dead all-vowel or all-consonant hands).
- After a valid word, used tiles are removed and the rack refills to 7.

## HP, shield, burn

- Both players start at **40 HP**.
- **Shield** absorbs damage first; any remainder reduces HP.
- **Burn** is applied at the *start* of the affected player's next turn.
- HP bars are color-coded: **green** > 60%, **yellow** 30–60%, **red** < 30%.

## Solo vs the Palace AI

Pick a difficulty on the home screen (or add a bot from the lobby). All three are
server-side and use the same rules you do.

| Difficulty | Opponent | Style | "Think" time |
|---|---|---|---|
| **Easy** | Apprentice | Weak/short words; sometimes fumbles a turn | 2.4–4.0 s |
| **Medium** | Sorcerer | Solid, strong-ish words | 1.6–2.8 s |
| **Hard** | Archmage | Best word it can find; exploits ×2/burn | 1.0–1.9 s |

Bots never time out on their own turn (they move within their think window),
never disconnect, and auto-accept a **Rematch**.

## End of match & rematch

When a player hits 0 HP the game ends with a victory/defeat overlay. Both players
are offered **Rematch (same room)** or **Leave to lobby**; a rematch restarts in
the same room once both accept (the AI accepts automatically). If your opponent
disconnects mid-match, you're shown "Opponent disconnected" and returned to the
lobby.
