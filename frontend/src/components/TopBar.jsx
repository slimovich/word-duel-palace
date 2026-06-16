import React from "react";

export default function TopBar({ muted, musicOn, onToggleMute, onToggleMusic, connected }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-crest" aria-hidden>♜</span>
        <span className="brand-name">Word&nbsp;Duel&nbsp;Palace</span>
      </div>
      <div className="topbar-controls">
        <span className={"conn-dot " + (connected ? "on" : "off")}
          title={connected ? "Connected" : "Offline"} />
        <button className="icon-btn" onClick={onToggleMusic}
          title="Toggle music">
          {musicOn ? "♪ Music On" : "♪ Music Off"}
        </button>
        <button className="icon-btn" onClick={onToggleMute}
          title="Toggle sound">
          {muted ? "🔇 Muted" : "🔊 Sound"}
        </button>
      </div>
    </header>
  );
}
