"use client";

import { motion } from "motion/react";
import { dur, ease } from "@/lib/motion";

/**
 * Rises and un-blurs into place the first time it scrolls into view. The
 * default root is the viewport, which is still correct inside the site's
 * independently scrolling panes: an intersection observer with no root
 * measures against the viewport after every scrolling ancestor has clipped.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const Tag = as === "section" ? motion.section : as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay, duration: dur.long, ease: ease.settle }}
    >
      {children}
    </Tag>
  );
}
