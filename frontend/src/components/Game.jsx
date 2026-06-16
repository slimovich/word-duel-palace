import React, { useEffect, useMemo, useRef, useState } from "react";
import audio from "../audio.js";
import Tile, { effectiveValue } from "./Tile.jsx";
import BattleLog from "./BattleLog.jsx";
import Character from "./Character.jsx";
import { loadDictionary, dictReady, checkWord } from "../dict.js";

function Hearts({ hp, maxHp, shield, pendingBurn }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  let color = "green";

  if (pct < 30) color = "red";
  else if (pct < 60) color = "yellow";
  return (
    <div className="hearts">
      <span className="heart">❤</span>
      <div className="hp-pill">
        <div className={"hp-pill-fill " + color} style={{ width: pct + "%" }} />
        <span className="hp-pill-text">{hp}/{maxHp}</span>
      </div>
      {shield > 0 && <span className="badge shield-badge">🛡{shield}</span>}
      {pendingBurn > 0 && <span className="badge burn-badge">🔥{pendingBurn}</span>}
    </div>
  );
}

// Bursting red point numbers over a struck fighter.
function DamageBurst({ burst }) {
  return (
    <div className={"dmg-burst " + (burst.burn ? "burn" : "")}>
      {burst.parts.map((p, i) => (
        <span className="burst-part" key={i}
          style={{ "--dx": p.dx + "px", "--dy": p.dy + "px", animationDelay: p.delay + "s" }}>
          {burst.burn ? "🔥" : ""}{p.v}
        </span>
      ))}

      <span className="burst-total">−{burst.total}</span>
    </div>
  );
}

export default function Game({ state, playerId, fx, onSubmit, onPass, onRematch, onLeave }) {
  const you = state.you;
  const opp = state.opp;
  const yourTurn = !!you?.yourTurn;
  const phase = state.phase;

  const [selected, setSelected] = useState([]);
  const [order, setOrder] = useState([]);
  const [castGlow, setCastGlow] = useState(false);
  const [castError, setCastError] = useState(false);
  const [remaining, setRemaining] = useState(state.turnRemaining || 0);

  // battle-scene animation state
  const [leftAnim, setLeftAnim] = useState("");   // "" | attacking | hurt
  const [rightAnim, setRightAnim] = useState("");
  const [bolt, setBolt] = useState(null);         // {seq, dir, variant}
  const [floats, setFloats] = useState([]);       // {id, text, where} (word labels)
  const [bursts, setBursts] = useState([]);       // {id, side, total, parts} (points)
  const [casting, setCasting] = useState(false);  // a cast is animating
  const [castTiles, setCastTiles] = useState([]);  // snapshot of tiles evaporating
  const [dictLoaded, setDictLoaded] = useState(dictReady());

  // load the client-side dictionary once (for live word validation)
  useEffect(() => { loadDictionary().then(() => setDictLoaded(true)); }, []);

  const submittedIds = useRef(null);
  const castSnapshot = useRef(null);  // tiles captured at click time (objects)
  const anchor = useRef({ rem: 0, at: 0 });
  const lowHpFired = useRef(false);
  const lastTick = useRef(0);

  // keep rack display order synced with the server rack
  useEffect(() => {
    const ids = (you?.rack || []).map((t) => t.id);
    setOrder((prev) => {
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));

      return [...kept, ...added];
    });
    setSelected((prev) => prev.filter((t) => ids.includes(t.id)));
  }, [you?.rack]);

  // timer anchoring
  useEffect(() => {
    anchor.current = { rem: state.turnRemaining || 0, at: Date.now() };
    setRemaining(state.turnRemaining || 0);
  }, [state.turnPid, state.turnEndsAt]);

  useEffect(() => {
    if (phase !== "playing") return;

    const iv = setInterval(() => {
      const a = anchor.current;
      const rem = Math.max(0, a.rem - (Date.now() - a.at) / 1000);
      setRemaining(rem);

      if (yourTurn && rem <= 10 && rem > 0) {
        const whole = Math.ceil(rem);

        if (whole !== lastTick.current) { lastTick.current = whole; audio.play("tick"); }
      }
    }, 100);

    return () => clearInterval(iv);
  }, [phase, yourTurn]);

  // low-hp warning
  useEffect(() => {
    if (!you) return;

    const pct = (you.hp / you.maxHp) * 100;

    if (pct < 30 && pct > 0 && !lowHpFired.current) { lowHpFired.current = true; audio.play("lowhp"); }

    if (pct >= 30) lowHpFired.current = false;
  }, [you?.hp]);

  // react to combat fx: launch bolts, lunge attacker, stagger defender
  useEffect(() => {
    if (!fx) return;

    for (const e of fx.events) {
      if (e.type === "play") {
        const youAttacked = e.by === playerId;
        const side = youAttacked ? "right" : "left"; // who gets hit
        // points that make up the hit: real per-tile values if we cast it,
        // otherwise split the total into a few chunks for the burst.
        let parts;

        if (youAttacked && submittedIds.current && selected.length) {
          parts = selected.map((t) => effectiveValue(t));

          if (e.breakdown?.length_bonus) parts.push(e.breakdown.length_bonus);
        } else {
          parts = splitDamage(e.damage);
        }

        if (e.word) addFloat(e.word, side + "-word");

        launchBolt(side, youAttacked ? "player" : "rival");
        // burst lands when the bolt arrives (~420ms)
        setTimeout(() => spawnBurst(side, e.damage, parts), 380);

        if (youAttacked) {
          flash(setLeftAnim, "attacking"); flash(setRightAnim, "hurt", 380);

          if (submittedIds.current) {
            // Evaporate the snapshot taken at click time, independent of the
            // live rack/selection (which the refill clears immediately).
            const snap = castSnapshot.current || [];
            setCastTiles(snap);
            setCasting(true);
            const hold = snap.length * 120 + 820;
            setTimeout(() => {
              setCasting(false);
              setCastTiles([]);
            }, hold);
            submittedIds.current = null;
            castSnapshot.current = null;
          }
        } else {

          flash(setRightAnim, "attacking"); flash(setLeftAnim, "hurt", 380);
        }
      } else if (e.type === "invalid") {
        if (e.target === playerId) {
          setCastError(true);
          setTimeout(() => { setCastError(false); setSelected([]); }, 600);
          submittedIds.current = null;
          castSnapshot.current = null;  // no evaporate for a rejected word
        }
      } else if (e.type === "burn") {

        const towardYou = e.target === playerId;
        const side = towardYou ? "left" : "right";
        spawnBurst(side, e.amount, [e.amount], true);
        flash(towardYou ? setLeftAnim : setRightAnim, "hurt");
      }
    }
  }, [fx]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (setter, cls, delay = 0) => {
    const apply = () => { setter(cls); setTimeout(() => setter(""), 520); };

    if (delay) setTimeout(apply, delay); else apply();
  };
  const launchBolt = (dir, variant) => {
    setBolt({ seq: Date.now() + Math.random(), dir, variant });
    setTimeout(() => setBolt(null), 650);
  };
  const addFloat = (text, where) => {
    const id = Math.random().toString(36).slice(2);
    setFloats((f) => [...f, { id, text, where }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
  };
  // split a total into a few chunks (used when we don't know the attacker tiles)
  const splitDamage = (total) => {
    const out = []; let left = total;

    while (left > 0 && out.length < 5) {
      const c = Math.max(1, Math.min(left, Math.ceil(total / 3)));
      out.push(c); left -= c;
    }

    return out.length ? out : [total];
  };
  const spawnBurst = (side, total, parts, burn = false) => {
    const id = Math.random().toString(36).slice(2);
    const decorated = parts.map((v, i) => ({
      v, dx: (Math.random() * 2 - 1) * 46, dy: -(10 + Math.random() * 34),
      delay: i * 0.07,
    }));
    setBursts((b) => [...b, { id, side, total, parts: decorated, burn }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400);
  };

  // tile interaction
  const selectedIds = useMemo(() => new Set(selected.map((t) => t.id)), [selected]);
  const rackTiles = useMemo(() => {
    const byId = new Map((you?.rack || []).map((t) => [t.id, t]));

    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [order, you?.rack]);

  const pickTile = (tile) => {
    if (!yourTurn) return;

    if (selectedIds.has(tile.id)) return;

    audio.play("tap");
    setSelected((s) => [...s, tile]);
    setCastError(false);
  };
  const unpickTile = (tile) => {
    audio.play("deselect");
    setSelected((s) => s.filter((t) => t.id !== tile.id));
  };
  const shuffle = () => {
    audio.play("tap");
    setOrder((o) => {
      const a = [...o];

      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }

      return a;
    });
  };
  const submit = () => {
    if (!yourTurn || selected.length < 2) return;

    if (dictLoaded && checkWord(wordStr) === false) return; // block invalid
    submittedIds.current = selected.map((t) => t.id);
    // snapshot the tiles now (objects), so we can evaporate them even after
    // the server refill clears the live selection.
    castSnapshot.current = selected.map((t) => ({ ...t }));
    onSubmit(selected.map((t) => t.id));
  };
  const pass = () => { if (!yourTurn) return; setSelected([]); onPass(); };

  // derived
  const timerPct = Math.max(0, Math.min(100, (remaining / (state.turnSeconds || 45)) * 100));
  const wordStr = selected.map((t) => t.letter).join("");

  // live accumulation of the spell's damage / effects as tiles are added
  const live = useMemo(() => {
    let dmg = 0, shield = 0, burn = 0, hasX2 = false;

    for (const t of selected) {
      dmg += effectiveValue(t);

      if (t.mod === "shield") shield += 3;

      if (t.mod === "burn") burn += 2;

      if (t.mod === "x2") hasX2 = true;
    }

    let lenBonus = 0;

    if (selected.length >= 7) lenBonus += 5;

    if (selected.length >= 5) lenBonus += 2;

    return { dmg: dmg + lenBonus, shield, burn, lenBonus, hasX2 };
  }, [selected]);

  // live word validity: null = unknown (dict not loaded yet → allow, server
  // is the final judge), true/false otherwise.
  const wordCheck = useMemo(() => {
    if (selected.length < 2) return null;

    return checkWord(wordStr);
  }, [wordStr, selected.length, dictLoaded]);
  const wordValid = wordCheck !== false; // allow when valid or still unknown
  const canCast = yourTurn && selected.length >= 2 && wordValid;

  const gameover = phase === "gameover";
  const youWon = gameover && state.winner === playerId;
  const oppDisconnected = opp && opp.connected === false;

  const floatsAt = (where) => floats.filter((f) => f.where === where);
  const burstsAt = (side) => bursts.filter((b) => b.side === side);

  return (
    <div className="screen arena-screen">
      {/* ===== Battle arena ===== */}
      <div className="arena">
        {/* turn + timer */}
        <div className="arena-topbar">
          <div className={"turn-chip " + (yourTurn ? "yours" : "theirs")}>
            {gameover ? (youWon ? "Victory!" : "Defeated")
              : (yourTurn ? "Your turn" : "Opponent's turn")}
          </div>
          {phase === "playing" && (
            <div className="timer-wrap">
              <div className={"timer-bar " + (remaining <= 10 ? "danger" : "")}
                style={{ width: timerPct + "%" }} />
              <span className="timer-label">{Math.ceil(remaining)}s</span>
            </div>
          )}
        </div>

        {/* composed spell + live point accumulation, top center */}
        <div className="spell-stack">
          <div className={"spell-row " + (castGlow ? "glow" : "") + (castError ? " error" : "")}>
            {(() => {
              const showCast = casting && castTiles.length > 0;
              const list = showCast ? castTiles : selected;

              if (list.length === 0) {
                return (
                  <span className="spell-hint">
                    {yourTurn ? "Tap tiles below to weave a spell…" : "Awaiting your rival…"}
                  </span>
                );
              }

              return list.map((t, i) => (
                <Tile key={t.id} tile={t} small
                  fly={!showCast}
                  pop={showCast} popDelay={i * 0.08}
                  evaporate={showCast} evapDelay={i * 0.09}
                  onClick={() => (showCast ? null : unpickTile(t))} />
              ));
            })()}
          </div>

          {selected.length > 0 && (
            <div className={"spell-total " + (selected.length < 2 ? "too-short" : "")}>
              <span className="stat atk" title="Total attack">
                <span className="stat-ico">⚔️</span>
                <span className="atk-num" key={live.dmg}>{live.dmg}</span>
              </span>
              {live.lenBonus > 0 && (
                <span className="stat bonus" title="Long-word bonus">✦ +{live.lenBonus}</span>
              )}
              {live.hasX2 && <span className="stat x2c" title="Gilded tile">×2</span>}
              {live.shield > 0 && (
                <span className="stat shc" title="Shield gained">🛡 +{live.shield}</span>
              )}
              {live.burn > 0 && (
                <span className="stat bnc" title="Burn applied">🔥 +{live.burn}</span>
              )}
              {selected.length < 2 && <span className="word-status short">2+ letters</span>}
              {selected.length >= 2 && wordCheck === false && (
                <span className="word-status invalid">✗ not a word</span>
              )}
              {selected.length >= 2 && wordCheck === true && (
                <span className="word-status valid">✓ valid</span>
              )}
            </div>
          )}
        </div>

        {/* fighters */}
        <div className={"fighter left " + leftAnim}>
          <div className="float-layer">
            {burstsAt("left").map((b) => <DamageBurst key={b.id} burst={b} />)}
            {floatsAt("left-word").map((f) => <span className="cfloat word" key={f.id}>{f.text}</span>)}
          </div>
          <Character variant="player" facing="right" />
          <div className="nameplate">{you ? you.name : "You"}</div>
          <Hearts hp={you?.hp ?? 0} maxHp={you?.maxHp ?? 40}
            shield={you?.shield ?? 0} pendingBurn={you?.pendingBurn ?? 0} />
        </div>

        <div className={"fighter right " + rightAnim}>
          <div className="float-layer">
            {burstsAt("right").map((b) => <DamageBurst key={b.id} burst={b} />)}
            {floatsAt("right-word").map((f) => <span className="cfloat word" key={f.id}>{f.text}</span>)}
          </div>
          <Character variant="rival" facing="left" />
          <div className="nameplate">{opp ? opp.name : "Opponent"}</div>
          <Hearts hp={opp?.hp ?? 0} maxHp={opp?.maxHp ?? 40}
            shield={opp?.shield ?? 0} pendingBurn={opp?.pendingBurn ?? 0} />
        </div>

        {/* spell bolt */}
        {bolt && (
          <div key={bolt.seq}
            className={"spell-bolt " + bolt.dir + " " + bolt.variant} />
        )}
      </div>

      {/* ===== Your hand tray ===== */}
      <div className={"tray " + (yourTurn && phase === "playing" ? "active" : "")}>
        <div className="tray-rack">
          {rackTiles.map((t) => (
            <Tile key={t.id} tile={t} tip selected={selectedIds.has(t.id)}
              onClick={() => pickTile(t)} />
          ))}
        </div>
        <div className="tray-controls">
          <button className="btn btn-primary" disabled={!canCast} onClick={submit}>
            Cast Spell {wordStr && `(${wordStr})`}
          </button>
          <button className="btn btn-secondary" onClick={shuffle}>Shuffle</button>
          <button className="btn btn-ghost" disabled={!yourTurn} onClick={pass}>Pass</button>
        </div>
        <BattleLog log={state.log} />
      </div>

      {/* ===== overlays ===== */}
      {(gameover || oppDisconnected) && (
        <div className="overlay">
          <div className="parchment-card overlay-card">
            {oppDisconnected && !gameover ? (
              <>
                <h2 className="title-sm">Opponent disconnected</h2>
                <p>Your rival has left the hall.</p>
                <button className="btn btn-primary" onClick={onLeave}>Return to lobby</button>
              </>
            ) : (
              <>
                <h2 className={"title-sm " + (youWon ? "win" : "lose")}>
                  {youWon ? "🏆 You win the duel!" : "💀 You were defeated"}
                </h2>
                <p>{youWon ? "The palace echoes with your triumph."
                  : "Sharpen your spelling and try again."}</p>

                <p className="rematch-prompt">Play again in this room?</p>
                {opp?.rematchReady && !you?.rematchReady && (
                  <p className="rematch-hint">
                    {opp.name} wants a rematch!
                  </p>
                )}
                <div className="overlay-actions">
                  {you?.rematchReady ? (
                    <button className="btn btn-primary" disabled>
                      <span className="spinner small-spinner" /> Waiting for {opp ? opp.name : "opponent"}…
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={onRematch}>
                      Rematch (same room)
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={onLeave}>Leave to lobby</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
