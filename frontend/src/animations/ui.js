import gsap from "gsap";

// Spell-row shakes red when the word is invalid.
export function flashError(el) {
  gsap.timeline()
    .to(el, { backgroundColor: "rgba(178,59,59,.5)", duration: 0.2, ease: "power1.out" })
    .to(el, { backgroundColor: "rgba(0,0,0,.18)",   duration: 0.3, ease: "power1.in"  });
}

// Timer bar pulses when ≤10 s remain — kill the returned tween when safe again.
export function timerDangerPulse(el) {
  return gsap.to(el, { opacity: 0.45, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
}

// Rematch hint fades in and out until dismissed — kill the returned tween on unmount.
export function hintPulse(el) {
  return gsap.to(el, { opacity: 0.55, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" });
}

// Attack-total number bounces when damage accumulates.
export function atkBump(el) {
  gsap.fromTo(el,
    { scale: 1.6, color: "#fff7c0" },
    { scale: 1,   color: "#ffffff", duration: 0.26, ease: "power2.out" }
  );
}

// Game-over overlay fades in from transparent.
export function overlayFadeIn(el) {
  gsap.from(el, { opacity: 0, duration: 0.3, ease: "power1.out" });
}

// Loading spinner — kill the returned tween on unmount.
export function spinForever(el) {
  return gsap.to(el, { rotation: 360, duration: 0.9, ease: "none", repeat: -1 });
}
