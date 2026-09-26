import Link from "next/link";
import { getMovers } from "@/lib/briefing";

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet } = await searchParams;
  const movers = await getMovers(wallet);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      <div className="text-xs font-mono uppercase tracking-wide text-[var(--ink-mute)] mb-2">
        This morning · {formatToday()}
      </div>
      <h1 className="font-display text-3xl md:text-4xl mb-2">What moved overnight</h1>
      <p className="text-[var(--ink-mute)] max-w-xl">
        {wallet
          ? "Every position filed for this wallet, ranked by how far it moved."
          : "Every position filed anywhere on Folio in this session, ranked by how far it moved. Connect a wallet to see your own page instead of the shared one."}
      </p>

      {movers.length === 0 ? (
        <div className="panel p-10 text-center text-[var(--ink-mute)] mt-10">
          Nothing filed yet. Connect a wallet to open the first files.
        </div>
      ) : (
        <div className="panel folder-tab mt-10 overflow-hidden">
          {movers.map((m, i) => {
            const up = m.overnightChangePct >= 0;
            return (
              <Link
                key={m.caseNo}
                href={`/case/${m.caseNo}`}
                className="ledger-row flex items-center gap-4 px-6 py-4 hover:bg-[var(--paper-soft)] transition-colors"
              >
                <span className="font-mono text-xs text-[var(--ink-mute)] w-6 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{m.symbol}</div>
                  <div className="text-xs text-[var(--ink-mute)] truncate">{m.name}</div>
                </div>
                <div
                  className={`font-mono text-sm shrink-0 ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
                >
                  {up ? "+" : ""}
                  {m.overnightChangePct}%
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
