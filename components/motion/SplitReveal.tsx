"use client";

import { motion } from "motion/react";
import { dur, ease } from "@/lib/motion";

/**
 * Words rise into place from behind a mask, one after another, the way a line
 * of type is set. Each word keeps its own overflow mask so descenders are not
 * clipped by the line above; the padding-bottom on the mask is what makes room
 * for them.
 */
export function SplitReveal({
  text,
  play = true,
  delay = 0,
  step = 0.055,
  className = "",
  as: Tag = "span",
}: {
  text: string;
  play?: boolean;
  delay?: number;
  step?: number;
  className?: string;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const words = text.split(" ");
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%", rotate: 4 }}
            animate={play ? { y: "0%", rotate: 0 } : undefined}
            transition={{ delay: delay + i * step, duration: dur.long, ease: ease.glide }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
