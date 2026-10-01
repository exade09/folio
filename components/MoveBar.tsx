"use client";

import { motion } from "motion/react";
import { ease } from "@/lib/motion";

/**
 * A move drawn from a centre line: gains grow right in green, losses left in
 * red, each scaled against the day's largest move so the ranking reads at a
 * glance before any number does.
 */
export function MoveBar({ pct, max, delay = 0 }: { pct: number; max: number; delay?: number }) {
  const share = Math.min(1, Math.abs(pct) / max) * 50;
  const up = pct >= 0;
  return (
    <div className="hidden sm:block relative w-28 h-2 shrink-0" aria-hidden="true">
      <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--hairline-strong)]" />
      <motion.div
        className="absolute inset-y-0 rounded-full"
        style={{
          background: up ? "var(--lamp-green-bright)" : "var(--tag-red)",
          left: up ? "50%" : undefined,
          right: up ? undefined : "50%",
        }}
        initial={{ width: "0%" }}
        whileInView={{ width: `${share}%` }}
        viewport={{ once: true }}
        transition={{ delay, duration: 1, ease: ease.settle }}
      />
    </div>
  );
}
