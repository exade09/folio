"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { ease, dur } from "@/lib/motion";
import { markHydrated } from "./hydration";

// `reducedMotion="user"` turns every transform and layout animation into an
// instant change for anyone who has asked their OS for less motion, while
// opacity and colour still fade — so nothing pops, but nothing travels either.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    markHydrated();
  }, []);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: dur.base, ease: ease.settle }}>
      {children}
    </MotionConfig>
  );
}
