import { ConnectButton } from "./ConnectButton";
import { TweetCard } from "./TweetCard";

const FILE_LINES = [
  { label: "Contract age", detail: "How long the mint has existed." },
  { label: "Holder concentration", detail: "What the top 10 hold, what the top 1 holds." },
  { label: "Liquidity", detail: "Which venue, how much locked, whether it can leave." },
  { label: "Creator fee", detail: "Who collects it, and what's unclaimed." },
  { label: "Socials", detail: "When they last posted anywhere." },
];

export function HeroLeft() {
  return (
    <div className="px-6 md:px-10 py-10 md:py-14 max-w-2xl">
      <div className="inline-flex items-center gap-2 stamp stamp-demo mb-6">An analyst, not an oracle</div>
      <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
        Connect a wallet. He opens a file on every position in it.
      </h1>
      <p className="mt-6 text-lg text-[var(--ink-soft)] leading-relaxed">
        Contract age. Holder concentration. Where the liquidity sits and whether it can
        leave. Who collects the creator fee. What the socials have been doing. Every line
        carries the source you can open.
      </p>
      <div className="mt-8">
        <ConnectButton />
      </div>

      <div className="panel folder-tab mt-12 overflow-hidden">
        {FILE_LINES.map((line, i) => (
          <div key={line.label} className="ledger-row flex items-start gap-4 px-5 py-4">
            <span className="font-mono text-xs text-[var(--ink-mute)] pt-0.5 w-5 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="font-bold text-sm">{line.label}</div>
              <div className="text-sm text-[var(--ink-mute)]">{line.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <TweetCard />
      </div>

      <div className="panel p-7 mt-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="stamp stamp-demo">Demo</span>
          <span className="stamp stamp-live">Live</span>
          <h2 className="font-display text-xl ml-1">What&apos;s real today</h2>
        </div>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          The token list and the balances are read live off the connected wallet, and token
          names come from Jupiter&apos;s public token list where they&apos;re listed there.
          The five facts inside each file — contract age, holder concentration, liquidity,
          creator fee, socials — are simulated for now: Folio doesn&apos;t have a paid
          Helius or Birdeye connection wired in yet. Every fact says which it is, in the
          file and in the source line under it.
        </p>
      </div>

      <p className="text-sm text-[var(--ink-mute)] mt-10">
        Folio is not affiliated with any exchange, wallet, or token it reports on.
      </p>
    </div>
  );
}
