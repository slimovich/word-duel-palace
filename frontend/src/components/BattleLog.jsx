import React, { useEffect, useRef } from "react";

export default function BattleLog({ log }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);

  return (
    <div className="battle-log" ref={ref}>
      {(!log || log.length === 0) && (
        <div className="log-line info">The hall is quiet… make your move.</div>
      )}
      {log && log.map((entry, i) => (
        <div className={"log-line " + (entry.kind || "info")} key={i}>
          {entry.text}
        </div>
      ))}
    </div>
  );
}
