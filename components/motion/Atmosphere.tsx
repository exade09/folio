"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { spring } from "@/lib/motion";

// The room the site sits in. Three layers behind all content:
//   1. the ruled paper grid, drifting a few pixels against the cursor so the
//      desk reads as having depth under the cards laid on it;
//   2. a desk-lamp pool of warm light that follows the cursor on a soft
//      spring, and a vignette that keeps the corners dim;
//   3. dust hanging in that light, drawn to a canvas.
// All of it is pointer-driven through motion values, so none of it re-renders
// React. On touch devices there is no cursor to follow: the lamp parks
// upper-left and the grid holds still.

export function Atmosphere() {
  const reduce = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);

  const px = useMotionValue(0.28);
  const py = useMotionValue(0.18);
  const sx = useSpring(px, spring.follow);
  const sy = useSpring(py, spring.follow);

  const lampX = useTransform(sx, (v) => `${v * 100}%`);
  const lampY = useTransform(sy, (v) => `${v * 100}%`);
  // Light brightens the desk rather than tinting it: a warm near-white core
  // with only a trace of brass at the falloff. A brass core read as a grey
  // smudge on the pale blue.
  const lamp = useMotionTemplate`radial-gradient(620px circle at ${lampX} ${lampY}, rgba(255, 249, 232, 0.62) 0%, rgba(255, 240, 205, 0.26) 34%, rgba(204, 169, 100, 0.06) 56%, transparent 72%)`;

  const gridX = useTransform(sx, [0, 1], [10, -10]);
  const gridY = useTransform(sy, [0, 1], [8, -8]);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!finePointer || reduce) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth);
      py.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [finePointer, reduce, px, py]);

  return (
    <div className="atmosphere" aria-hidden="true">
      <motion.div className="atmosphere-grid" style={{ x: gridX, y: gridY }} />
      <motion.div className="absolute inset-0" style={{ backgroundImage: lamp }} />
      <div className="atmosphere-vignette" />
      {!reduce && <DustField lampX={sx} lampY={sy} />}
    </div>
  );
}

type Spring = ReturnType<typeof useSpring>;

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  scrap: boolean;
  rot: number;
  vr: number;
}

/**
 * Dust in lamplight. Motes drift up and sideways, catching light the nearer
 * they are to the lamp; one in twelve is a torn scrap of paper instead of a
 * speck. The loop pauses whenever the tab is hidden, and the count scales
 * with the window so a phone isn't asked to draw what a monitor is.
 */
function DustField({ lampX, lampY }: { lampX: Spring; lampY: Spring }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let motes: Mote[] = [];
    let raf = 0;
    let last = performance.now();

    const spawn = (anywhere: boolean): Mote => {
      const scrap = Math.random() < 0.08;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 10,
        r: scrap ? 3 + Math.random() * 4 : 0.6 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 6,
        vy: -(4 + Math.random() * 10),
        phase: Math.random() * Math.PI * 2,
        scrap,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(90, (w * h) / 22000));
      motes = Array.from({ length: target }, () => spawn(true));
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const lx = lampX.get() * w;
      const ly = lampY.get() * h;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.phase += dt * 0.8;
        m.x += (m.vx + Math.sin(m.phase) * 4) * dt;
        m.y += m.vy * dt;
        m.rot += m.vr * dt;
        if (m.y < -12 || m.x < -12 || m.x > w + 12) motes[i] = spawn(false);

        const d = Math.hypot(m.x - lx, m.y - ly);
        const lit = Math.max(0, 1 - d / 520);
        const alpha = 0.07 + lit * 0.5;

        if (m.scrap) {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.rot);
          ctx.fillStyle = `rgba(251, 246, 232, ${alpha * 0.9})`;
          ctx.strokeStyle = `rgba(34, 48, 71, ${alpha * 0.35})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.rect(-m.r, -m.r * 0.7, m.r * 2, m.r * 1.4);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          // Brass rather than white: on a pale desk a white speck vanishes,
          // a warm one reads as dust catching the lamp.
          ctx.fillStyle = `rgba(${Math.round(150 + lit * 35)}, ${Math.round(112 + lit * 34)}, ${Math.round(60 + lit * 19)}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [lampX, lampY]);

  return <canvas ref={ref} className="absolute inset-0" />;
}
