"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from "motion/react";
import type { FeaturedDesk as Desk, FeaturedToken } from "@/lib/featured";
import { dur, ease, spring, stagger } from "@/lib/motion";
import { shortAddr, shortDate, signedPct, usdCompact, usdPrice, utcTime } from "@/lib/format-money";
import { play } from "@/lib/sound";
import { requestOpenCa } from "@/lib/open-ca";
import { TokenAvatar } from "./TokenAvatar";
import { CountUp } from "./motion/CountUp";
import { Scramble } from "./motion/Scramble";
import { Stamp } from "./motion/Stamp";

// The front desk: live files on a few tokens people are watching, before any
// wallet is connected. Same shape as a wallet's case file, filled from public
// market data instead — and where no public source answers a question, the
// line says so instead of guessing.
//
// It pages through the tokens on its own while it is on screen and nobody is
// pointing at it. Those automatic page turns are silent; picking a token
// yourself turns the page with sound and lands the FILED stamp.

const CYCLE_MS = 9000;

export function FeaturedDesk({ desk, play: ready }: { desk: Desk; play: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [picked, setPicked] = useState(false);
  // True only for the page turn the visitor asked for, so the stamp on that
  // file sounds and the stamps on automatic turns don't.
  const [audible, setAudible] = useState(false);

  const tokens = desk.tokens;
  const t = tokens[i] ?? tokens[0];

  useEffect(() => {
    if (!ready || !inView || reduce || hovered || picked || tokens.length < 2) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setAudible(false);
      setI((n) => (n + 1) % tokens.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [ready, inView, reduce, hovered, picked, tokens.length]);

  function choose(n: number) {
    if (n === i) return;
    setPicked(true);
    setAudible(true);
    play("flip");
    setI(n);
  }

  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : tokens.length - 1)) % tokens.length;
    choose(n);
    document.getElementById(`desk-tab-${n}`)?.focus();
  }

  return (
    <section
      ref={ref}
      aria-labelledby="desk-title"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--ink-mute)] flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            On the desk today
          </div>
          <h2 id="desk-title" className="font-display text-2xl mt-1">
            Files on the tokens everyone&apos;s watching
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[var(--ink-mute)] shrink-0 hidden sm:block">
          read {utcTime(desk.readAt)}
        </span>
      </div>

      <LayoutGroup id="desk-tabs">
        <div role="tablist" aria-label="Featured tokens" className="flex flex-wrap gap-2 mb-5" onKeyDown={onTabKey}>
          {tokens.map((tok, n) => {
            const active = n === i;
            const up = (tok.change24hPct ?? 0) >= 0;
            return (
              <button
                key={tok.mint}
                id={`desk-tab-${n}`}
                role="tab"
                aria-selected={active}
                aria-controls="desk-file"
                tabIndex={active ? 0 : -1}
                onClick={() => choose(n)}
                className={`relative rounded-full pl-1.5 pr-3 py-1.5 flex items-center gap-2 text-sm transition-colors ${active ? "text-[var(--paper-card)]" : "text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--paper-card)_70%,transparent)]"}`}
              >
                {active && (
                  <motion.span
                    layoutId="desk-tab-pill"
                    className="absolute inset-0 rounded-full bg-[var(--ink)]"
                    transition={spring.layout}
                  />
                )}
                <span className="relative">
                  <TokenAvatar symbol={tok.symbol} mint={tok.mint} logoUri={tok.icon} size={22} />
                </span>
                <span className="relative font-bold">{tok.symbol}</span>
                {tok.change24hPct !== undefined && (
                  <span
                    className={`relative font-mono text-[11px] ${active ? "opacity-80" : up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
                  >
                    {signedPct(tok.change24hPct)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="relative" style={{ perspective: 1600, perspectiveOrigin: "50% 0%" }}>
        <div className="absolute inset-x-3 -bottom-2 top-3 panel opacity-60 rotate-[1.2deg]" aria-hidden="true" />
        <div className="absolute inset-x-1.5 -bottom-1 top-1.5 panel opacity-80 -rotate-[0.8deg]" aria-hidden="true" />

        <AnimatePresence mode="wait" initial={false}>
          <TokenFile key={t.mint} token={t} play={ready} audible={audible} />
        </AnimatePresence>
      </div>
    </section>
  );
}

function TokenFile({ token: t, play: ready, audible }: { token: FeaturedToken; play: boolean; audible: boolean }) {
  const up = (t.change24hPct ?? 0) >= 0;
  const solscan = `https://solscan.io/token/${t.mint}`;

  return (
    <motion.article
      id="desk-file"
      role="tabpanel"
      className="panel folder-tab relative overflow-hidden origin-top"
      initial={{ rotateX: -38, opacity: 0, y: -14 }}
      animate={{ rotateX: 0, opacity: 1, y: 0 }}
      exit={{ rotateX: 42, opacity: 0, y: 18, transition: { duration: 0.36, ease: ease.exit } }}
      transition={{ duration: 0.7, ease: ease.glide }}
      aria-label={`Live file on ${t.name} (${t.symbol})`}
    >
      <header className="px-5 pt-4 pb-4 border-b hairline">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <TokenAvatar symbol={t.symbol} mint={t.mint} logoUri={t.icon} size={40} />
            <div className="min-w-0">
              <div className="font-display text-xl leading-tight flex items-center gap-1.5 truncate">
                {t.name}
                {t.verified && <VerifiedGlyph />}
              </div>
              <div className="text-xs text-[var(--ink-mute)] font-mono flex items-center gap-1.5">
                <span className="text-[var(--ink-soft)] font-bold">{t.symbol}</span>·
                <a
                  href={solscan}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)] underline decoration-dotted underline-offset-2"
                  title={t.mint}
                >
                  <Scramble text={shortAddr(t.mint)} duration={520} />
                </a>
                {t.note && <span className="hidden sm:inline">· {t.note}</span>}
              </div>
            </div>
          </div>
          <Stamp tone="green" size="sm" rotate={-4} play={ready} delay={0.1} sound={false}>
            Live
          </Stamp>
        </div>

        <dl className="grid grid-cols-3 gap-3 mt-4">
          <Figure label="Price">
            <span className="font-mono">{usdPrice(t.priceUsd)}</span>
          </Figure>
          <Figure label="Market cap">
            <span className="font-mono">{usdCompact(t.mcapUsd)}</span>
          </Figure>
          <Figure label="24h">
            {t.change24hPct === undefined ? (
              "—"
            ) : (
              <span className={`font-mono ${up ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}>
                {up ? "▲ " : "▼ "}
                <CountUp value={t.change24hPct} decimals={1} suffix="%" signed delay={0.2} />
              </span>
            )}
          </Figure>
        </dl>
      </header>

      <motion.ol
        initial="hidden"
        animate={ready ? "shown" : "hidden"}
        variants={{ shown: { transition: { staggerChildren: stagger.loose * 1.6, delayChildren: 0.2 } } }}
      >
        <Line n={1} label="Age" source="Jupiter · firstPool.createdAt">
          {t.age ? (
            <>
              <Headline>
                <CountUp value={t.age.days} delay={0.3} /> {t.age.days === 1 ? "day" : "days"} since its first pool
              </Headline>
              <Detail>
                First pool opened {shortDate(t.age.firstPoolAt)}
                {t.age.launchpad ? `, launched on ${t.age.launchpad}` : ""}
                {t.age.graduatedAt ? `, graduated ${shortDate(t.age.graduatedAt)}` : ""}. This is when trading
                began, not when the mint was created
              </Detail>
            </>
          ) : (
            <NotInSource />
          )}
        </Line>

        <Line n={2} label="Holders" source="Jupiter · holderCount, audit.topHoldersPercentage">
          {t.holders?.count !== undefined ? (
            <Headline>
              <CountUp value={t.holders.count} delay={0.45} /> holders
            </Headline>
          ) : (
            <NotInSource />
          )}
          {t.holders?.topHoldersPct !== undefined && (
            <Meter label="Top holders" pct={t.holders.topHoldersPct} warn={t.holders.topHoldersPct > 50} delay={0.55} />
          )}
          {t.holders?.change24hPct !== undefined && (
            <Detail>Holder count {signedPct(t.holders.change24hPct)} over the last 24 hours</Detail>
          )}
        </Line>

        <Line n={3} label="Liquidity" source="Jupiter · liquidity; DexScreener · largest pair">
          {t.liquidity?.totalUsd !== undefined ? (
            <Headline>{usdCompact(t.liquidity.totalUsd)} across its pools</Headline>
          ) : (
            <NotInSource />
          )}
          <Detail>
            {t.liquidity?.largestPool ? (
              <>
                Largest pool: {t.liquidity.largestPool.venue}{" "}
                {t.liquidity.largestPool.url ? (
                  <a
                    href={t.liquidity.largestPool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline decoration-dotted underline-offset-2 hover:text-[var(--foreground)]"
                  >
                    {shortAddr(t.liquidity.largestPool.address)}
                  </a>
                ) : (
                  <span className="font-mono">{shortAddr(t.liquidity.largestPool.address)}</span>
                )}
                {t.liquidity.largestPool.usd !== undefined ? ` with ${usdCompact(t.liquidity.largestPool.usd)}` : ""}.{" "}
              </>
            ) : null}
            Whether it can leave was not checked — no public source here reports lock status
          </Detail>
        </Line>

        <Line n={4} label="Authorities" source="Jupiter · audit">
          {t.authorities ? (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                <Authority label="Mint" renounced={t.authorities.mintRenounced} />
                <Authority label="Freeze" renounced={t.authorities.freezeRenounced} />
              </div>
              {t.authorities.devMints !== undefined && (
                <Detail>
                  Its deployer has launched {t.authorities.devMints.toLocaleString("en-US")}{" "}
                  {t.authorities.devMints === 1 ? "token" : "tokens"}
                  {t.authorities.devBalancePct !== undefined
                    ? ` and holds ${t.authorities.devBalancePct.toFixed(2)}% of this one`
                    : ""}
                </Detail>
              )}
            </>
          ) : (
            <NotInSource />
          )}
        </Line>

        <Line n={5} label="Activity" source="Jupiter · stats24h.numTraders, organicScore">
          {t.activity?.traders24h !== undefined ? (
            <Headline>
              <CountUp value={t.activity.traders24h} delay={0.9} /> traders in 24h
            </Headline>
          ) : (
            <NotInSource />
          )}
          {t.activity?.organicScore !== undefined && (
            <Detail>
              Organic score {Math.round(t.activity.organicScore)}
              {t.activity.organicLabel ? ` (${t.activity.organicLabel})` : ""} — Jupiter&apos;s measure of real
              trading against wash trading
            </Detail>
          )}
          {t.activity && t.activity.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {t.activity.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono px-2 py-0.5 rounded-full border hairline hover:border-[var(--foreground)] transition-colors"
                  title={l.url}
                >
                  {l.kind === "x" ? "X" : l.kind === "telegram" ? "Telegram" : new URL(l.url).hostname.replace(/^www\./, "")} ↗
                </a>
              ))}
            </div>
          )}
        </Line>
      </motion.ol>

      <div className="absolute right-6 bottom-14 pointer-events-none">
        <Stamp tone="red" size="lg" rotate={-11} delay={1.6} play={ready} sound={audible ? "stamp" : false}>
          Filed
        </Stamp>
      </div>

      <footer className="px-5 py-3 border-t hairline text-[11px] font-mono text-[var(--ink-mute)] flex flex-wrap items-center justify-between gap-2">
        <span>read {utcTime(t.asOf)} · facts, not a recommendation</span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => requestOpenCa(t.mint)}
            className="font-[family-name:var(--font-body)] font-bold text-[12px] text-[var(--lamp-green)] hover:text-[var(--foreground)] transition-colors"
          >
            Ask the analyst →
          </button>
          <a href={solscan} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)]">
            Solscan ↗
          </a>
          <a
            href={`https://dexscreener.com/solana/${t.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--foreground)]"
          >
            DexScreener ↗
          </a>
        </span>
      </footer>
    </motion.article>
  );
}

function Line({ n, label, source, children }: { n: number; label: string; source: string; children: React.ReactNode }) {
  return (
    <motion.li
      className="ledger-row ledger-hover flex items-start gap-4 px-5 py-3.5"
      variants={{
        hidden: { opacity: 0, x: -18, filter: "blur(4px)" },
        shown: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: dur.base, ease: ease.settle } },
      }}
    >
      <span className="font-mono text-[11px] text-[var(--ink-mute)] pt-1 w-5 shrink-0">{String(n).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold text-sm">{label}</span>
          <span className="stamp-ink stamp-ink-sm" style={{ color: "var(--lamp-green)", transform: "rotate(-3deg)" }}>
            Live
          </span>
        </div>
        <div className="mt-1 space-y-1.5">{children}</div>
        <p className="text-[11px] text-[var(--ink-mute)] mt-1.5 font-mono">source: {source}</p>
      </div>
    </motion.li>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-lg leading-snug">{children}</div>;
}

function Detail({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{children}</p>;
}

function NotInSource() {
  return <Detail>Not in the source right now</Detail>;
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-mono uppercase tracking-wide text-[var(--ink-mute)]">{label}</dt>
      <dd className="text-sm mt-0.5">{children}</dd>
    </div>
  );
}

function Meter({ label, pct, warn, delay }: { label: string; pct: number; warn: boolean; delay: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 font-mono text-[var(--ink-mute)]">{label}</span>
      <div className="meter flex-1" role="presentation">
        <motion.span
          style={{ background: warn ? "var(--tag-red)" : "var(--ink-soft)" }}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(1.5, Math.min(100, pct))}%` }}
          transition={{ delay, duration: 1.1, ease: ease.settle }}
        />
      </div>
      <span className="w-12 text-right font-mono tabular-nums">
        <CountUp value={pct} decimals={1} suffix="%" delay={delay} />
      </span>
    </div>
  );
}

function Authority({ label, renounced }: { label: string; renounced?: boolean }) {
  if (renounced === undefined) {
    return <span className="text-sm text-[var(--ink-mute)]">{label}: not reported</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${renounced ? "text-[var(--lamp-green)]" : "text-[var(--tag-red)]"}`}
    >
      {renounced ? (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6.3 5 8.7l4.5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="live-dot" data-tone="red" aria-hidden="true" />
      )}
      {label} {renounced ? "renounced" : "authority still live"}
    </span>
  );
}

function VerifiedGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-label="Verified on Jupiter" className="shrink-0">
      <title>Verified on Jupiter</title>
      <path
        d="M10 1.5 12 3.6 15 3l.6 3 2.4 1.6-1.6 2.4.6 3-3 .6-1.6 2.4L10 14.5 7.6 16.6 6 14.2l-3-.6.6-3L2 8l1.6-2.4-.6-3 3-.6L7.6 1.4 10 1.5Z"
        fill="var(--lamp-green)"
      />
      <path d="M6.5 10.2 8.8 12.5 13.5 7.5" stroke="var(--paper-card)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
