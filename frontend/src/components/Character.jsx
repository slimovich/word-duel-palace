import React from "react";

/*
 * Original hand-drawn mage character (SVG). Two colour variants so the two
 * duelists read as distinct. Nothing here is traced or copied from any
 * existing artwork — just simple geometric shapes.
 */

const PALETTES = {
  player: {
    robe: "#3f7cc0", robeDark: "#2c5a8f", hat: "#2c5a8f", hatDark: "#21456e",
    skin: "#f1c9a5", trim: "#ffd76a", staff: "#8a5a2b", orb: "#8fe0ff",
    orbGlow: "#d6f3ff",
  },
  rival: {
    robe: "#5aa66a", robeDark: "#3f7a4d", hat: "#3f7a4d", hatDark: "#2d5c39",
    skin: "#ecbb92", trim: "#d877b0", staff: "#6b4423", orb: "#c79bff",
    orbGlow: "#ecdcff",
  },
};

export default function Character({ variant = "player", facing = "right" }) {
  const c = PALETTES[variant] || PALETTES.player;
  const mirror = facing === "left";
  return (
    <div className="character-art">
      <svg viewBox="0 0 160 220" width="100%" height="100%" aria-hidden
        style={{ transform: mirror ? "scaleX(-1)" : "none" }}>
        {/* ground shadow */}
        <ellipse cx="80" cy="210" rx="48" ry="9" fill="rgba(0,0,0,0.22)" />

        {/* staff (behind body) */}
        <g className="char-staff">
          <rect x="115" y="66" width="7" height="126" rx="3.5" fill={c.staff} />
          <rect x="115" y="66" width="3" height="126" rx="1.5" fill="#fff" opacity="0.15" />
          <circle cx="118.5" cy="58" r="13" fill={c.orbGlow} opacity="0.55" className="char-orb-glow" />
          <circle cx="118.5" cy="58" r="9.5" fill={c.orb} />
          <circle cx="118.5" cy="58" r="9.5" fill="none" stroke={c.trim} strokeWidth="2" />
          <circle cx="115" cy="55" r="2.4" fill="#fff" opacity="0.8" />
        </g>

        {/* robe */}
        <path d="M80 98 C 54 98 44 124 39 198 L 121 198 C 116 124 106 98 80 98 Z" fill={c.robe} />
        <path d="M80 98 C 92 104 104 132 109 198 L 121 198 C 116 124 106 98 80 98 Z"
          fill={c.robeDark} opacity="0.45" />
        {/* hem trim */}
        <path d="M39 190 L 121 190 L 121 198 L 39 198 Z" fill={c.trim} opacity="0.85" />
        {/* collar */}
        <path d="M66 100 Q 80 112 94 100 L 90 96 Q 80 104 70 96 Z" fill={c.trim} opacity="0.9" />

        {/* left sleeve + hand */}
        <path d="M54 112 C 39 122 37 152 46 170 L 60 163 C 55 146 57 128 66 120 Z" fill={c.robe} />
        <circle cx="48" cy="168" r="7.5" fill={c.skin} />
        {/* right arm to staff + hand */}
        <path d="M106 112 C 119 120 121 140 116 154 L 104 149 C 108 136 103 124 95 118 Z" fill={c.robe} />
        <circle cx="117" cy="64" r="7.5" fill={c.skin} />

        {/* head */}
        <circle cx="80" cy="74" r="25" fill={c.skin} />
        <path d="M80 99 a25 25 0 0 0 22 -14 q -22 10 -44 0 a25 25 0 0 0 22 14 Z"
          fill="#000" opacity="0.05" />
        {/* eyes */}
        <ellipse cx="71" cy="74" rx="3" ry="4.2" fill="#2a2018" />
        <ellipse cx="89" cy="74" rx="3" ry="4.2" fill="#2a2018" />
        <circle cx="70" cy="72.5" r="1" fill="#fff" />
        <circle cx="88" cy="72.5" r="1" fill="#fff" />
        {/* cheeks */}
        <circle cx="63" cy="82" r="4" fill="#f08a7a" opacity="0.45" />
        <circle cx="97" cy="82" r="4" fill="#f08a7a" opacity="0.45" />
        {/* smile */}
        <path d="M72 85 Q 80 91 88 85" stroke="#8a4a30" strokeWidth="2.4" fill="none" strokeLinecap="round" />

        {/* hat */}
        <path d="M53 56 C 60 22 72 4 80 3 C 88 4 100 22 107 56 Z" fill={c.hat} />
        <path d="M80 3 C 88 4 100 22 107 56 L 92 56 C 90 30 86 14 80 6 Z"
          fill={c.hatDark} opacity="0.5" />
        <ellipse cx="80" cy="56" rx="39" ry="10" fill={c.hatDark} />
        <ellipse cx="80" cy="54" rx="39" ry="9" fill={c.hat} />
        <path d="M64 47 Q 80 53 96 47 L 94 41 Q 80 46 66 41 Z" fill={c.trim} opacity="0.92" />
        {/* hat star */}
        <path d="M80 22 l 2.6 5.4 5.9 0.7 -4.4 4 1.2 5.8 -5.3 -2.9 -5.3 2.9 1.2 -5.8 -4.4 -4 5.9 -0.7 Z"
          fill={c.trim} />
      </svg>
    </div>
  );
}
