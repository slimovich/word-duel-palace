import gsap from "gsap";
import { smokeParticle } from "./particles.js";

const SMOKE_CONFIGS = [
  { sx: -18, sy: -28, stagger: 0      },
  { sx:  18, sy: -34, stagger: 0.015  },
  { sx:  -7, sy: -40, stagger: 0.03   },
  { sx:  22, sy: -20, stagger: 0.04   },
  { sx: -22, sy: -18, stagger: 0.055  },
];

// Tile dissolves while smoke puffs rise from its position.
export function evaporateTile(tileEl, smokeEls, delay = 0) {
  gsap.to(tileEl, {
    opacity: 0, y: -22, scale: 0.55, rotation: 6, filter: "blur(4px)",
    duration: 0.22, delay, ease: "power2.out",
  });

  SMOKE_CONFIGS.forEach((cfg, i) =>
    smokeParticle(smokeEls[i], { ...cfg, delay: delay + cfg.stagger, sc: 2.6, duration: 0.44 })
  );
}

// Brief gold burst when a tile scores.
export function glowTile(el) {
  gsap.timeline()
    .to(el, {
      scale: 1.12, boxShadow: "0 0 24px 8px #ffd76a",
      duration: 0.25, ease: "power2.out",
    })
    .to(el, {
      scale: 1, boxShadow: "0 5px 0 #b98a4c, 0 7px 10px rgba(40,24,8,.35)",
      opacity: 0, duration: 0.25, ease: "power2.in",
    });
}

// "+N" value floats up from a tile during cast scoring.
export function popTileValue(el, delay = 0) {
  gsap.timeline({ delay })
    .fromTo(el,
      { xPercent: -50, y:  4, scale: 0.5, opacity: 0 },
      { xPercent: -50, y: -10, scale: 1.2, opacity: 1, duration: 0.225, ease: "back.out(2)" }
    )
    .to(el, { y: -34, scale: 1, opacity: 0, duration: 0.675, ease: "power2.in" });
}

// Capture a visible tile before React moves it between rack and spell row.
export function captureTileMove(el, direction = "pick") {
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const clone = el.cloneNode(true);
  clone.classList.add("tile-flight");
  clone.setAttribute("aria-hidden", "true");
  clone.tabIndex = -1;
  clone.querySelectorAll(".tile-tip").forEach((tip) => tip.remove());

  return { clone, direction, rect };
}

// Animate the captured tile clone into its new slot, then lock in the real tile.
export function playTileMove(snapshot, targetEl) {
  if (!snapshot || !targetEl) return null;

  const { clone, direction, rect } = snapshot;
  const targetRect = targetEl.getBoundingClientRect();
  const dx = targetRect.left + (targetRect.width / 2) - (rect.left + (rect.width / 2));
  const dy = targetRect.top + (targetRect.height / 2) - (rect.top + (rect.height / 2));
  const scaleX = targetRect.width / rect.width;
  const scaleY = targetRect.height / rect.height;
  const lockY = direction === "pick" ? -4 : 4;

  document.body.appendChild(clone);
  gsap.set(targetEl, { visibility: "hidden" });
  gsap.set(clone, {
    boxShadow: "0 16px 24px rgba(30, 18, 6, .45), 0 0 18px rgba(255, 215, 106, .58)",
    force3D: true,
    height: rect.height,
    left: rect.left,
    margin: 0,
    pointerEvents: "none",
    position: "fixed",
    top: rect.top,
    transformOrigin: "50% 50%",
    transition: "none",
    width: rect.width,
    zIndex: 1000,
  });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;

    cleaned = true;
    gsap.set(targetEl, { clearProps: "visibility" });
    clone.remove();
  };

  return gsap.timeline({ onComplete: cleanup, onInterrupt: cleanup })
    .to(clone, {
      duration: 0.38,
      ease: "power3.out",
      scaleX,
      scaleY,
      x: dx,
      y: dy,
    })
    .set(targetEl, { visibility: "visible" })
    .to(clone, {
      duration: 0.05,
      opacity: 0,
    }, "<")
    .fromTo(targetEl, {
      scale: 0.96,
      y: lockY,
    }, {
      duration: 0.18,
      ease: "back.out(1.8)",
      scale: 1,
      y: 0,
    }, "<");
}
