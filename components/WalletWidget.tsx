"use client";

import { useEffect, useState } from "react";
import { play } from "@/lib/sound";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type { CaseFile } from "@/lib/types";
import { dur, ease, spring, stagger } from "@/lib/motion";
import { TokenAvatar } from "./TokenAvatar";
import { FactList, ConfidenceStamp } from "./FactList";
import { CountUp } from "./motion/CountUp";
import { Scramble } from "./motion/Scramble";
import { Magnetic } from "./motion/Magnetic";

function formatBalance(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function WalletWidget({
  walletShort,
  cases,
  loading,
  error,
  selectedCaseNo,
  onSelect,
  onRescan,
}: {
  walletShort: string;
  cases: CaseFile[] | null;
  loading: boolean;
  error: string | null;
  selectedCaseNo: string | null;
  onSelect: (caseNo: string | null) => void;
  onRescan: () => void;
}) {
  const state = loading ? "loading" : error ? "error" : !cases ? "idle" : cases.length === 0 ? "empty" : "list";

  useEffect(() => {
    if (state === "list") play("deal");
  }, [state]);

  return (
    <div className="panel folder-tab overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b hairline">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--ink-mute)] flex items-center gap-2">
            Case index
            {state === "list" && cases && (
              <span className="normal-case tracking-normal">
                · <CountUp value={cases.length} duration={0.6} /> filed
              </span>
            )}
          </div>
          <div className="font-display text-xl mt-0.5">
            <Scramble text={walletShort} duration={800} />
          </div>
        </div>
        <Magnetic strength={0.2}>
          <button className="btn btn-ghost text-xs px-3.5 py-1.5 gap-1.5" onClick={onRescan} disabled={loading}>
            <motion.svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={loading ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.3 }}
            >
              <path
                d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.6h-2.6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
            {loading ? "Opening…" : "Open new files"}
          </button>
        </Magnetic>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {state === "loading" && (
          <Phase key="loading">
            <FilingLoader />
          </Phase>
        )}

        {state === "error" && (
          <Phase key="error">
            <motion.div
              className="px-5 py-6 text-sm text-[var(--tag-red)] flex items-start gap-3"
              animate={{ x: [0, -7, 6, -4, 2, 0] }}
              transition={{ duration: 0.5, ease: ease.settle }}
            >
              <span className="live-dot mt-1.5" data-tone="red" aria-hidden="true" />
              {error}
            </motion.div>
          </Phase>
        )}

        {state === "empty" && (
          <Phase key="empty">
            <div className="px-5 py-12 text-center">
              <EmptyDrawer />
              <p className="text-sm text-[var(--ink-mute)] mt-4">No SPL token positions found in this wallet.</p>
            </div>
          </Phase>
        )}

        {state === "list" && cases && (
          <Phase key="list">
            <LayoutGroup>
              <motion.ul
                className="max-h-[70vh] overflow-y-auto"
                initial="hidden"
                animate="shown"
                variants={{ shown: { transition: { staggerChildren: stagger.base, delayChildren: 0.05 } } }}
              >
                {cases.map((c, i) => (
                  <CaseRow
                    key={c.caseNo}
                    caseFile={c}
                    index={i}
                    selected={c.caseNo === selectedCaseNo}
                    onToggle={() => {
                      const opening = c.caseNo !== selectedCaseNo;
                      play(opening ? "flip" : "tap");
                      onSelect(opening ? c.caseNo : null);
                    }}
                  />
                ))}
              </motion.ul>
            </LayoutGroup>
          </Phase>
        )}
      </AnimatePresence>
    </div>
  );
}

function Phase({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: dur.micro, ease: ease.exit } }}
      transition={{ duration: dur.short, ease: ease.settle }}
    >
      {children}
    </motion.div>
  );
}

function CaseRow({
  caseFile: c,
  index,
  selected,
  onToggle,
}: {
  caseFile: CaseFile;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const up = c.overnightChangePct >= 0;
  // Cards are dealt, not faded: each comes down from a slightly different
  // angle and settles flat, so a list of twelve reads as a hand of files.
  const tilt = index % 2 === 0 ? -1.6 : 1.4;

  return (
    <motion.li
      layout="position"
      className="ledger-row relative"
      variants={{
        hidden: { opacity: 0, y: -22, rotate: tilt, scale: 0.97 },
        shown: {
          opacity: 1,
          y: 0,
          rotate: 0,
          scale: 1,
          transition: { duration: dur.long, ease: ease.glide },
        },
      }}
    >
      {selected && (
        <motion.div
          layoutId="case-highlight"
          className="absolute inset-0 bg-[var(--paper-soft)]"
          transition={spring.layout}
        >
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-[var(--brass)]" />
        </motion.div>
      )}

      <motion.button
        onClick={onToggle}
        aria-expanded={selected}
        className="relative w-full flex items-center gap-3 px-5 py-3.5 text-left group"
        whileHover={{ x: selected ? 0 : 3 }}
        whileTap={{ scale: 0.99 }}
        transition={spring.layout}
      >
        <motion.span
          className="shrink-0"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring.stamp, delay: 0.12 + index * stagger.base }}
        >
          <TokenAvatar symbol={c.symbol} logoUri={c.logoUri} size={34} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold truncate">{c.symbol}</span>
            <ConfidenceStamp confidence={c.metadataSource} delay={0.3 + index * stagger.base} />
          </div>
          <div className="text-xs text-[var(--ink-mute)] truncate flex items-center gap-1.5">
            <span className="font-mono">{c.caseNo}</span>
            <span>·</span>
            <span>{formatBalance(c.balanceUi)} held</span>
          </div>
        </div>
        <div
          className={`font-mono text-sm shrink-0 flex items-center gap-1 ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
        >
          <motion.span
            aria-hidden="true"
            initial={{ y: up ? 6 : -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 + index * stagger.base, duration: dur.base, ease: ease.settle }}
          >
            {up ? "▲" : "▼"}
          </motion.span>
          <CountUp value={c.overnightChangePct} decimals={1} suffix="%" signed delay={0.2 + index * stagger.base} />
        </div>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="shrink-0 text-[var(--ink-mute)]"
          animate={{ rotate: selected ? 90 : 0 }}
          transition={spring.layout}
          aria-hidden="true"
        >
          <path d="M4 2.5 7.5 6 4 9.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </motion.svg>
      </motion.button>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="detail"
            className="relative overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: dur.base, ease: ease.glide }, opacity: { duration: dur.short } }}
          >
            <div className="px-5 pb-5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-mute)] mb-2">
                <Scramble text={c.caseNo} duration={500} />
                <span>
                  filed{" "}
                  {new Date(c.filedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <FactList caseFile={c} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

const LOADER_LINES = [
  "Reading token accounts off the chain…",
  "Looking names up on Jupiter…",
  "Opening a file on each position…",
  "Numbering the files…",
];

/**
 * What the index shows while a wallet is being read: a beam sweeping a stack
 * of blank index cards, and a status line that walks through what is actually
 * happening on the server, in order.
 */
function FilingLoader() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, LOADER_LINES.length - 1)), 1300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden" role="status" aria-live="polite">
      <div className="scan-beam" aria-hidden="true" />
      <div className="px-5 pt-5 pb-3 h-10 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            className="text-sm text-[var(--ink-soft)] font-medium"
            initial={{ y: 14, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -14, opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: dur.short, ease: ease.settle }}
          >
            {LOADER_LINES[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <ul aria-hidden="true">
        {Array.from({ length: 5 }, (_, k) => (
          <motion.li
            key={k}
            className="ledger-row flex items-center gap-3 px-5 py-3.5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1 - k * 0.14, y: 0 }}
            transition={{ delay: k * 0.08, duration: dur.base, ease: ease.settle }}
          >
            <div className="skeleton-line rounded-full w-[34px] h-[34px] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-line h-3" style={{ width: `${38 + ((k * 23) % 30)}%` }} />
              <div className="skeleton-line h-2.5" style={{ width: `${24 + ((k * 17) % 20)}%` }} />
            </div>
            <div className="skeleton-line h-3 w-12" />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function EmptyDrawer() {
  return (
    <motion.svg
      width="96"
      height="72"
      viewBox="0 0 96 72"
      fill="none"
      className="mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: ease.settle }}
      aria-hidden="true"
    >
      <rect x="6" y="8" width="84" height="58" rx="6" fill="var(--cabinet-blue)" stroke="var(--ink)" strokeWidth="1.5" />
      <motion.g
        initial={{ x: 0 }}
        animate={{ x: [0, 0, 10, 10] }}
        transition={{ duration: 1.2, times: [0, 0.3, 0.7, 1], ease: ease.settle }}
      >
        <rect x="14" y="20" width="68" height="36" rx="4" fill="var(--paper-card)" stroke="var(--ink)" strokeWidth="1.5" />
        <rect x="38" y="32" width="20" height="6" rx="3" fill="var(--brass)" />
      </motion.g>
    </motion.svg>
  );
}
