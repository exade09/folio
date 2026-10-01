"use client";

import { motion } from "motion/react";
import type { CaseFile, Confidence } from "@/lib/types";
import { factLines } from "@/lib/format";
import { dur, ease, stagger } from "@/lib/motion";
import { CountUp } from "./motion/CountUp";
import { Stamp } from "./motion/Stamp";

// The five facts of a file, each drawn with the one visual that makes its
// number legible at a glance — a meter for a share, a status light for
// activity — under the same headline, detail and source text the rest of the
// product uses (lib/format.ts), so the picture never says something the words
// don't.

const list = {
  hidden: {},
  shown: { transition: { staggerChildren: stagger.loose, delayChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: dur.base, ease: ease.settle } },
};

export function FactList({ caseFile, roomy = false }: { caseFile: CaseFile; roomy?: boolean }) {
  const lines = factLines(caseFile);
  const { contractAge, holderConcentration, liquidity, creatorFee, socials } = caseFile.facts;
  const pad = roomy ? "px-6 py-5" : "py-3";

  const visuals: React.ReactNode[] = [
    <Headline key="age">
      <CountUp value={contractAge.value.days} suffix=" days old" delay={0.1} />
    </Headline>,

    <div key="holders" className="space-y-2 mt-1">
      <Headline>
        <CountUp value={holderConcentration.value.holderCount} delay={0.15} /> holders
      </Headline>
      <MeterRow label="Top 10" pct={holderConcentration.value.top10Pct} warn={holderConcentration.value.top10Pct > 50} delay={0.25} />
      <MeterRow label="Top 1" pct={holderConcentration.value.top1Pct} warn={holderConcentration.value.top1Pct > 20} delay={0.35} />
    </div>,

    <div key="liq" className="space-y-2 mt-1">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Headline>{liquidity.value.venue}</Headline>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide ${liquidity.value.canLeave ? "text-[var(--tag-red)]" : "text-[var(--lamp-green)]"}`}
        >
          {liquidity.value.canLeave ? (
            <span className="live-dot" data-tone="red" aria-hidden="true" />
          ) : (
            <LockGlyph />
          )}
          {liquidity.value.canLeave ? "can leave" : "cannot leave"}
        </span>
      </div>
      <MeterRow label="Locked" pct={liquidity.value.lockedPct} good delay={0.3} />
    </div>,

    <Headline key="fee">
      {creatorFee.value.venue} ·{" "}
      <CountUp value={creatorFee.value.unclaimedSol} decimals={2} suffix=" SOL" delay={0.2} />
    </Headline>,

    <div key="soc" className="flex items-center gap-2">
      <span
        className="live-dot"
        data-tone={socials.value.status === "active" ? undefined : socials.value.status === "quiet" ? "brass" : "mute"}
        aria-hidden="true"
      />
      <Headline>{lines[4].headline}</Headline>
    </div>,
  ];

  return (
    <motion.div variants={list} initial="hidden" animate="shown" className={roomy ? "" : "space-y-1"}>
      {lines.map((line, i) => (
        <motion.div
          key={line.label}
          variants={item}
          className={`${roomy ? "ledger-row" : "border-t hairline first:border-0"} ${pad}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">
              {line.label}
            </span>
            <ConfidenceStamp confidence={line.confidence} delay={0.25 + i * stagger.loose} />
          </div>
          <div className="mt-1">{visuals[i]}</div>
          <p className="text-sm text-[var(--ink-soft)] mt-1.5">{line.detail}</p>
          <p className="text-xs text-[var(--ink-mute)] mt-1 font-mono">source: {line.source}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return <div className={`font-display text-lg leading-snug`}>{children}</div>;
}

function MeterRow({
  label,
  pct,
  warn = false,
  good = false,
  delay,
}: {
  label: string;
  pct: number;
  warn?: boolean;
  good?: boolean;
  delay: number;
}) {
  const color = warn ? "var(--tag-red)" : good ? "var(--lamp-green-bright)" : "var(--ink-soft)";
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-12 shrink-0 font-mono text-[var(--ink-mute)]">{label}</span>
      <div className="meter flex-1" role="presentation">
        <motion.span
          style={{ background: color }}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(1.5, Math.min(100, pct))}%` }}
          transition={{ delay, duration: 1.1, ease: ease.settle }}
        />
      </div>
      <span className="w-12 text-right font-mono tabular-nums">
        <CountUp value={pct} decimals={pct % 1 === 0 ? 0 : 1} suffix="%" delay={delay} />
      </span>
    </div>
  );
}

export function ConfidenceStamp({ confidence, delay = 0 }: { confidence: Confidence; delay?: number }) {
  return (
    <Stamp tone={confidence === "live" ? "green" : "brass"} size="sm" rotate={-3} delay={delay}>
      {confidence === "live" ? "Live" : "Demo"}
    </Stamp>
  );
}

function LockGlyph() {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true">
      <rect x="1" y="5" width="9" height="6.2" rx="1.4" fill="currentColor" />
      <path d="M3 5V3.6a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
