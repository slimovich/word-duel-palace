import React from "react";

const RARE = { J: 3, Q: 3, X: 3, Z: 3, K: 1, V: 1, W: 1, Y: 1 };

export function tileValue(letter) {
  return 1 + (RARE[(letter || "").toUpperCase()] || 0);
}

const MOD_LABEL = { x2: "×2", shield: "🛡", burn: "🔥" };
const MOD_CLASS = { x2: "mod-x2", shield: "mod-shield", burn: "mod-burn" };
const MOD_INFO = {
  x2: { name: "Gilded Tile", desc: "Doubles this tile's damage when played." },
  shield: { name: "Warding Tile", desc: "Grants you +3 shield when played." },
  burn: { name: "Ember Tile", desc: "Opponent takes +2 burn damage next turn." },
};

export function effectiveValue(tile) {
  const v = tileValue(tile.letter);

  return tile.mod === "x2" ? v * 2 : v;
}

// A single wooden letter tile. `tip` enables the hover characteristics popup.
// `pop` floats the tile's point value upward (used while a word is scoring).
// `fly` plays the rack→spell entrance; `evaporate` dissolves it into smoke.
export default function Tile({
  tile, onClick, selected, glow, small, tip, pop, popDelay,
  fly, evaporate, evapDelay,
}) {
  const mod = tile.mod;
  const val = tileValue(tile.letter);
  const eff = effectiveValue(tile);
  const info = mod
    ? MOD_INFO[mod]
    : { name: "Wooden Tile", desc: `Letter ${tile.letter} · ${val} base damage` };

  return (
    <button
      className={
        "tile" +
        (selected ? " selected" : "") +
        (glow ? " glow" : "") +
        (small ? " small" : "") +
        (fly ? " fly-in" : "") +
        (evaporate ? " evaporate" : "") +
        (mod ? " " + MOD_CLASS[mod] : "")
      }
      style={evaporate ? { "--evd": (evapDelay || 0) + "s" } : undefined}
      onClick={onClick}
      type="button"
    >
      {evaporate && (
        <span className="tile-smoke" aria-hidden>
          <span /><span /><span /><span />
        </span>
      )}
      <span className="tile-letter">{tile.letter}</span>
      <span className="tile-val">{val}</span>
      {mod && <span className="tile-mod">{MOD_LABEL[mod]}</span>}
      <span className="tile-grain" aria-hidden />

      {pop && (
        <span className="tile-pop" style={{ animationDelay: (popDelay || 0) + "s" }}>
          +{eff}
        </span>
      )}

      {tip && (
        <span className={"tile-tip " + (mod ? "tip-" + mod : "")} role="tooltip">
          <span className="tip-name">{info.name}</span>
          <span className="tip-desc">{info.desc}</span>
          {mod && <span className="tip-letter">Letter {tile.letter} · {val} base</span>}
        </span>
      )}
    </button>
  );
}
