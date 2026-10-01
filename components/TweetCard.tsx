import { MascotImage } from "./MascotImage";

export function TweetCard() {
  return (
    <div className="panel folder-tab p-5 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full overflow-hidden shrink-0 bg-[#5a8df0]">
          <MascotImage mood="idle" size={40} still />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold truncate">Folio</span>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-label="Verified">
              <path
                d="M10 1.5 12 3.6 15 3l.6 3 2.4 1.6-1.6 2.4.6 3-3 .6-1.6 2.4L10 14.5 7.6 16.6 6 14.2l-3-.6.6-3L2 8l1.6-2.4-.6-3 3-.6L7.6 1.4 10 1.5Z"
                fill="var(--lamp-green)"
              />
              <path
                d="M6.5 10.2 8.8 12.5 13.5 7.5"
                stroke="var(--paper-card)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="text-sm text-[var(--ink-mute)]">@folioclerk</span>
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed">
        Folio is an AI analyst for Solana tokens. Connect a wallet, or paste any CA, and he opens a file:
        age, holder concentration, liquidity next to market cap, who can still mint or freeze it — read
        live, every line sourced
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">
        &ldquo;Can I just ask him things?&rdquo; Yes — plain words, sourced from the file. &ldquo;So what
        should I buy?&rdquo; He doesn&apos;t answer that one
      </p>

      <div className="mt-4 pt-3 border-t hairline flex items-center justify-between text-xs text-[var(--ink-mute)] font-mono">
        <span>Filed publicly · original thread</span>
        <span>don&apos;t fall for fakes</span>
      </div>
    </div>
  );
}
