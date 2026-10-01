import Link from "next/link";
import type { CaseFile } from "@/lib/types";
import { StampBadge } from "./StampBadge";
import { TokenAvatar } from "./TokenAvatar";
import { usdCompact } from "@/lib/format-money";

function formatBalance(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function CaseCard({ caseFile }: { caseFile: CaseFile }) {
  const ch = caseFile.change24hPct;
  const up = (ch ?? 0) >= 0;
  return (
    <Link
      href={`/case/${caseFile.caseNo}`}
      className="panel folder-tab block p-5 hover:-translate-y-0.5 hover:shadow-lg transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <TokenAvatar symbol={caseFile.symbol} mint={caseFile.mint} logoUri={caseFile.logoUri} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-lg truncate">{caseFile.symbol}</span>
              <StampBadge live={Boolean(caseFile.token)} />
            </div>
            <div className="text-sm text-[var(--ink-mute)] truncate mt-0.5">{caseFile.name}</div>
          </div>
        </div>
        <div
          className={`font-mono text-sm shrink-0 ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
        >
          {ch === undefined ? "—" : `${up ? "+" : ""}${ch.toFixed(1)}%`}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--ink-mute)] uppercase tracking-wide font-mono">
            Balance
          </div>
          <div className="font-mono text-sm mt-0.5">
            {formatBalance(caseFile.balanceUi)}
            {caseFile.valueUsd !== undefined && (
              <span className="text-[var(--ink-mute)]"> · {usdCompact(caseFile.valueUsd)}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-[var(--ink-mute)]">{caseFile.caseNo}</div>
          <div className="text-xs text-[var(--ink-mute)] mt-0.5">
            filed {new Date(caseFile.filedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </Link>
  );
}
