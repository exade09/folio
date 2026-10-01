"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { dur, ease, stagger } from "@/lib/motion";
import { CountUp } from "./motion/CountUp";
import { Scramble } from "./motion/Scramble";
import { Stamp } from "./motion/Stamp";

// A worked example of what a file looks like, filling itself in on the pitch.
// Every ticker here is invented and the card says SPECIMEN on it in red: this
// is the one place on the site that shows figures without a source, so it
// has to be unmistakable that none of them describe a real token.

interface Specimen {
  ticker: string;
  caseNo: string;
  ageDays: number;
  top10: number;
  venue: string;
  liqOfCap: number;
  mintRenounced: boolean;
  freezeRenounced: boolean;
  change24h: number;
}

const SPECIMENS: Specimen[] = [
  {
    ticker: "$INKWELL",
    caseNo: "F-000214",
    ageDays: 412,
    top10: 38.2,
    venue: "Raydium CLMM",
    liqOfCap: 14.6,
    mintRenounced: true,
    freezeRenounced: true,
    change24h: -3.4,
  },
  {
    ticker: "$STAPLE",
    caseNo: "F-000215",
    ageDays: 9,
    top10: 71.6,
    venue: "PumpSwap",
    liqOfCap: 3.1,
    mintRenounced: true,
    freezeRenounced: false,
    change24h: 48.2,
  },
  {
    ticker: "$DRAWER",
    caseNo: "F-000216",
    ageDays: 188,
    top10: 22.9,
    venue: "Meteora DLMM",
    liqOfCap: 8.8,
    mintRenounced: false,
    freezeRenounced: true,
    change24h: -12.7,
  },
];

const CYCLE_MS = 6800;

export function SpecimenFile({ play }: { play: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!play || !inView || reduce) return;
    const id = setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % SPECIMENS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [play, inView, reduce]);

  const s = SPECIMENS[i];

  return (
    <div ref={ref} className="relative" style={{ perspective: 1600, perspectiveOrigin: "50% 0%" }}>
      {/* Two sheets underneath, so the file reads as the top of a stack. */}
      <div className="absolute inset-x-3 -bottom-2 top-3 panel opacity-60 rotate-[1.2deg]" aria-hidden="true" />
      <div className="absolute inset-x-1.5 -bottom-1 top-1.5 panel opacity-80 -rotate-[0.8deg]" aria-hidden="true" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={s.caseNo}
          className="panel folder-tab relative overflow-hidden origin-top"
          initial={{ rotateX: -38, opacity: 0, y: -14 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          exit={{ rotateX: 42, opacity: 0, y: 18, transition: { duration: 0.38, ease: ease.exit } }}
          transition={{ duration: 0.7, ease: ease.glide }}
          aria-label={`Specimen case file for an invented token, ${s.ticker}`}
        >
          <header className="flex items-center justify-between gap-3 px-5 py-4 border-b hairline">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)]">
                What a file looks like
              </div>
              <div className="font-display text-xl mt-0.5 flex items-center gap-2">
                <Scramble text={s.ticker} duration={520} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <Stamp tone="red" size="sm" rotate={-4} play={play} delay={0.1} sound={false}>
                Specimen
              </Stamp>
              <div className="font-mono text-xs text-[var(--ink-mute)] mt-1.5">
                <Scramble text={s.caseNo} duration={640} delay={120} />
              </div>
            </div>
          </header>

          <motion.ol
            className="relative"
            initial="hidden"
            animate={play ? "shown" : "hidden"}
            variants={{ shown: { transition: { staggerChildren: stagger.loose * 2.2, delayChildren: 0.25 } } }}
          >
            <Line n={1} label="Age" hint="Days since its first pool">
              <CountUp value={s.ageDays} suffix=" days" delay={0.35} className="font-display text-lg" />
            </Line>

            <Line n={2} label="Holders" hint="What the top 10 hold">
              <div className="flex items-center gap-3 w-full">
                <span className="font-display text-lg shrink-0">
                  <CountUp value={s.top10} decimals={1} suffix="%" delay={0.55} />
                </span>
                <Meter pct={s.top10} tone={s.top10 > 50 ? "red" : "ink"} delay={0.6} />
              </div>
            </Line>

            <Line n={3} label="Liquidity" hint="Next to market cap, and where it sits">
              <div className="flex items-center gap-3 w-full">
                <span className="font-display text-lg shrink-0">{s.venue}</span>
                <Meter pct={s.liqOfCap} tone={s.liqOfCap < 5 ? "red" : "green"} delay={0.85} />
                <span className="text-[10px] font-mono uppercase tracking-wide shrink-0 text-[var(--ink-mute)]">
                  {s.liqOfCap}% of mcap
                </span>
              </div>
            </Line>

            <Line n={4} label="Authorities" hint="Who can still mint or freeze">
              <span className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                <span className={s.mintRenounced ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}>
                  {s.mintRenounced ? "Mint renounced" : "Mint authority live"}
                </span>
                <span className="text-[var(--ink-mute)]">·</span>
                <span className={s.freezeRenounced ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}>
                  {s.freezeRenounced ? "Freeze renounced" : "Freeze authority live"}
                </span>
              </span>
            </Line>

            <Line n={5} label="Market" hint="Price change over 24 hours">
              <span className={`font-mono text-lg ${s.change24h >= 0 ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}>
                {s.change24h >= 0 ? "▲ " : "▼ "}
                <CountUp value={s.change24h} decimals={1} suffix="%" signed delay={1.05} />
              </span>
            </Line>
          </motion.ol>

          <div className="absolute right-6 bottom-16 pointer-events-none">
            <Stamp tone="red" size="lg" rotate={-11} delay={1.9} play={play} sound={false}>
              Filed
            </Stamp>
          </div>

          <footer className="px-5 py-3 border-t hairline text-[11px] font-mono text-[var(--ink-mute)] flex items-center justify-between">
            <span>invented token · illustrative figures</span>
            <span className="flex gap-1" aria-hidden="true">
              {SPECIMENS.map((sp, k) => (
                <span
                  key={sp.caseNo}
                  className={`h-1 rounded-full transition-all duration-500 ${k === i ? "w-5 bg-[var(--ink-soft)]" : "w-1.5 bg-[var(--hairline-strong)]"}`}
                />
              ))}
            </span>
          </footer>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

function Line({
  n,
  label,
  hint,
  children,
}: {
  n: number;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <motion.li
      className="ledger-row ledger-hover flex items-start gap-4 px-5 py-3.5"
      variants={{
        hidden: { opacity: 0, x: -18, filter: "blur(4px)" },
        shown: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: dur.base, ease: ease.settle } },
      }}
    >
      <span className="font-mono text-[11px] text-[var(--ink-mute)] pt-1 w-5 shrink-0">
        {String(n).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold text-sm">{label}</span>
          <span className="text-[11px] text-[var(--ink-mute)] hidden md:inline truncate">{hint}</span>
        </div>
        <div className="mt-1 flex items-center min-h-7">{children}</div>
      </div>
    </motion.li>
  );
}

function Meter({ pct, tone, delay }: { pct: number; tone: "ink" | "red" | "green"; delay: number }) {
  const color =
    tone === "red" ? "var(--tag-red)" : tone === "green" ? "var(--lamp-green-bright)" : "var(--ink-soft)";
  return (
    <div className="meter flex-1 min-w-12" role="presentation">
      <motion.span
        style={{ background: color }}
        initial={{ width: "0%" }}
        animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        transition={{ delay, duration: 1.1, ease: ease.settle }}
      />
    </div>
  );
}
