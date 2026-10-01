"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { dur, ease, spring } from "@/lib/motion";
import { INTRO_SEEN_KEY } from "@/lib/intro-script";

// The first time someone lands in a session, the page arrives as a closed
// manila case file: the wordmark is lettered on, a case number runs up, a
// stamp lands, and the cover swings open on its top edge to show the desk
// underneath. Everything else on the page waits for `ready` before making
// its own entrance, so the two never talk over each other.
//
// It plays once per session. A pre-paint script in <head> (see
// lib/intro-script.ts) marks the document before first paint when the
// intro has already been seen or motion is reduced, and CSS hides the cover
// on that mark — so a returning visitor never sees it flash.

const SEEN_KEY = INTRO_SEEN_KEY;

const IntroContext = createContext<boolean>(true);

/** True once the intro has finished (or was never going to play). */
export function useIntroReady(): boolean {
  return useContext(IntroContext);
}

type Phase = "letter" | "stamp" | "lift" | "done";

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("letter");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    try {
      sessionStorage.setItem(SEEN_KEY, "seen");
    } catch {
      // Private mode or blocked storage: the intro simply plays again next load.
    }
    setPhase("done");
  }, []);

  const skip = useCallback(() => {
    // A skip still lifts the cover rather than cutting it — cutting reads as
    // a glitch, a quick lift reads as the page doing what was asked.
    setPhase((p) => (p === "done" || p === "lift" ? p : "lift"));
    timers.current.forEach(clearTimeout);
    timers.current = [setTimeout(finish, 520)];
  }, [finish]);

  useEffect(() => {
    if (document.documentElement.dataset.intro === "skip") {
      void Promise.resolve().then(() => setPhase("done"));
      return;
    }
    timers.current = [
      setTimeout(() => setPhase("stamp"), 1050),
      setTimeout(() => setPhase("lift"), 1650),
      setTimeout(finish, 2450),
    ];
    const onKey = () => skip();
    window.addEventListener("keydown", onKey, { once: true });
    window.addEventListener("wheel", onKey, { once: true, passive: true });
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onKey);
    };
  }, [finish, skip]);

  const ready = phase === "lift" || phase === "done";

  return (
    <IntroContext.Provider value={ready}>
      {children}
      <AnimatePresence>{phase !== "done" && <IntroCover phase={phase} onSkip={skip} />}</AnimatePresence>
    </IntroContext.Provider>
  );
}

const WORD = "Folio";

function IntroCover({ phase, onSkip }: { phase: Phase; onSkip: () => void }) {
  const lifting = phase === "lift";

  return (
    <motion.div
      className="intro-cover fixed inset-0 z-[998] cursor-pointer"
      style={{ perspective: 1800 }}
      onClick={onSkip}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      aria-hidden="true"
    >
      {/* The desk the cover lifts off — a dark shade that thins as it opens. */}
      <motion.div
        className="absolute inset-0 bg-[var(--cabinet-blue-deep)]"
        initial={{ opacity: 0.55 }}
        animate={{ opacity: lifting ? 0 : 0.55 }}
        transition={{ duration: 0.8, ease: ease.glide }}
      />

      <motion.div
        className="intro-folder absolute inset-0 origin-top flex items-center justify-center"
        initial={{ rotateX: 0, y: 0 }}
        animate={
          lifting
            ? { rotateX: 96, y: "-6%", opacity: [1, 1, 0] }
            : { rotateX: 0, y: 0, opacity: 1 }
        }
        transition={{ duration: 0.85, ease: ease.glide, opacity: { times: [0, 0.7, 1], duration: 0.85 } }}
      >
        <div className="intro-tab" />
        <div className="relative text-center px-6">
          <motion.div
            className="font-mono text-[11px] tracking-[0.32em] uppercase text-[var(--ink-mute)]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: dur.base }}
          >
            Case file · Solana · read-only
          </motion.div>

          <h1 className="font-display text-[clamp(4.5rem,15vw,11rem)] leading-none mt-4 flex justify-center overflow-hidden pb-2">
            {WORD.split("").map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: "105%", rotate: 6 }}
                animate={{ y: "0%", rotate: 0 }}
                transition={{ delay: 0.18 + i * 0.07, duration: dur.long, ease: ease.glide }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>

          <motion.div
            className="h-px bg-[var(--hairline-strong)] mx-auto mt-3"
            initial={{ width: 0 }}
            animate={{ width: "min(420px, 70vw)" }}
            transition={{ delay: 0.55, duration: dur.long, ease: ease.settle }}
          />

          <motion.div
            className="font-mono text-sm text-[var(--ink-soft)] mt-4 tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            No. <RunningNumber />
          </motion.div>

          <AnimatePresence>
            {(phase === "stamp" || phase === "lift") && (
              <motion.div
                className="intro-stamp absolute left-1/2 top-1/2"
                initial={{ scale: 2.6, rotate: -22, opacity: 0, x: "-50%", y: "-40%" }}
                animate={{ scale: 1, rotate: -9, opacity: 1, x: "-10%", y: "10%" }}
                transition={spring.stamp}
              >
                On file
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The whole cover jolts once, the frame the stamp lands. */}
        {phase === "stamp" && <StampJolt />}
      </motion.div>

      <motion.div
        className="absolute bottom-6 inset-x-0 text-center font-mono text-[10px] tracking-[0.24em] uppercase text-[var(--paper-card)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: lifting ? 0 : 0.7 }}
        transition={{ delay: lifting ? 0 : 0.9 }}
      >
        click to open
      </motion.div>
    </motion.div>
  );
}

function StampJolt() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".intro-folder");
    el?.animate(
      [
        { translate: "0 0" },
        { translate: "0 3px" },
        { translate: "0 -1px" },
        { translate: "0 0" },
      ],
      { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }, []);
  return null;
}

/** Digits roll up to a six-figure case number, the way a counter does. */
function RunningNumber() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = 1 + Math.floor(Math.random() * 999);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - t, 4);
      setN(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span>F-{String(n).padStart(6, "0")}</span>;
}
