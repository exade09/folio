"use client";

import { useEffect, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import {
  installSoundUnlock,
  isSoundEnabled,
  play,
  setSoundEnabled,
  subscribeSound,
} from "@/lib/sound";

/**
 * The speaker in the header. Also the one place the audio unlock is
 * installed, since the header is on every page.
 */
export function SoundToggle() {
  // The server cannot know the visitor's choice, so it renders "on" and the
  // client corrects it after hydration if they had turned it off.
  const on = useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);

  useEffect(() => installSoundUnlock(), []);

  function toggle() {
    const next = !on;
    setSoundEnabled(next);
    if (next) play("tap", { delayMs: 30 });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      title={on ? "Sound on" : "Sound off"}
      className="w-8 h-8 rounded-full border hairline flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors shrink-0"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5V6Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <motion.path
          d="M10.4 5.8a3 3 0 0 1 0 4.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />
        <motion.path
          d="M12.1 4a5.5 5.5 0 0 1 0 8"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
          transition={{ duration: 0.25, delay: on ? 0.08 : 0 }}
        />
        <motion.path
          d="M10.5 6l3.5 4M14 6l-3.5 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          initial={false}
          animate={{ opacity: on ? 0 : 1, scale: on ? 0.6 : 1 }}
          style={{ transformOrigin: "12.25px 8px" }}
          transition={{ duration: 0.2 }}
        />
      </svg>
    </button>
  );
}
