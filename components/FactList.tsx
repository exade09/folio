"use client";

import { motion } from "motion/react";
import type { CaseFile } from "@/lib/types";
import type { TokenFile } from "@/lib/token-file";
import { dur, ease, stagger } from "@/lib/motion";
import { shortAddr, shortDate, signedPct, usdCompact, usdPrice, utcTime } from "@/lib/format-money";
import { CountUp } from "./motion/CountUp";
import { Stamp } from "./motion/Stamp";

// The facts of a filed position, all read live when the file was opened: the
// chain itself, Jupiter and DexScreener. Each line draws the one visual that
// makes its number legible — a meter for a share, a flag for a switch — and
// names its source under it. Where no source answered, the line says so.

const list = {
  hidden: {},
  shown: { transition: { staggerChildren: stagger.loose, delayChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: dur.base, ease: ease.settle } },
};

interface Line {
  label: string;
  visual: React.ReactNode;
  details: React.ReactNode[];
  source: string;
}

export function FactList({ caseFile, roomy = false }: { caseFile: CaseFile; roomy?: boolean }) {
  const t = caseFile.token;
  const pad = roomy ? "px-6 py-5" : "py-3";

  if (!t) {
    return (
      <p className={`text-sm text-[var(--ink-mute)] ${pad}`}>
        The chain could not be read for this token when the file was opened. Open new files to try again
      </p>
    );
  }

  const lines = tokenLines(t);

  return (
    <motion.div variants={list} initial="hidden" animate="shown" className={roomy ? "" : "space-y-1"}>
      {lines.map((line, i) => (
        <motion.div
          key={line.label}
          variants={item}
          className={`${roomy ? "ledger-row" : "border-t hairline first:border-0"} ${pad}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">{line.label}</span>
            <ConfidenceStamp delay={0.25 + i * stagger.loose} />
          </div>
          <div className="mt-1">{line.visual}</div>
          {line.details.map((d, k) => (
            <p key={k} className="text-sm text-[var(--ink-soft)] mt-1.5">
              {d}
            </p>
          ))}
          <p className="text-xs text-[var(--ink-mute)] mt-1 font-mono">source: {line.source}</p>
        </motion.div>
      ))}
      <p className={`text-[11px] font-mono text-[var(--ink-mute)] ${roomy ? "px-6 py-3" : "pt-2"}`}>
        read {utcTime(t.readAt)} · not checked: {t.notChecked.join("; ")}
      </p>
    </motion.div>
  );
}

function tokenLines(t: TokenFile): Line[] {
  const lines: Line[] = [];

  // 01 — age
  lines.push({
    label: "Age",
    visual: t.age ? (
      <Headline>
        <CountUp value={t.age.days} delay={0.1} /> {t.age.days === 1 ? "day" : "days"} since its first pool
      </Headline>
    ) : (
      <Headline>No first pool on record</Headline>
    ),
    details: t.age
      ? [
          `First pool opened ${shortDate(t.age.firstPoolAt)}${t.age.launchpad ? ` · launched on ${t.age.launchpad}` : ""}${t.age.graduatedAt ? ` · graduated ${shortDate(t.age.graduatedAt)}` : ""}`,
          "This is when trading began, not when the mint was created",
        ]
      : ["Jupiter has no trading pool on record for it"],
    source: "Jupiter · firstPool.createdAt",
  });

  // 02 — holders
  const holderMeters: React.ReactNode[] = [];
  if (t.holders?.top10SharePct !== undefined) {
    holderMeters.push(
      <MeterRow key="j10" label="Top 10" pct={t.holders.top10SharePct} warn={t.holders.top10SharePct > 50} delay={0.25} />
    );
  }
  if (t.largestAccounts) {
    holderMeters.push(
      <MeterRow key="a1" label="Acct #1" pct={t.largestAccounts.top1Pct} warn={t.largestAccounts.top1Pct > 20} delay={0.32} />,
      <MeterRow key="a10" label="Accts 1–10" pct={t.largestAccounts.top10Pct} warn={t.largestAccounts.top10Pct > 60} delay={0.4} />
    );
  }
  lines.push({
    label: "Holders",
    visual: (
      <div className="space-y-2 mt-1">
        <Headline>
          {t.holders?.count !== undefined ? (
            <>
              <CountUp value={t.holders.count} delay={0.15} /> holders
            </>
          ) : (
            "Holder count not reported"
          )}
        </Headline>
        {holderMeters}
      </div>
    ),
    details: [
      ...(t.holders?.change24hPct !== undefined ? [`Holder count ${signedPct(t.holders.change24hPct)} over the last 24 hours`] : []),
      ...(t.largestAccounts ? [t.largestAccounts.caveat] : []),
    ],
    source: [t.holders ? "Jupiter · holderCount, audit.topHoldersPercentage" : null, t.largestAccounts ? "Solana RPC · getTokenLargestAccounts" : null]
      .filter(Boolean)
      .join(" · ") || "no source answered",
  });

  // 03 — liquidity
  const liq = t.market?.liquidityUsd;
  const cap = t.market?.marketCapUsd ?? t.market?.fdvUsd;
  const ratio = liq !== undefined && cap ? (liq / cap) * 100 : undefined;
  lines.push({
    label: "Liquidity",
    visual: (
      <div className="space-y-2 mt-1">
        <Headline>{liq !== undefined ? `${usdCompact(liq)} in liquidity` : "Liquidity not reported"}</Headline>
        {ratio !== undefined && <MeterRow label="of mcap" pct={ratio} warn={ratio < 2} good={ratio >= 10} delay={0.3} />}
      </div>
    ),
    details: [
      ...(t.largestPool
        ? [
            <>
              Largest pool: {t.largestPool.venue}
              {t.largestPool.liquidityUsd !== undefined ? `, ${usdCompact(t.largestPool.liquidityUsd)}` : ""} ·{" "}
              {t.largestPool.url ? (
                <a href={t.largestPool.url} target="_blank" rel="noopener noreferrer" className="font-mono underline decoration-dotted underline-offset-2 hover:text-[var(--foreground)]">
                  {shortAddr(t.largestPool.address)} ↗
                </a>
              ) : (
                <span className="font-mono">{shortAddr(t.largestPool.address)}</span>
              )}
            </>,
          ]
        : []),
      "Whether it can leave was not checked — no public source here reports lock status",
    ],
    source: ["Jupiter · liquidity", t.largestPool ? "DexScreener · pairs" : null].filter(Boolean).join(" · "),
  });

  // 04 — authorities
  const mintOff = t.authorities.mintAuthority === null;
  const freezeOff = t.authorities.freezeAuthority === null;
  lines.push({
    label: "Authorities",
    visual: (
      <div className="flex flex-wrap gap-1.5 mt-1">
        <Flag ok={mintOff} label={mintOff ? "Mint renounced" : "Mint authority live"} />
        <Flag ok={freezeOff} label={freezeOff ? "Freeze renounced" : "Freeze authority live"} />
        <Flag neutral label={t.program} />
        {t.extensions?.map((x) => <Flag key={x.name} ok={false} label={x.name} />)}
      </div>
    ),
    details: [
      ...(!mintOff ? [`${shortAddr(t.authorities.mintAuthority!)} can mint more of it`] : []),
      ...(!freezeOff ? [`${shortAddr(t.authorities.freezeAuthority!)} can freeze holders' accounts`] : []),
      ...(t.extensions ?? []).map((x) => `${x.name}: ${x.detail}`),
      ...(t.dev && (t.dev.tokensMintedByDev !== undefined || t.dev.devBalancePct !== undefined)
        ? [
            `Deployer${t.dev.tokensMintedByDev !== undefined ? ` has launched ${t.dev.tokensMintedByDev} token${t.dev.tokensMintedByDev === 1 ? "" : "s"}` : ""}${t.dev.devBalancePct !== undefined ? `${t.dev.tokensMintedByDev !== undefined ? " and" : ""} holds ${t.dev.devBalancePct.toFixed(2)}% of this one` : ""}`,
          ]
        : []),
    ],
    source: ["Solana RPC · mint account", t.dev ? "Jupiter audit" : null].filter(Boolean).join(" · "),
  });

  // 05 — market
  const ch = t.market?.change24hPct;
  lines.push({
    label: "Market",
    visual: t.market ? (
      <Headline>
        <span className="font-mono text-base">{usdPrice(t.market.priceUsd)}</span>
        {ch !== undefined && (
          <span className={`font-mono text-sm ml-2 ${ch >= 0 ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}>
            {ch >= 0 ? "▲" : "▼"} {signedPct(ch)}
          </span>
        )}
      </Headline>
    ) : (
      <Headline>Not listed on Jupiter</Headline>
    ),
    details: t.market
      ? [
          `Market cap ${usdCompact(t.market.marketCapUsd ?? t.market.fdvUsd)}${t.activity?.traders24h !== undefined ? ` · ${t.activity.traders24h.toLocaleString("en-US")} traders in 24h` : ""}`,
          ...(t.activity?.organicScore !== undefined
            ? [`Organic score ${Math.round(t.activity.organicScore)}${t.activity.organicLabel ? ` (${t.activity.organicLabel})` : ""} — Jupiter's measure of real trading against wash trading`]
            : []),
          ...(t.links.length
            ? [
                <span key="links" className="flex flex-wrap gap-1.5">
                  {t.links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono px-2 py-0.5 rounded-full border hairline hover:border-[var(--foreground)] transition-colors"
                    >
                      {l.kind === "x" ? "X" : l.kind === "telegram" ? "Telegram" : safeHost(l.url)} ↗
                    </a>
                  ))}
                </span>,
              ]
            : []),
        ]
      : ["No price source answered for this token"],
    source: "Jupiter · usdPrice, mcap, stats24h",
  });

  return lines;
}

function safeHost(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "website";
  }
}

function Headline({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-lg leading-snug">{children}</div>;
}

function Flag({ label, ok, neutral }: { label: string; ok?: boolean; neutral?: boolean }) {
  const color = neutral ? "var(--ink-mute)" : ok ? "var(--lamp-green)" : "var(--tag-red)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
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
      <span className="w-[4.5rem] shrink-0 font-mono text-[var(--ink-mute)]">{label}</span>
      <div className="meter flex-1" role="presentation">
        <motion.span
          style={{ background: color }}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(1.5, Math.min(100, pct))}%` }}
          transition={{ delay, duration: 1.1, ease: ease.settle }}
        />
      </div>
      <span className="w-14 text-right font-mono tabular-nums">
        <CountUp value={pct} decimals={pct >= 10 || pct % 1 === 0 ? 1 : 2} suffix="%" delay={delay} />
      </span>
    </div>
  );
}

export function ConfidenceStamp({ live = true, delay = 0 }: { live?: boolean; delay?: number }) {
  return (
    <Stamp tone={live ? "green" : "brass"} size="sm" rotate={-3} delay={delay}>
      {live ? "Live" : "Unread"}
    </Stamp>
  );
}
