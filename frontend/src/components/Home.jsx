import React, { useState } from "react";
import audio from "../audio.js";

const BOTS = [
  { id: "easy", label: "Easy", sub: "Apprentice" },
  { id: "medium", label: "Medium", sub: "Sorcerer" },
  { id: "hard", label: "Hard", sub: "Archmage" },
];

export default function Home({ onCreate, onCreateVsBot, onJoin, error, connected }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const create = () => onCreate(name.trim());
  const join = () => {
    if (code.trim().length >= 4) onJoin(code.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="screen home">
      <div className="parchment-card home-card">
        <h1 className="title">Word Duel Palace</h1>
        <p className="subtitle">
          Forge words from enchanted wooden tiles and out-spell your rival in
          the great letter-hall.
        </p>

        <label className="field-label">Your name</label>
        <input
          className="text-input"
          placeholder="Enter a name"
          maxLength={16}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => audio.resume()}
        />

        <div className="home-actions">
          <button className="btn btn-primary" onClick={create} disabled={!connected}>
            Create Game
          </button>

          <div className="join-row">
            <input
              className="text-input code-input"
              placeholder="ROOM CODE"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
            />
            <button className="btn btn-secondary" onClick={join}
              disabled={!connected || code.trim().length < 4}>
              Join Game
            </button>
          </div>
        </div>

        <div className="vs-bot">
          <div className="vs-bot-label">— or duel the Palace AI —</div>
          <div className="bot-row">
            {BOTS.map((b) => (
              <button key={b.id} className={"btn bot-btn bot-" + b.id}
                disabled={!connected}
                onClick={() => onCreateVsBot(name.trim(), b.id)}>
                <span className="bot-diff">{b.label}</span>
                <span className="bot-sub">{b.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {!connected && <p className="muted-note">Connecting to the palace…</p>}
        {error && <p className="error-note">{error}</p>}

        <div className="home-rules">
          <h3>How to duel</h3>
          <ul>
            <li>Both start at <strong>40 HP</strong>. Reduce your rival to 0 to win.</li>
            <li>Build a word (2+ letters) from your 7 tiles on your turn.</li>
            <li>Longer words &amp; rare letters (J Q X Z) hit harder.</li>
            <li>Watch for enchanted tiles: <span className="chip x2">x2</span>
              <span className="chip shield">+shield</span>
              <span className="chip burn">burn</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
