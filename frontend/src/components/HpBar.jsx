import React from "react";

export default function HpBar({ name, hp, maxHp, shield, pendingBurn, shake, side }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  let color = "green";

  if (pct < 30) color = "red";
  else if (pct < 60) color = "yellow";

  return (
    <div className={"hp-block " + side}>
      <div className="hp-header">
        <span className="hp-name">{name}</span>
        <span className="hp-num">{hp}/{maxHp}</span>
      </div>
      <div className={"hp-bar " + (shake ? "shake" : "")}>
        <div className={"hp-fill " + color} style={{ width: pct + "%" }} />
        {shield > 0 && (
          <div className="shield-overlay" title={`${shield} shield`}>
            <span className="shield-icon">🛡</span> {shield}
          </div>
        )}

      </div>
      {pendingBurn > 0 && (
        <div className="burn-warn" title="Burn damage next turn">
          🔥 {pendingBurn} burn pending
        </div>
      )}
    </div>
  );
}
