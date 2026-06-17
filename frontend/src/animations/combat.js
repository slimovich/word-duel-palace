import gsap from "gsap";
import { smokeParticle } from "./particles.js";

// ---- Fighter animations ------------------------------------------------

// Infinite idle float — call on mount, kill the returned tween on unmount.
export function idleBob(el, delay = 0) {
  gsap.set(el, { transformOrigin: "50% 90%" });
  return gsap.to(el, {
    y: -6, rotation: -1, duration: 1.6,
    yoyo: true, repeat: -1, ease: "sine.inOut", delay,
  });
}

export function lungeRight(el) {
  gsap.timeline()
    .to(el, { x: 28, rotation: 6,  scale: 1.05, duration: 0.175, ease: "power2.out" })
    .to(el, { x:  0, rotation: 0,  scale: 1,    duration: 0.325, ease: "power2.in"  });
}

export function lungeLeft(el) {
  gsap.timeline()
    .to(el, { x: -28, rotation: -6, scale: 1.05, duration: 0.175, ease: "power2.out" })
    .to(el, { x:   0, rotation:  0, scale: 1,    duration: 0.325, ease: "power2.in"  });
}

export function hurtShake(el) {
  gsap.timeline()
    .to(el, { x: -8, rotation: -3, duration: 0.1, ease: "power2.out"   })
    .to(el, { x:  7, rotation:  3, duration: 0.1, ease: "power2.inOut" })
    .to(el, { x: -5,               duration: 0.1, ease: "power2.inOut" })
    .to(el, { x:  4,               duration: 0.1, ease: "power2.inOut" })
    .to(el, { x:  0, rotation:  0, duration: 0.1, ease: "power2.out"   });

  gsap.timeline()
    .to(el, {
      filter: "drop-shadow(0 6px 6px rgba(0,0,0,.3)) drop-shadow(0 0 0 #ff5a5a) saturate(1.6) brightness(1.15)",
      duration: 0.1,
    })
    .to(el, {
      filter: "drop-shadow(0 6px 6px rgba(0,0,0,.3))",
      duration: 0.4,
    });
}

export function characterDefeat(el) {
  gsap.timeline()
    .to(el, { y: -4, scale: 1.03, filter: "blur(1px)", opacity: 0.8, duration: 0.175, ease: "power1.out" })
    .to(el, { y: 16, scale: 0.8,  filter: "blur(5px)", opacity: 0,   duration: 0.325, ease: "power2.in"  });
}

// ---- KO smoke ----------------------------------------------------------

const KO_CONFIGS = [
  { sx:  -4, sy:  -24, sc: 2.2, delay: 0    },
  { sx: -50, sy:  -76, sc: 3.4, delay: 0.02 },
  { sx:  44, sy:  -88, sc: 3.8, delay: 0.05 },
  { sx: -20, sy: -108, sc: 3.6, delay: 0.08 },
  { sx:  64, sy:  -50, sc: 3.0, delay: 0.03 },
  { sx: -64, sy:  -44, sc: 2.8, delay: 0.1  },
  { sx:  18, sy:  -66, sc: 4.0, delay: 0.12 },
  { sx: -36, sy:  -92, sc: 3.2, delay: 0.15 },
  { sx:  52, sy:  -28, sc: 2.6, delay: 0.07 },
];

export function koSmokeBurst(smokeEls) {
  KO_CONFIGS.forEach((cfg, i) =>
    smokeParticle(smokeEls[i], { ...cfg, duration: 0.92 })
  );
}

// ---- Spell bolt --------------------------------------------------------

export function animateBolt(el, direction, variant) {
  el.className = `spell-bolt ${variant}`;
  const [from, to] = direction === "right" ? ["14%", "82%"] : ["82%", "14%"];

  gsap.timeline()
    .set(el, { left: from, opacity: 0, scale: 0.4 })
    .to(el,  { opacity: 1, duration: 0.09 })
    .to(el,  { left: to, scale: 1.5, duration: 0.54, ease: "power2.in" }, "<")
    .to(el,  { opacity: 0, duration: 0.12 }, ">-0.12");
}

// ---- Floating combat text ----------------------------------------------

export function animateCfloat(el) {
  gsap.fromTo(el,
    { xPercent: -50, y: 10,  scale: 0.6, opacity: 0 },
    { xPercent: -50, y:  -6, scale: 1.15, opacity: 1, duration: 0.26, ease: "back.out(1.5)" }
  );
  gsap.to(el, { xPercent: -50, y: -66, scale: 1, opacity: 0, duration: 1.04, delay: 0.26, ease: "power2.in" });
}

// ---- Damage burst ------------------------------------------------------

export function animateBurst(totalEl, partEls, parts) {
  // Big total number pops in then drifts up
  gsap.timeline()
    .fromTo(totalEl,
      { xPercent: -50, y: 14, scale: 0.2, rotation: -8, opacity: 0 },
      { xPercent: -50, y:  -6, scale: 1.25, rotation:  3, opacity: 1, duration: 0.36, ease: "back.out(2)"   }
    )
    .to(totalEl, { y: -10, scale: 0.95, rotation: -1, duration: 0.3,  ease: "power1.inOut" })
    .to(totalEl, { y: -52, scale:    1, rotation:  0, opacity: 0, duration: 0.54, ease: "power2.in" });

  // Per-tile values scatter outward
  partEls.forEach((el, i) => {
    const { dx, dy, delay } = parts[i];
    gsap.timeline({ delay })
      .fromTo(el,
        { xPercent: -50, y: 8, scale: 0.4, opacity: 0 },
        { xPercent: -50, x: dx, y: dy, scale: 1.1, opacity: 1, duration: 0.3, ease: "back.out(1.5)" }
      )
      .to(el, {
        x: dx * 1.5, y: dy - 26, scale: 0.9, opacity: 0,
        duration: 0.7, ease: "power2.in",
      });
  });
}
