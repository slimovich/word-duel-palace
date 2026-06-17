import gsap from "gsap";

// Animate a single smoke blob from its CSS-positioned centre outward.
// el must have `position: absolute; left: X%; top: Y%` set in CSS.
export function smokeParticle(el, { sx = 0, sy = 0, sc = 2.6, delay = 0, duration = 0.44 }) {
  gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0.3, opacity: 0, x: 0, y: 0 });

  // Position and scale expand together over the full duration
  gsap.to(el, { x: sx, y: sy, scale: sc, duration, delay, ease: "power1.out" });

  // Opacity: rise → hold → fall (three-phase)
  gsap.timeline({ delay })
    .to(el, { opacity: 0.9, duration: duration * 0.22, ease: "power2.out" })
    .to(el, { opacity: 0.6, duration: duration * 0.33, ease: "none" })
    .to(el, { opacity: 0,   duration: duration * 0.45, ease: "power1.in" });
}
