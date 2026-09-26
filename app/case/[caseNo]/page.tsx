import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase, getCaseHistory } from "@/lib/cases-store";
import { factLines } from "@/lib/format";
import { StampBadge } from "@/components/StampBadge";
import { AskBox } from "@/components/AskBox";
import { TokenAvatar } from "@/components/TokenAvatar";
import { MascotImage } from "@/components/MascotImage";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseNo: string }>;
}) {
  const { caseNo } = await params;
  const caseFile = await getCase(caseNo);
  if (!caseFile) notFound();

  const history = await getCaseHistory(caseFile.wallet, caseFile.mint);
  const priorFilings = history.filter((h) => h.caseNo !== caseFile.caseNo);
  const lines = factLines(caseFile);
  const up = caseFile.overnightChangePct >= 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      <Link
        href="/"
        className="text-sm text-[var(--ink-mute)] hover:text-[var(--foreground)] transition-colors"
      >
        ← Back to Folio · filed for {shortAddr(caseFile.wallet)}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl overflow-hidden shrink-0">
            <MascotImage mood="idle" size={64} />
          </div>
          <TokenAvatar symbol={caseFile.symbol} logoUri={caseFile.logoUri} size={48} />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl md:text-4xl">{caseFile.symbol}</h1>
              <span className="stamp stamp-filed stamp-in">Filed</span>
            </div>
            <p className="text-[var(--ink-mute)] mt-1">{caseFile.name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">{caseFile.caseNo}</div>
          <div className="text-xs text-[var(--ink-mute)] mt-0.5">
            {new Date(caseFile.filedAt).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        </div>
      </div>

      <div className="panel p-5 mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)]">
            Balance held
          </div>
          <div className="font-mono text-lg mt-0.5">
            {caseFile.balanceUi.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)]">
            Overnight
          </div>
          <div
            className={`font-mono text-lg mt-0.5 ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
          >
            {up ? "+" : ""}
            {caseFile.overnightChangePct}%
          </div>
        </div>
      </div>

      <div className="panel folder-tab mt-8 overflow-hidden">
        {lines.map((line) => (
          <div key={line.label} className="ledger-row px-6 py-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)]">
                {line.label}
              </span>
              <StampBadge confidence={line.confidence} />
            </div>
            <div className="mt-1.5 font-display text-lg">{line.headline}</div>
            <p className="text-sm text-[var(--ink-soft)] mt-1">{line.detail}</p>
            <p className="text-xs text-[var(--ink-mute)] mt-2 font-mono">source: {line.source}</p>
          </div>
        ))}
      </div>

      {priorFilings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)] mb-3">
            Prior filings on this position
          </h2>
          <div className="panel divide-y hairline overflow-hidden">
            {priorFilings.map((h) => (
              <Link
                key={h.caseNo}
                href={`/case/${h.caseNo}`}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-[var(--paper-soft)] transition-colors"
              >
                <span className="font-mono">{h.caseNo}</span>
                <span className="text-[var(--ink-mute)]">
                  {new Date(h.filedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span className={h.overnightChangePct >= 0 ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}>
                  {h.overnightChangePct >= 0 ? "+" : ""}
                  {h.overnightChangePct}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <AskBox caseNo={caseFile.caseNo} />
      </div>
    </div>
  );
}
