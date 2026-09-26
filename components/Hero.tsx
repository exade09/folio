import { ConnectButton } from "./ConnectButton";
import { FolioCat } from "./FolioCat";
import { TweetCard } from "./TweetCard";

const FILE_LINES = [
  { label: "Contract age", detail: "How long the mint has existed." },
  { label: "Holder concentration", detail: "What the top 10 hold, what the top 1 holds." },
  { label: "Liquidity", detail: "Which venue, how much locked, whether it can leave." },
  { label: "Creator fee", detail: "Who collects it, and what's unclaimed." },
  { label: "Socials", detail: "When they last posted anywhere." },
];

export function Hero() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        <div>
          <div className="inline-flex items-center gap-2 stamp stamp-demo mb-6">An analyst, not an oracle</div>
          <h1 className="font-display text-4xl md:text-[3.4rem] leading-[1.04]">
            Connect a wallet.
            <br />
            He opens a file on
            <br />
            every position in it.
          </h1>
          <p className="mt-6 text-lg text-[var(--ink-soft)] max-w-xl leading-relaxed">
            Contract age. Holder concentration. Where the liquidity sits and whether it can
            leave. Who collects the creator fee. What the socials have been doing. Every
            line carries the source you can open.
          </p>
          <div className="mt-8">
            <ConnectButton />
          </div>

          <div className="panel folder-tab mt-12 overflow-hidden max-w-xl">
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
        </div>

        <div className="flex flex-col items-center lg:items-end gap-8 lg:pt-6">
          <div className="panel folder-tab p-8 w-full max-w-sm flex flex-col items-center bg-[var(--wall-blue-soft)]">
            <FolioCat mood="idle" size={200} />
            <p className="font-display text-lg text-center mt-2">
              &ldquo;Numbered when filed, never edited.&rdquo;
            </p>
          </div>
          <TweetCard />
        </div>
      </div>

      <div className="panel p-7 md:p-8 mt-14">
        <div className="flex items-center gap-2 mb-3">
          <span className="stamp stamp-demo">Demo</span>
          <span className="stamp stamp-live">Live</span>
          <h2 className="font-display text-xl ml-1">What&apos;s real today</h2>
        </div>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed max-w-2xl">
          The token list and the balances are read live off the connected wallet, and token
          names come from Jupiter&apos;s public token list where they&apos;re listed there.
          The five facts inside each file — contract age, holder concentration, liquidity,
          creator fee, socials — are simulated for now: Folio doesn&apos;t have a paid
          Helius or Birdeye connection wired in yet. Every fact says which it is, in the
          file and in the source line under it.
        </p>
      </div>
    </div>
  );
}
