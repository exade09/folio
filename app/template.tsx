"use client";

import { motion } from "motion/react";
import { dur, ease } from "@/lib/motion";

// Re-mounted on every navigation, which is exactly what a page transition
// needs: each route rises into place as the last one is put away. Opacity and
// a short travel only — a blur across the whole two-pane shell costs more
// than it is worth on a low-end laptop.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: ease.settle }}
    >
      {children}
    </motion.div>
  );
}
