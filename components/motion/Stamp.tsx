"use client";

import { useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";
import { play as playSound, type SoundName } from "@/lib/sound";

type Tone = "red" | "green" | "brass";

const TONE: Record<Tone, string> = {
  red: "var(--tag-red)",
  green: "var(--lamp-green)",
  brass: "var(--brass)",
};

/**
 * A rubber stamp landing: it comes down large and tilted, hits, and a few
 * flecks of ink spray out from the edge on impact. `play` lets a parent hold
 * the stamp back until the moment it should land (a file finishing, a
 * refusal arriving) rather than on mount.
 */
export function Stamp({
  children,
  tone = "red",
  rotate = -8,
  delay = 0,
  play = true,
  size = "md",
  instant = false,
  sound,
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  rotate?: number;
  delay?: number;
  play?: boolean;
  size?: "sm" | "md" | "lg";
  /** Already landed — render it in place with no motion (e.g. revisiting a file). */
  instant?: boolean;
  /**
   * What it sounds like when it lands. Defaults to a stamp for red stamps
   * (a heavy one for md/lg, a lighter press for sm) and silence for the rest;
   * pass false to keep a red stamp quiet, e.g. on an automatic loop.
   */
  sound?: Extract<SoundName, "stamp" | "stampSoft"> | false;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const color = TONE[tone];
  const landing = sound === undefined ? (tone === "red" ? (size === "sm" ? "stampSoft" : "stamp") : false) : sound;

  // The thud lands with the stamp, not when it starts falling: the spring
  // reaches the paper roughly 90 ms after it is released.
  useEffect(() => {
    if (!play || instant || !landing) return;
    const id = setTimeout(() => playSound(landing), delay * 1000 + 90);
    return () => clearTimeout(id);
  }, [play, instant, landing, delay]);

  // Irregular but deterministic: the same spray on the server and the client,
  // so a stamp in server-rendered HTML hydrates without a mismatch.
  const flecks = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const angle = (i / 9) * Math.PI * 2 + ((i * 0.37) % 0.5);
        const dist = 26 + ((i * 53) % 30);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.6,
          r: 1.5 + ((i * 17) % 25) / 10,
        };
      }),
    []
  );

  return (
    <span className={`relative inline-flex ${className}`}>
      <motion.span
        className={`stamp-ink stamp-ink-${size}`}
        style={{ color }}
        initial={instant ? false : { scale: 2.4, rotate: rotate - 16, opacity: 0 }}
        animate={play ? { scale: 1, rotate, opacity: 1 } : undefined}
        transition={{ ...spring.stamp, delay, opacity: { duration: 0.08, delay } }}
      >
        {children}
      </motion.span>
      {!reduce && play && !instant && (
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
          {flecks.map((f, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{ width: f.r * 2, height: f.r * 2, background: color, left: -f.r, top: -f.r }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x: f.x, y: f.y, opacity: [0, 0.9, 0], scale: 1 }}
              transition={{ delay: delay + 0.09, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            />
          ))}
        </span>
      )}
    </span>
  );
}
