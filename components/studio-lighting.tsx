"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------
   CINEMATIC STUDIO LIGHTING — additive environment layer for .hero

   This component ONLY adds light. It never draws, mutates or replaces
   any existing asset: no logo, no text, no imagery, no layout. Every
   layer is decorative (aria-hidden, pointer-events: none), paints
   BELOW the hero copy and blends with `mix-blend-mode: screen`, so on
   the deep black stage it reads as real studio light rather than an
   overlay. The dust canvas is the only layer above the particle logo,
   and its alpha is clamped so it can only ever lighten by a few
   percent — never obscure it.

   Beam geometry lives once in BEAMS and is shared by the CSS beam
   columns (via inline custom properties) and the dust canvas, so the
   motes stay locked inside the visible beams at every viewport size.

   Colours are the existing brand tokens only:
   gold #D4AF37, soft gold #C9A227, warm-shifted off-white #F5F5F5.
------------------------------------------------------------------ */

const GOLD = "212 175 55";
const WARM_WHITE = "245 236 205";

type Beam = {
  /** Horizontal source position, 0–1 across the hero. */
  x: number;
  /** Tilt in degrees; positive leans the beam left (light from the right). */
  angle: number;
  /** Column width, 0–1 of hero width. */
  width: number;
  /** Peak opacity, kept deliberately low. */
  alpha: number;
};

const BEAMS: Beam[] = [
  { x: 0.895, angle: 15, width: 0.19, alpha: 0.16 },  // primary key light, upper right
  { x: 0.76, angle: 10.5, width: 0.145, alpha: 0.1 }, // secondary spot grazing the logo
  { x: 0.61, angle: 6, width: 0.27, alpha: 0.05 },    // wide, soft overhead fill
];

type Mote = {
  beam: number;
  t: number;        // 0 to 1, position along the beam
  lateral: number;  // -1 to 1, position across the beam width
  drift: number;    // fraction of the beam traversed per ms
  radius: number;
  phase: number;
  warm: boolean;
};

const pickBeam = () => {
  const roll = Math.random();
  return roll < 0.45 ? 0 : roll < 0.8 ? 1 : 2;
};

export default function StudioLighting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let motes: Mote[] = [];

    const seedMotes = () => {
      // Minimal on purpose — floating dust, never snow.
      const count = width < 720 ? 26 : 58;
      motes = Array.from({ length: count }, () => ({
        beam: pickBeam(),
        t: Math.random(),
        lateral: Math.random() * 2 - 1,
        drift: 0.000012 + Math.random() * 0.000016,
        radius: 0.35 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        warm: Math.random() < 0.4,
      }));
    };

    const draw = (time: number) => {
      const delta = Math.min(previous ? time - previous : 16, 48);
      previous = time;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      const sourceY = -0.05 * height;
      const reach = height * 1.3;

      motes.forEach((mote) => {
        if (!reduceMotion) {
          mote.t += mote.drift * delta;
          if (mote.t > 1) {
            mote.t = 0;
            mote.lateral = Math.random() * 2 - 1;
            mote.beam = pickBeam();
          }
        }

        const beam = BEAMS[mote.beam];
        const radians = (beam.angle * Math.PI) / 180;
        const dirX = -Math.sin(radians);
        const dirY = Math.cos(radians);
        const half = (beam.width * width) / 2;
        const spread = 0.35 + mote.t * 0.95; // the cone widens as it falls
        const sway = reduceMotion ? 0 : Math.sin(time * 0.0004 + mote.phase) * half * 0.05;
        const along = mote.t * reach;
        const x = beam.x * width + dirX * along - dirY * mote.lateral * half * spread + sway;
        const y = sourceY + dirY * along + dirX * mote.lateral * half * spread;

        // Dust brightens mid-beam and fades toward both source and floor.
        const envelope = Math.sin(Math.min(mote.t, 1) * Math.PI) ** 0.75;
        const shimmer = reduceMotion ? 1 : 0.65 + Math.sin(time * 0.0009 + mote.phase * 2.3) * 0.35;
        // Alpha stays tiny: the motes must only ever be visible inside the
        // beams and never compete with the logo or copy.
        const alpha = Math.min(0.34, beam.alpha * 2.6) * envelope * shimmer;
        if (alpha <= 0.004) return;

        context.globalAlpha = alpha;
        context.fillStyle = mote.warm ? `rgb(${WARM_WHITE})` : `rgb(${GOLD})`;
        context.beginPath();
        context.arc(x, y, mote.radius, 0, Math.PI * 2);
        context.fill();
      });

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      seedMotes();
      if (reduceMotion) draw(0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    if (!reduceMotion) frame = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div className="hero-lighting" aria-hidden="true">
        {BEAMS.map((beam, index) => (
          <div
            key={`beam-${index}`}
            className="hero-light-beam"
            style={
              {
                "--beam-x": beam.x,
                "--beam-width": beam.width,
                "--beam-angle": beam.angle,
                "--beam-alpha": beam.alpha,
                "--beam-delay": `${index * -3.7}s`,
              } as React.CSSProperties
            }
          />
        ))}
        {BEAMS.map((beam, index) => (
          <div
            key={`source-${index}`}
            className="hero-light-source"
            style={{ left: `${beam.x * 100}%`, opacity: 0.28 + beam.alpha }}
          />
        ))}
        <div className="hero-light-haze" />
        <div className="hero-light-bloom" />
        <div className="hero-light-floor" />
      </div>
      <div className="hero-light-dust" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
    </>
  );
}
