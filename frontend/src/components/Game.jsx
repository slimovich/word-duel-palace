import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import audio from "../audio.js";
import Tile, { effectiveValue } from "./Tile.jsx";
import BattleLog from "./BattleLog.jsx";
import Character from "./Character.jsx";
import { loadDictionary, dictReady, checkWord } from "../dict.js";
import {
  captureTileMove, playTileMove,
  idleBob, lungeRight, lungeLeft, hurtShake, characterDefeat, koSmokeBurst,
  animateBolt, animateCfloat, animateBurst,
  flashError, timerDangerPulse, hintPulse, atkBump, overlayFadeIn, spinForever,
} from "../animations/index.js";

// ── Sub-components ────────────────────────────────────────────────────────────

function Hearts({ hp, maxHp, shield, pendingBurn }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = pct < 30 ? "red" : pct < 60 ? "yellow" : "green";
  return (
    <div className="hearts">
      <span className="heart">❤</span>
      <div className="hp-pill">
        <div className={"hp-pill-fill " + color} style={{ width: pct + "%" }} />
        <span className="hp-pill-text">{hp}/{maxHp}</span>
      </div>
      {shield > 0     && <span className="badge shield-badge">🛡{shield}</span>}
      {pendingBurn > 0 && <span className="badge burn-badge">🔥{pendingBurn}</span>}
    </div>
  );
}

// Damage burst numbers that animate themselves on mount via GSAP.
function DamageBurst({ burst }) {
  const totalRef = useRef(null);
  const partRefs = useRef([]);

  useEffect(() => {
    animateBurst(totalRef.current, partRefs.current.filter(Boolean), burst.parts);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={"dmg-burst " + (burst.burn ? "burn" : "")}>
      {burst.parts.map((p, i) => (
        <span ref={(el) => { partRefs.current[i] = el; }} className="burst-part" key={i}>
          {burst.burn ? "🔥" : ""}{p.v}
        </span>
      ))}
      <span ref={totalRef} className="burst-total">−{burst.total}</span>
    </div>
  );
}

// Floating word label that animates itself on mount.
function CFloat({ text }) {
  const ref = useRef(null);
  useEffect(() => { animateCfloat(ref.current); }, []);
  return <span ref={ref} className="cfloat word">{text}</span>;
}

// KO smoke burst — animates on mount, cleans up automatically (one-shot).
function KoSmoke() {
  const containerRef = useRef(null);
  useEffect(() => {
    const spans = Array.from(containerRef.current.querySelectorAll("span"));
    koSmokeBurst(spans);
  }, []);
  return (
    <span ref={containerRef} className="ko-smoke" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
    </span>
  );
}

// Spinner that drives GSAP rotation instead of a CSS keyframe.
function Spinner({ className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const anim = spinForever(ref.current);
    return () => anim.kill();
  }, []);
  return <span ref={ref} className={"spinner " + className} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Game({ state, playerId, fx, onSubmit, onPass, onRematch, onLeave }) {
  const you  = state.you;
  const opp  = state.opp;
  const yourTurn = !!you?.yourTurn;
  const phase    = state.phase;

  // ── Game state (no animation state here) ──
  const [selected,   setSelected]   = useState([]);
  const [order,      setOrder]      = useState([]);
  const [castError,  setCastError]  = useState(false);
  const [remaining,  setRemaining]  = useState(state.turnRemaining || 0);
  const [casting,    setCasting]    = useState(false);
  const [castTiles,  setCastTiles]  = useState([]);
  const [floats,     setFloats]     = useState([]);   // { id, text, where }
  const [bursts,     setBursts]     = useState([]);   // { id, side, total, parts, burn }
  const [dictLoaded, setDictLoaded] = useState(dictReady());

  // ── DOM refs for GSAP ──
  const leftArtRef   = useRef(null);
  const rightArtRef  = useRef(null);
  const boltRef      = useRef(null);
  const spellRowRef  = useRef(null);
  const timerBarRef  = useRef(null);
  const atkNumRef    = useRef(null);
  const rematchHintRef = useRef(null);

  // ── Misc refs ──
  const submittedIds  = useRef(null);
  const castSnapshot  = useRef(null);
  const anchor        = useRef({ rem: 0, at: 0 });
  const lowHpFired    = useRef(false);
  const lastTick      = useRef(0);
  const timerPulse    = useRef(null);
  const prevDmg       = useRef(null);

  // ── Dictionary ──
  useEffect(() => {
    loadDictionary().then(() => setDictLoaded(dictReady()));
  }, []);

  // ── Rack order ──
  useEffect(() => {
    const ids = (you?.rack || []).map((t) => t.id);
    setOrder((prev) => {
      const kept  = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
    setSelected((prev) => prev.filter((t) => ids.includes(t.id)));
  }, [you?.rack]);

  // ── Timer ──
  useEffect(() => {
    anchor.current = { rem: state.turnRemaining || 0, at: Date.now() };
    setRemaining(state.turnRemaining || 0);
  }, [state.turnPid, state.turnEndsAt]);

  useEffect(() => {
    if (phase !== "playing") return;
    const iv = setInterval(() => {
      const a   = anchor.current;
      const rem = Math.max(0, a.rem - (Date.now() - a.at) / 1000);
      setRemaining(rem);
      if (yourTurn && rem <= 10 && rem > 0) {
        const whole = Math.ceil(rem);
        if (whole !== lastTick.current) { lastTick.current = whole; audio.play("tick"); }
      }
    }, 100);
    return () => clearInterval(iv);
  }, [phase, yourTurn]);

  // ── Timer danger pulse ──
  useEffect(() => {
    if (!timerBarRef.current) return;
    if (remaining <= 10 && remaining > 0) {
      if (!timerPulse.current) {
        timerPulse.current = timerDangerPulse(timerBarRef.current);
      }
    } else {
      timerPulse.current?.kill();
      timerPulse.current = null;
    }
  }, [remaining <= 10]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Low-HP warning ──
  useEffect(() => {
    if (!you) return;
    const pct = (you.hp / you.maxHp) * 100;
    if (pct < 30 && pct > 0 && !lowHpFired.current) { lowHpFired.current = true; audio.play("lowhp"); }
    if (pct >= 30) lowHpFired.current = false;
  }, [you?.hp]);

  // ── Idle bob on mount ──
  useEffect(() => {
    const l = idleBob(leftArtRef.current);
    const r = idleBob(rightArtRef.current, -1.6); // offset so they're not in sync
    return () => { l.kill(); r.kill(); };
  }, []);

  // ── Attack-total bump ──
  const live = useMemo(() => {
    let dmg = 0, shield = 0, burn = 0, hasX2 = false;
    for (const t of selected) {
      dmg += effectiveValue(t);
      if (t.mod === "shield") shield += 3;
      if (t.mod === "burn")   burn   += 2;
      if (t.mod === "x2")     hasX2   = true;
    }
    let lenBonus = 0;
    if (selected.length >= 7) lenBonus += 5;
    if (selected.length >= 5) lenBonus += 2;
    return { dmg: dmg + lenBonus, shield, burn, lenBonus, hasX2 };
  }, [selected]);

  useEffect(() => {
    if (prevDmg.current !== null && prevDmg.current !== live.dmg && atkNumRef.current) {
      atkBump(atkNumRef.current);
    }
    prevDmg.current = live.dmg;
  }, [live.dmg]);

  // ── Rematch hint pulse ──
  useEffect(() => {
    if (!rematchHintRef.current) return;
    if (opp?.rematchReady && !you?.rematchReady) {
      const anim = hintPulse(rematchHintRef.current);
      return () => anim.kill();
    }
  }, [opp?.rematchReady, you?.rematchReady]);

  // ── Combat events ──
  useEffect(() => {
    if (!fx) return;
    for (const e of fx.events) {
      if (e.type === "play") {
        const youAttacked = e.by === playerId;
        const hitRef  = youAttacked ? rightArtRef : leftArtRef;
        const atkRef  = youAttacked ? leftArtRef  : rightArtRef;

        let parts;
        if (youAttacked && submittedIds.current && selected.length) {
          parts = selected.map((t) => effectiveValue(t));
          if (e.breakdown?.length_bonus) parts.push(e.breakdown.length_bonus);
        } else {
          parts = splitDamage(e.damage);
        }

        if (e.word) spawnFloat(e.word, (youAttacked ? "right" : "left") + "-word");

        // Bolt fires, burst lands when it arrives
        animateBolt(boltRef.current, youAttacked ? "right" : "left", youAttacked ? "player" : "rival");
        setTimeout(() => spawnBurst(youAttacked ? "right" : "left", e.damage, parts), 380);

        // Fighter reactions
        if (youAttacked) {
          lungeRight(atkRef.current);
          setTimeout(() => hurtShake(hitRef.current), 380);

          if (submittedIds.current) {
            const snap = castSnapshot.current || [];
            setCastTiles(snap);
            setCasting(true);
            setTimeout(() => { setCasting(false); setCastTiles([]); }, snap.length * 120 + 820);
            submittedIds.current = null;
            castSnapshot.current = null;
          }
        } else {
          lungeLeft(hitRef.current);
          setTimeout(() => hurtShake(atkRef.current), 380);
        }

      } else if (e.type === "invalid") {
        if (e.target === playerId) {
          setCastError(true);
          setTimeout(() => { setCastError(false); setSelected([]); }, 600);
          submittedIds.current = null;
          castSnapshot.current = null;
        }
      } else if (e.type === "burn") {
        const towardYou = e.target === playerId;
        const hitRef    = towardYou ? leftArtRef : rightArtRef;
        spawnBurst(towardYou ? "left" : "right", e.amount, [e.amount], true);
        hurtShake(hitRef.current);
      }
    }
  }, [fx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Error flash ──
  useEffect(() => {
    if (castError && spellRowRef.current) flashError(spellRowRef.current);
  }, [castError]);

  // ── Character defeat ──
  const gameover  = phase === "gameover";
  const youWon    = gameover && state.winner === playerId;
  const loserSide = gameover && state.winner ? (youWon ? "right" : "left") : null;

  useEffect(() => {
    if (!loserSide) return;
    const artRef = loserSide === "left" ? leftArtRef : rightArtRef;
    if (artRef.current) characterDefeat(artRef.current);
  }, [loserSide]);

  // ── Helper: spawn floats / bursts ──
  const spawnFloat = (text, where) => {
    const id = Math.random().toString(36).slice(2);
    setFloats((f) => [...f, { id, text, where }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
  };

  const splitDamage = (total) => {
    const out = []; let left = total;
    while (left > 0 && out.length < 5) {
      const c = Math.max(1, Math.min(left, Math.ceil(total / 3)));
      out.push(c); left -= c;
    }
    return out.length ? out : [total];
  };

  const spawnBurst = (side, total, parts, burn = false) => {
    const id        = Math.random().toString(36).slice(2);
    const decorated = parts.map((v, i) => ({
      v, dx: (Math.random() * 2 - 1) * 46, dy: -(10 + Math.random() * 34), delay: i * 0.07,
    }));
    setBursts((b) => [...b, { id, side, total, parts: decorated, burn }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400);
  };

  // ── Tile travel (rack ↔ spell-row) ──
  const tileNodeRefs    = useRef(new Map());
  const pendingTileMove = useRef(new Map());

  const setTileRef = (id) => (el) => {
    if (el) {
      tileNodeRefs.current.set(id, el);
    } else {
      tileNodeRefs.current.delete(id);
    }
  };

  const captureForTileMove = (id, direction) => {
    const node = tileNodeRefs.current.get(id);

    if (!node) return;

    pendingTileMove.current.set(id, captureTileMove(node, direction));
  };

  useLayoutEffect(() => {
    if (pendingTileMove.current.size === 0) return;

    for (const [id, snapshot] of pendingTileMove.current) {
      const node = tileNodeRefs.current.get(id);

      if (node) playTileMove(snapshot, node);
    }

    pendingTileMove.current.clear();
  }, [selected]);

  // ── Tile interaction ──
  const selectedIds = useMemo(() => new Set(selected.map((t) => t.id)), [selected]);
  const rackTiles   = useMemo(() => {
    const byId = new Map((you?.rack || []).map((t) => [t.id, t]));
    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [order, you?.rack]);

  const pickTile = (tile) => {
    if (!yourTurn || selectedIds.has(tile.id)) return;
    audio.play("tap");
    captureForTileMove(tile.id, "pick");
    setSelected((s) => [...s, tile]);
    setCastError(false);
  };
  const unpickTile = (tile) => {
    audio.play("deselect");
    captureForTileMove(tile.id, "unpick");
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
    if (dictLoaded && checkWord(wordStr) === false) return;
    submittedIds.current  = selected.map((t) => t.id);
    castSnapshot.current  = selected.map((t) => ({ ...t }));
    onSubmit(selected.map((t) => t.id));
  };
  const pass = () => { if (!yourTurn) return; setSelected([]); onPass(); };

  // ── Overlay ref callback (fade-in on mount) ──
  const overlayRef = useCallback((el) => { if (el) overlayFadeIn(el); }, []);

  // ── Derived ──
  const timerPct = Math.max(0, Math.min(100, (remaining / (state.turnSeconds || 45)) * 100));
  const wordStr  = selected.map((t) => t.letter).join("");

  const wordCheck = useMemo(() => {
    if (selected.length < 2) return null;
    return checkWord(wordStr);
  }, [wordStr, selected.length, dictLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const wordValid  = wordCheck !== false;
  const canCast    = yourTurn && selected.length >= 2 && wordValid;
  const oppDisconnected = opp && opp.connected === false;

  const floatsAt = (where) => floats.filter((f) => f.where === where);
  const burstsAt = (side)  => bursts.filter((b) => b.side === side);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="screen arena-screen">

      {/* ── Battle arena ── */}
      <div className="arena">

        {/* Turn indicator + timer */}
        <div className="arena-topbar">
          <div className={"turn-chip " + (yourTurn ? "yours" : "theirs")}>
            {gameover
              ? (youWon ? "Victory!" : "Defeated")
              : (yourTurn ? "Your turn" : "Opponent's turn")}
          </div>
          {phase === "playing" && (
            <div className="timer-wrap">
              <div ref={timerBarRef}
                className={"timer-bar" + (remaining <= 10 ? " danger" : "")}
                style={{ width: timerPct + "%" }} />
              <span className="timer-label">{Math.ceil(remaining)}s</span>
            </div>
          )}
        </div>

        {/* Composed spell + live totals */}
        <div className="spell-stack">
          <div ref={spellRowRef} className={"spell-row" + (castError ? " error" : "")}>
            {(() => {
              const showCast = casting && castTiles.length > 0;
              const list     = showCast ? castTiles : selected;
              if (list.length === 0) {
                return (
                  <span className="spell-hint">
                    {yourTurn ? "Tap tiles below to weave a spell…" : "Awaiting your rival…"}
                  </span>
                );
              }
              return list.map((t, i) => (
                <Tile key={t.id} tile={t} small ref={setTileRef(t.id)}
                  pop={showCast}     popDelay={i * 0.08}
                  evaporate={showCast} evapDelay={i * 0.09}
                  onClick={() => showCast ? null : unpickTile(t)} />
              ));
            })()}
          </div>

          {selected.length > 0 && (
            <div className={"spell-total" + (selected.length < 2 ? " too-short" : "")}>
              <span className="stat atk" title="Total attack">
                <span className="stat-ico">⚔️</span>
                <span ref={atkNumRef} className="atk-num">{live.dmg}</span>
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

        {/* Fighters */}
        <div className={"fighter left" + (loserSide === "left" ? " defeated" : "")}>
          <div className="float-layer">
            {burstsAt("left").map((b)  => <DamageBurst key={b.id} burst={b} />)}
            {floatsAt("left-word").map((f) => <CFloat key={f.id} text={f.text} />)}
          </div>
          <Character ref={leftArtRef} variant="player" facing="right" />
          {loserSide === "left" && <KoSmoke />}
          <div className="nameplate">{you ? you.name : "You"}</div>
          <Hearts hp={you?.hp ?? 0} maxHp={you?.maxHp ?? 40}
            shield={you?.shield ?? 0} pendingBurn={you?.pendingBurn ?? 0} />
        </div>

        <div className={"fighter right" + (loserSide === "right" ? " defeated" : "")}>
          <div className="float-layer">
            {burstsAt("right").map((b)  => <DamageBurst key={b.id} burst={b} />)}
            {floatsAt("right-word").map((f) => <CFloat key={f.id} text={f.text} />)}
          </div>
          <Character ref={rightArtRef} variant="rival" facing="left" />
          {loserSide === "right" && <KoSmoke />}
          <div className="nameplate">{opp ? opp.name : "Opponent"}</div>
          <Hearts hp={opp?.hp ?? 0} maxHp={opp?.maxHp ?? 40}
            shield={opp?.shield ?? 0} pendingBurn={opp?.pendingBurn ?? 0} />
        </div>

        {/* Persistent bolt — GSAP positions and fades it on each cast */}
        <div ref={boltRef} className="spell-bolt" />
      </div>

      {/* ── Your hand tray ── */}
      <div className={"tray" + (yourTurn && phase === "playing" ? " active" : "")}>
        <div className="tray-rack">
          {rackTiles.filter((t) => !selectedIds.has(t.id)).map((t) => (
            <Tile key={t.id} tile={t} tip ref={setTileRef(t.id)} onClick={() => pickTile(t)} />
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

      {/* ── Game-over overlay ── */}
      {(gameover || oppDisconnected) && (
        <div ref={overlayRef} className="overlay">
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
                <p>{youWon
                  ? "The palace echoes with your triumph."
                  : "Sharpen your spelling and try again."}</p>

                <p className="rematch-prompt">Play again in this room?</p>
                {opp?.rematchReady && !you?.rematchReady && (
                  <p ref={rematchHintRef} className="rematch-hint">
                    {opp.name} wants a rematch!
                  </p>
                )}
                <div className="overlay-actions">
                  {you?.rematchReady ? (
                    <button className="btn btn-primary" disabled>
                      <Spinner className="small-spinner" /> Waiting for {opp ? opp.name : "opponent"}…
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
