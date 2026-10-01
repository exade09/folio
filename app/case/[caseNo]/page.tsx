import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase, getCaseHistory } from "@/lib/cases-store";
import { AskBox } from "@/components/AskBox";
import { TokenAvatar } from "@/components/TokenAvatar";
import { usdCompact } from "@/lib/format-money";
import { MascotImage } from "@/components/MascotImage";
import { FactList } from "@/components/FactList";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { Scramble } from "@/components/motion/Scramble";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stamp } from "@/components/motion/Stamp";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default async function CasePage({ params }: { params: Promise<{ caseNo: string }> }) {
  const { caseNo } = await params;
  const caseFile = await getCase(caseNo);
  if (!caseFile) notFound();

  const history = await getCaseHistory(caseFile.wallet, caseFile.mint);
  const priorFilings = history.filter((h) => h.caseNo !== caseFile.caseNo);
  const ch = caseFile.change24hPct;
  const up = (ch ?? 0) >= 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      <Link
        href="/"
        className="group text-sm text-[var(--ink-mute)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1.5"
      >
        <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1">←</span>
        Back to the desk · filed for <span className="font-mono">{shortAddr(caseFile.wallet)}</span>
      </Link>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl overflow-hidden shrink-0 bg-[#5a8df0]">
            <MascotImage mood="idle" size={64} still />
          </div>
          <TokenAvatar symbol={caseFile.symbol} mint={caseFile.mint} logoUri={caseFile.logoUri} size={48} />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <SplitReveal as="h1" text={caseFile.symbol} className="font-display text-3xl md:text-4xl" />
              <Stamp tone="red" size="md" rotate={-6} delay={0.45}>
                Filed
              </Stamp>
            </div>
            <p className="text-[var(--ink-mute)] mt-1">{caseFile.name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">
            <Scramble text={caseFile.caseNo} duration={700} />
          </div>
          <div className="text-xs text-[var(--ink-mute)] mt-0.5">
            {new Date(caseFile.filedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
      </div>

      <Reveal className="panel p-5 mt-7 flex flex-wrap items-center justify-between gap-4" delay={0.1}>
        <div>
          <div className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)]">Balance held</div>
          <div className="font-mono text-lg mt-0.5">
            <CountUp value={caseFile.balanceUi} decimals={caseFile.balanceUi < 100 ? 4 : 2} />
            {caseFile.valueUsd !== undefined && (
              <span className="text-sm text-[var(--ink-mute)]"> · {usdCompact(caseFile.valueUsd)}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)]">24h when filed</div>
          {ch === undefined ? (
            <div className="font-mono text-lg mt-0.5 text-[var(--ink-mute)]">—</div>
          ) : (
            <div className={`font-mono text-lg mt-0.5 ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}>
              {up ? "▲ " : "▼ "}
              <CountUp value={ch} decimals={1} suffix="%" signed />
            </div>
          )}
        </div>
      </Reveal>

      <Reveal className="panel folder-tab mt-9 overflow-hidden" delay={0.2}>
        <FactList caseFile={caseFile} roomy />
      </Reveal>

      {priorFilings.length > 0 && (
        <Reveal className="mt-9">
          <h2 className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)] mb-3">
            Prior filings on this position
          </h2>
          <div className="panel overflow-hidden">
            {priorFilings.map((h) => (
              <Link
                key={h.caseNo}
                href={`/case/${h.caseNo}`}
                className="ledger-row ledger-hover flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span className="font-mono">{h.caseNo}</span>
                <span className="text-[var(--ink-mute)]">
                  {new Date(h.filedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span
                  className={
                    h.change24hPct === undefined
                      ? "text-[var(--ink-mute)]"
                      : h.change24hPct >= 0
                        ? "text-[var(--lamp-green)]"
                        : "text-[var(--tag-red)]"
                  }
                >
                  {h.change24hPct === undefined ? "—" : `${h.change24hPct >= 0 ? "+" : ""}${h.change24hPct.toFixed(1)}%`}
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      <Reveal className="mt-9">
        <AskBox caseFile={caseFile} />
      </Reveal>
    </div>
  );
}
