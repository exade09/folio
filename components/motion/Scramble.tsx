"use client";

import { useEffect, useState } from "react";
import { isHydrated, prefersReducedMotion } from "./hydration";

const GLYPHS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Text that decodes into place: each character cycles through random glyphs
 * and locks, left to right. Used for case numbers and addresses — things a
 * machine reads off the chain — never for prose. Separators (`-`, `…`, `·`,
 * spaces) lock immediately so the shape of the value is visible from the
 * first frame.
 */
export function Scramble({
  text,
  duration = 700,
  delay = 0,
  className = "",
}: {
  text: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const [out, setOut] = useState(() =>
    isHydrated() && !prefersReducedMotion() ? scrambled(text, 0) : text
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delay;
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      setOut(t >= 1 ? text : scrambled(text, t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, delay]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}

function scrambled(text: string, progress: number) {
  const locked = Math.floor(progress * text.length);
  let s = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i < locked || /[\s\-–—…·.:/]/.test(ch)) s += ch;
    else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return s;
}
