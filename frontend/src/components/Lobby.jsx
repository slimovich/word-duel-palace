import React, { useRef, useState } from "react";

const BOTS = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export default function Lobby({ roomId, state, onAddBot, onLeave }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const oppDisconnected =
    state?.opp && state.opp.connected === false;

  const selectField = () => {
    const el = codeRef.current;

    if (!el) return;

    el.focus();
    el.select();
    el.setSelectionRange(0, roomId.length);
  };

  const copy = async () => {
    let ok = false;

    // Modern API: works in a normal tab on http://localhost (secure context).
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(roomId);
        ok = true;
      }
    } catch {
      ok = false;
    }

    // Fallback: select a real field + execCommand (older browsers).
    if (!ok) {
      try {
        selectField();
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
    }

    // Last resort (sandboxed iframe blocks both): leave the code selected so
    // the player can just press ⌘/Ctrl+C themselves.
    if (!ok) selectField();

    setCopied(ok ? "Copied!" : "Selected — press ⌘/Ctrl+C");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="screen lobby">
      <div className="parchment-card lobby-card">
        <h2 className="title-sm">Waiting for opponent…</h2>
        <p className="subtitle">Share this room code with your rival.</p>

        <div className="room-code" onClick={copy} title="Click to copy">
          {roomId.split("").map((c, i) => (
            <span className="code-tile" key={i}>{c}</span>
          ))}
        </div>

        {/* always-selectable plain copy of the code (reliable fallback) */}
        <input
          ref={codeRef}
          className="code-plain"
          readOnly
          value={roomId}
          onFocus={(e) => e.target.select()}
          aria-label="Room code"
        />

        <button className="btn btn-secondary copy-btn" onClick={copy}>
          {copied || "Copy code"}
        </button>

        <div className="spinner-row">
          <span className="spinner" />
          <span>Awaiting a challenger…</span>
        </div>

        {oppDisconnected && (
          <p className="error-note">Opponent disconnected.</p>
        )}

        <div className="vs-bot lobby-bot">
          <div className="vs-bot-label">No one around? Duel the AI:</div>
          <div className="bot-row">
            {BOTS.map((b) => (
              <button key={b.id} className={"btn bot-btn bot-" + b.id}
                onClick={() => onAddBot(b.id)}>
                <span className="bot-diff">{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-ghost" onClick={onLeave}>
          Leave to lobby
        </button>
      </div>
    </div>
  );
}
