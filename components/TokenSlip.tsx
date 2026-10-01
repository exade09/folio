"use client";

import { AnimatePresence, motion } from "motion/react";
import type { TokenFile } from "@/lib/token-file";
import { shortAddr, signedPct, usdCompact, usdPrice } from "@/lib/format-money";
import { dur, ease } from "@/lib/motion";
import { TokenAvatar } from "./TokenAvatar";

/**
 * The cover sheet of a file opened from a pasted contract address: who the
 * token is, the market at a glance, and the on-chain switches that matter
 * most. His read on it follows underneath.
 */
export function TokenSlip({ mint, file, failed }: { mint: string; file?: TokenFile; failed?: boolean }) {
  return (
    <motion.section
      className="panel relative overflow-hidden px-5 pt-4 pb-4"
      initial={{ opacity: 0, y: 12, rotate: -0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: dur.base, ease: ease.settle }}
      aria-label={file ? `Token file on ${file.name} (${file.symbol})` : "Opening a token file"}
    >
      <div className="flex items-center gap-3">
        <TokenAvatar symbol={file?.symbol ?? "?"} mint={mint} size={40} />
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {file ? (
              <motion.div
                key="name"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur.short, ease: ease.settle }}
                className="font-display text-lg leading-tight truncate flex items-center gap-1.5"
              >
                {file.name}
                {file.verifiedOnJupiter && (
                  <span className="text-[var(--lamp-green)]" title="Verified on Jupiter" aria-label="Verified on Jupiter">
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                      <circle cx="8" cy="8" r="7" fill="currentColor" />
                      <path d="m4.8 8.2 2.1 2.1 4.3-4.6" stroke="var(--paper-card)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div key="skel" className="h-5 w-40 rounded-full skeleton-line" exit={{ opacity: 0 }} />
            )}
          </AnimatePresence>
          <div className="text-xs text-[var(--ink-mute)] font-mono flex items-center gap-1.5 mt-0.5">
            {file && <span className="text-[var(--ink-soft)] font-bold">{file.symbol}</span>}
            {file && "·"}
            <a
              href={`https://solscan.io/token/${mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--foreground)] underline decoration-dotted underline-offset-2"
              title={mint}
            >
              {shortAddr(mint)}
            </a>
            {file && <span>· {file.program}</span>}
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-mute)] shrink-0 self-start">
          {failed ? "Not opened" : file ? "Live" : "Reading"}
        </span>
      </div>

      {failed && !file && (
        <p className="mt-3 text-sm text-[var(--ink-mute)]">Nothing could be opened on this address</p>
      )}

      {!failed && (
        <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
          <Cell label="Price" value={file?.market ? usdPrice(file.market.priceUsd) : undefined} loading={!file} />
          <Cell label="Market cap" value={file?.market ? usdCompact(file.market.marketCapUsd ?? file.market.fdvUsd) : undefined} loading={!file} />
          <Cell
            label="24h"
            value={file?.market?.change24hPct !== undefined ? signedPct(file.market.change24hPct) : undefined}
            tone={file?.market?.change24hPct === undefined ? undefined : file.market.change24hPct >= 0 ? "good" : "bad"}
            loading={!file}
          />
          <Cell label="Liquidity" value={file?.market ? usdCompact(file.market.liquidityUsd) : undefined} loading={!file} />
          <Cell
            label="Holders"
            value={file?.holders?.count !== undefined ? file.holders.count.toLocaleString("en-US") : undefined}
            loading={!file}
          />
          <Cell label="First pool" value={file?.age ? `${file.age.days} d ago` : undefined} loading={!file} />
        </div>
      )}

      {file && (
        <motion.div
          className="mt-4 pt-3 border-t hairline flex flex-wrap gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur.base, delay: 0.1 }}
        >
          <Flag ok={file.authorities.mintAuthority === null} label={file.authorities.mintAuthority === null ? "Mint renounced" : "Mint authority live"} />
          <Flag ok={file.authorities.freezeAuthority === null} label={file.authorities.freezeAuthority === null ? "Freeze renounced" : "Freeze authority live"} />
          {file.largestAccounts && (
            <Flag neutral label={`Top 10 accounts ${file.largestAccounts.top10Pct.toFixed(1)}%`} />
          )}
          {file.extensions?.map((x) => <Flag key={x.name} ok={false} label={x.name} title={x.detail} />)}
          {!file.listedOnJupiter && <Flag neutral label="Not on Jupiter" />}
        </motion.div>
      )}
    </motion.section>
  );
}

function Cell({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value?: string;
  tone?: "good" | "bad";
  loading: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--ink-mute)]">{label}</div>
      {loading ? (
        <div className="mt-1.5 h-3.5 w-16 rounded-full skeleton-line" />
      ) : (
        <div
          className={`font-mono text-sm mt-0.5 truncate ${tone === "good" ? "text-[var(--lamp-green)]" : tone === "bad" ? "text-[var(--tag-red)]" : "text-[var(--ink)]"}`}
        >
          {value ?? "—"}
        </div>
      )}
    </div>
  );
}

function Flag({ label, ok, neutral, title }: { label: string; ok?: boolean; neutral?: boolean; title?: string }) {
  const color = neutral ? "var(--ink-mute)" : ok ? "var(--lamp-green)" : "var(--tag-red)";
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
