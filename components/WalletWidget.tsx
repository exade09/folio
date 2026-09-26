"use client";

import type { CaseFile } from "@/lib/types";
import { StampBadge } from "./StampBadge";
import { TokenAvatar } from "./TokenAvatar";
import { factLines } from "@/lib/format";

function formatBalance(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
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
  return (
    <div className="panel folder-tab overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b hairline">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">
            Case index
          </div>
          <div className="font-display text-lg">{walletShort}</div>
        </div>
        <button className="btn btn-ghost text-xs px-3 py-1.5" onClick={onRescan} disabled={loading}>
          {loading ? "Opening…" : "Open new files"}
        </button>
      </div>

      {loading && (
        <div className="px-5 py-10 text-center text-sm text-[var(--ink-mute)]">
          Reading the chain, then filing what&apos;s found…
        </div>
      )}

      {!loading && error && (
        <div className="px-5 py-6 text-sm text-[var(--tag-red)]">{error}</div>
      )}

      {!loading && !error && cases && cases.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-[var(--ink-mute)]">
          No SPL token positions found in this wallet.
        </div>
      )}

      {!loading && !error && cases && cases.length > 0 && (
        <div className="max-h-[70vh] overflow-y-auto">
          {cases.map((c) => {
            const isSelected = c.caseNo === selectedCaseNo;
            const up = c.overnightChangePct >= 0;
            return (
              <div key={c.caseNo} className="ledger-row">
                <button
                  onClick={() => onSelect(isSelected ? null : c.caseNo)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                    isSelected ? "bg-[var(--paper-soft)]" : "hover:bg-[var(--paper-soft)]/60"
                  }`}
                >
                  <TokenAvatar symbol={c.symbol} logoUri={c.logoUri} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold truncate">{c.symbol}</span>
                      <StampBadge confidence={c.metadataSource} />
                    </div>
                    <div className="text-xs text-[var(--ink-mute)] truncate">
                      {formatBalance(c.balanceUi)} held
                    </div>
                  </div>
                  <div
                    className={`font-mono text-sm shrink-0 ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
                  >
                    {up ? "+" : ""}
                    {c.overnightChangePct}%
                  </div>
                </button>

                {isSelected && <CaseDetail caseFile={c} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CaseDetail({ caseFile }: { caseFile: CaseFile }) {
  const lines = factLines(caseFile);
  return (
    <div className="px-5 pb-5 pt-1 bg-[var(--paper-soft)]">
      <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-mute)] mb-3">
        <span>{caseFile.caseNo}</span>
        <span>
          filed{" "}
          {new Date(caseFile.filedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="space-y-3">
        {lines.map((line) => (
          <div key={line.label} className="border-t hairline pt-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">
                {line.label}
              </span>
              <StampBadge confidence={line.confidence} />
            </div>
            <div className="font-display text-base mt-0.5">{line.headline}</div>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">{line.detail}</p>
            <p className="text-xs text-[var(--ink-mute)] mt-1 font-mono">source: {line.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
