import Link from "next/link";
import { getMovers } from "@/lib/briefing";
import { TokenAvatar } from "@/components/TokenAvatar";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { MoveBar } from "@/components/MoveBar";

function formatToday() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet } = await searchParams;
  const movers = await getMovers(wallet);
  const maxMove = Math.max(1, ...movers.map((m) => Math.abs(m.change24hPct ?? 0)));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      <Reveal>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)] mb-3 flex items-center gap-2">
          <span className="live-dot" aria-hidden="true" />
          This morning · {formatToday()}
        </div>
      </Reveal>
      <SplitReveal as="h1" text="What moved in a day" className="font-display text-4xl md:text-5xl mb-3" delay={0.1} />
      <Reveal delay={0.3}>
        <p className="text-[var(--ink-mute)] max-w-xl">
          {wallet
            ? "Every position filed for this wallet, ranked by how far its price moved in the 24 hours before it was filed, as Jupiter reported it"
            : "Every token filed anywhere on Folio recently, ranked by how far its price moved in the 24 hours before it was filed, as Jupiter reported it. Connect a wallet to see your own page instead of the shared one"}
        </p>
      </Reveal>

      {movers.length === 0 ? (
        <Reveal className="panel p-10 text-center text-[var(--ink-mute)] mt-10" delay={0.4}>
          Nothing filed yet. Connect a wallet to open the first files
        </Reveal>
      ) : (
        <div className="panel folder-tab mt-10 overflow-hidden">
          {movers.map((m, i) => {
            const change = m.change24hPct ?? 0;
            const up = change >= 0;
            return (
              <Reveal key={m.caseNo} delay={0.35 + Math.min(i, 12) * 0.05} y={12}>
                <Link
                  href={`/case/${m.caseNo}`}
                  className={`ledger-hover flex items-center gap-4 px-6 py-4 ${i > 0 ? "border-t hairline" : ""}`}
                >
                  <span className="font-mono text-xs text-[var(--ink-mute)] w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <TokenAvatar symbol={m.symbol} mint={m.mint} logoUri={m.logoUri} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{m.symbol}</div>
                    <div className="text-xs text-[var(--ink-mute)] truncate">{m.name}</div>
                  </div>
                  <MoveBar pct={change} max={maxMove} delay={0.45 + Math.min(i, 12) * 0.05} />
                  <div
                    className={`font-mono text-sm shrink-0 w-20 text-right ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
                  >
                    <CountUp value={change} decimals={1} suffix="%" signed />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
