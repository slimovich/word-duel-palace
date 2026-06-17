import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import { evaporateTile, glowTile, popTileValue } from "../animations/index.js";

const RARE = { J: 3, Q: 3, X: 3, Z: 3, K: 1, V: 1, W: 1, Y: 1 };

export function tileValue(letter) {
  return 1 + (RARE[(letter || "").toUpperCase()] || 0);
}

const MOD_LABEL = { x2: "×2", shield: "🛡", burn: "🔥" };
const MOD_CLASS = { x2: "mod-x2", shield: "mod-shield", burn: "mod-burn" };
const MOD_INFO = {
  x2:     { name: "Gilded Tile",  desc: "Doubles this tile's damage when played." },
  shield: { name: "Warding Tile", desc: "Grants you +3 shield when played." },
  burn:   { name: "Ember Tile",   desc: "Opponent takes +2 burn damage next turn." },
};

export function effectiveValue(tile) {
  const v = tileValue(tile.letter);
  return tile.mod === "x2" ? v * 2 : v;
}

// A single wooden letter tile.
//
// `evaporate` dissolves it into smoke on cast — the smoke lives in
// .tile-evap-host (sibling of the button) so GSAP can animate it
// independently of the button's opacity.
//
// `pop`  floats the tile's point value upward while scoring.
// `glow` fires a brief gold burst (e.g. on a bonus pick).
// `tip`  enables the hover characteristics popup.
//
// The rack↔spell-row FLIP animation is driven by Game.jsx via the forwarded
// ref — the tile never unmounts/remounts when picked or unpicked.
const Tile = forwardRef(function Tile(
  { tile, onClick, glow, small, tip, pop, popDelay, evaporate, evapDelay },
  forwardedRef,
) {
  const mod = tile.mod;
  const val = tileValue(tile.letter);
  const eff = effectiveValue(tile);
  const info = mod ? MOD_INFO[mod] : { name: "Wooden Tile", desc: `Letter ${tile.letter} · ${val} base damage` };

  // Internal ref for GSAP; also satisfies the forwarded ref for FLIP.
  const buttonRef = useRef(null);
  const smokeEls  = useRef([]);
  const popEl     = useRef(null);

  const mergeRef = useCallback((el) => {
    buttonRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  }, [forwardedRef]);

  useEffect(() => {
    if (evaporate && buttonRef.current) {
      evaporateTile(buttonRef.current, smokeEls.current.filter(Boolean), evapDelay ?? 0);
    }
  }, [evaporate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (glow && buttonRef.current) glowTile(buttonRef.current);
  }, [glow]);

  useEffect(() => {
    if (pop && popEl.current) popTileValue(popEl.current, popDelay ?? 0);
  }, [pop]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={"tile-evap-host" + (small ? " small" : "")}>
      <button
        ref={mergeRef}
        className={
          "tile" +
          (glow   ? " glow"  : "") +
          (small  ? " small" : "") +
          (mod    ? " " + MOD_CLASS[mod] : "")
        }
        onClick={onClick}
        type="button"
      >
        <span className="tile-letter">{tile.letter}</span>
        <span className="tile-val">{val}</span>
        {mod && <span className="tile-mod">{MOD_LABEL[mod]}</span>}
        <span className="tile-grain" aria-hidden />

        {pop && (
          <span ref={popEl} className="tile-pop">+{eff}</span>
        )}

        {tip && (
          <span className={"tile-tip " + (mod ? "tip-" + mod : "")} role="tooltip">
            <span className="tip-name">{info.name}</span>
            <span className="tip-desc">{info.desc}</span>
            {mod && <span className="tip-letter">Letter {tile.letter} · {val} base</span>}
          </span>
        )}
      </button>

      {/* Smoke lives outside the button so GSAP can keep it visible after
          the button's own opacity reaches 0. */}
      <span className="tile-smoke" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} ref={(el) => { smokeEls.current[i] = el; }} />
        ))}
      </span>
    </div>
  );
});

export default Tile;
