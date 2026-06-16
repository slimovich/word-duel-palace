import React, { useEffect, useRef, useState, useCallback } from "react";
import Net from "./net.js";
import audio from "./audio.js";
import Home from "./components/Home.jsx";
import Lobby from "./components/Lobby.jsx";
import Game from "./components/Game.jsx";
import TopBar from "./components/TopBar.jsx";

export default function App() {
  const netRef = useRef(null);

  if (!netRef.current) netRef.current = new Net();

  const net = netRef.current;

  const [state, setState] = useState(null);    // personalized game snapshot
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [fx, setFx] = useState(null);          // {seq, events}
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const fxSeq = useRef(0);
  const prevWinner = useRef(undefined);

  // ---- audio reactions to game events ----------------------------------
  const handleFx = useCallback((events) => {
    for (const e of events) {
      if (e.type === "play") {
        audio.play("valid");
        setTimeout(() => audio.play("hit"), 160);

        if (e.shield) setTimeout(() => audio.play("shield"), 120);
      } else if (e.type === "invalid") {

        audio.play("invalid");
      } else if (e.type === "burn") {
        audio.play("hit");
      }
    }

    fxSeq.current += 1;
    setFx({ seq: fxSeq.current, events });
  }, []);

  // ---- wire the socket -------------------------------------------------
  useEffect(() => {
    const off = net.on((msg) => {
      switch (msg.type) {
        case "_open":
          setConnected(true);
          break;
        case "_close":
          setConnected(false);
          break;
        case "created":
        case "joined":
          setRoomId(msg.roomId);
          setPlayerId(msg.playerId);
          setError("");
          audio.play("join");
          break;
        case "state":
          setState(msg);
          break;
        case "fx":
          handleFx(msg.events || []);
          break;
        case "error":
          setError(msg.message || "Something went wrong.");
          break;
        default:
          break;
      }
    });
    net.connect();

    return off;
  }, [net, handleFx]);

  // ---- win / lose stingers + low-hp warning ----------------------------
  useEffect(() => {
    if (!state) return;

    if (state.phase === "gameover" && prevWinner.current !== state.winner) {
      prevWinner.current = state.winner;

      if (state.winner && playerId) {
        if (state.winner === playerId) audio.play("victory");
        else audio.play("defeat");
      }
    }

    if (state.phase === "playing") prevWinner.current = undefined;
  }, [state, playerId]);

  // ---- actions ---------------------------------------------------------
  const unlock = () => {
    audio.resume();
  };

  const createGame = (name) => {
    unlock();
    setError("");
    net.send({ type: "create", name });
  };
  const createVsBot = (name, difficulty) => {
    unlock();
    setError("");
    net.send({ type: "create", name, bot: difficulty });
  };
  const addBot = (difficulty) => net.send({ type: "add_bot", difficulty });
  const joinGame = (code, name) => {
    unlock();
    setError("");
    net.send({ type: "join", roomId: code, name });
  };
  const submitWord = (tileIds) => net.send({ type: "submit", tiles: tileIds });
  const passTurn = () => net.send({ type: "pass" });
  const rematch = () => net.send({ type: "rematch" });

  const leaveToLobby = () => {
    net.close();
    setState(null);
    setRoomId(null);
    setPlayerId(null);
    setError("");
    prevWinner.current = undefined;
    setTimeout(() => net.connect(), 50);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    audio.setMuted(m);
  };
  const toggleMusic = () => {
    unlock();
    const on = !musicOn;
    setMusicOn(on);
    audio.toggleMusic(on);
  };

  // ---- screen routing --------------------------------------------------
  const phase = state?.phase;
  let screen;

  if (!state || (!roomId && phase !== "playing")) {
    screen = (
      <Home
        onCreate={createGame}
        onCreateVsBot={createVsBot}
        onJoin={joinGame}
        error={error}
        connected={connected}
      />
    );
  } else if (phase === "waiting") {
    screen = (
      <Lobby roomId={roomId} state={state} onAddBot={addBot} onLeave={leaveToLobby} />
    );
  } else {
    // playing or gameover both render the battle screen
    screen = (
      <Game
        state={state}
        playerId={playerId}
        fx={fx}
        onSubmit={submitWord}
        onPass={passTurn}
        onRematch={rematch}
        onLeave={leaveToLobby}
      />
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        muted={muted}
        musicOn={musicOn}
        onToggleMute={toggleMute}
        onToggleMusic={toggleMusic}
        connected={connected}
      />
      {screen}
    </div>
  );
}
