import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stamp } from "@/components/motion/Stamp";
import { DocsNav } from "@/components/DocsNav";
import { AGENT_MODEL, CONTRACT_ADDRESS, X_HANDLE, X_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Folio",
  description: `How Folio's analyst works: built on ${AGENT_MODEL}, he opens a file on any Solana token from public sources and says what is true about it, never what to do about it`,
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "model", label: "The analyst" },
  { id: "paste", label: "Paste a CA" },
  { id: "wallet", label: "Connect a wallet" },
  { id: "file", label: "What's in a file" },
  { id: "sources", label: "Sources" },
  { id: "rules", label: "House rules" },
  { id: "safety", label: "Safety" },
  { id: "links", label: "CA and links" },
] as const;

export default function DocsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
      <DocsNav sections={SECTIONS.map((s) => ({ ...s }))} />

      <article className="min-w-0 max-w-3xl">
        <Reveal>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)] mb-3 flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Docs · how the desk works
          </div>
        </Reveal>
        <SplitReveal
          as="h1"
          text="An analyst, not an oracle"
          className="font-display text-4xl md:text-[3.2rem] leading-[1.05] tracking-[-0.02em]"
          delay={0.1}
        />
        <Reveal delay={0.35}>
          <p className="mt-5 text-lg text-[var(--ink-soft)] leading-relaxed">
            Folio opens a file on a Solana token and reads it out. Every line in the file names the
            source it came from, and the analyst writing about it is held to that file and nothing else
          </p>
        </Reveal>

        <Section id="overview" n="01" title="Overview">
          <P>
            Two halves, side by side. On the left, the files: the tokens in a connected wallet, or the
            tokens on the front desk. On the right, the analyst — the clerk in the tie — who opens
            whatever you point him at, reads it out unprompted, and answers questions about it
            afterwards
          </P>
          <P>
            He changes expression as he works: waiting, reading, answering, filed, declined. When a
            file is finished it gets the red <em>Filed</em> stamp; when you ask him something outside
            his job it gets <em>Declined</em>
          </P>
        </Section>

        <Section id="model" n="02" title="The analyst">
          <Reveal>
            <div className="panel folder-tab relative overflow-hidden mt-2">
              <div className="px-6 pt-5 pb-6">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)]">
                  Model card
                </div>
                <div className="font-display text-3xl mt-2">Built on {AGENT_MODEL}</div>
                <p className="text-[15px] text-[var(--ink-soft)] leading-relaxed mt-3 max-w-xl">
                  The analyst is a {AGENT_MODEL} agent from OpenAI, given one file at a time and a short
                  set of rules it cannot talk its way around. It writes the opening read on every file
                  and answers follow-up questions, streamed word by word as it writes them
                </p>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <Spec k="Model" v={AGENT_MODEL} />
                  <Spec k="Provider" v="OpenAI" />
                  <Spec k="Grounding" v="One file" />
                  <Spec k="Output" v="Streamed" />
                </dl>
              </div>
              <div className="absolute right-5 top-5">
                <Stamp tone="green" size="sm" rotate={-6} delay={0.4}>
                  On duty
                </Stamp>
              </div>
            </div>
          </Reveal>
          <P>
            The model never sees the open internet and never chooses its own sources. Folio reads the
            chain and the market first, assembles the file, and hands the model that file as its whole
            world. If a fact is not in it, the answer is that it is not in the file
          </P>
        </Section>

        <Section id="paste" n="03" title="Paste a CA">
          <P>
            No wallet needed. Paste any token&apos;s contract address into the <Mono>CA</Mono> field
            under the analyst and he opens a file on it straight away — a pasted address opens on its
            own, a typed one takes Enter. The cover sheet shows price, market cap, liquidity, holders,
            the age of the first pool, and the switches that matter most: whether the mint and freeze
            authorities are renounced, and any Token-2022 extension that limits holders
          </P>
          <P>
            Every token on the front desk has an <Mono>Ask the analyst →</Mono> link that does the
            same thing. Each question you ask afterwards re-reads the token, so answers reflect the
            chain as it is now
          </P>
        </Section>

        <Section id="wallet" n="04" title="Connect a wallet">
          <P>
            Connect a Solana wallet and Folio reads the token accounts it holds — classic SPL and
            Token-2022 — ranks the positions by their dollar value, and opens a file on each. Pick a
            position and he reads it out. Nothing is signed: Folio never asks for a transaction or a
            signature, and only ever reads public data about the address
          </P>
          <P>
            Files are numbered and kept. Opening new files on the same wallet later adds to the record
            rather than overwriting it, so a token&apos;s history of files can be compared
          </P>
        </Section>

        <Section id="file" n="05" title="What's in a file">
          <Reveal>
            <ol className="panel overflow-hidden mt-2">
              {[
                ["Age", "Days since the token's first trading pool opened, the launchpad it came from, and when it graduated", "Jupiter"],
                ["Holders", "Holder count and the share the top ten hold, next to what the ten largest token accounts hold on-chain", "Jupiter · Solana RPC"],
                ["Liquidity", "Liquidity in dollars next to market cap, and the largest pool by venue. Lock status is said to be unchecked, never guessed", "Jupiter · DexScreener"],
                ["Authorities", "Mint and freeze authority, Token-2022 extensions such as transfer fees or a permanent delegate, and what the deployer minted and holds", "Solana RPC · Jupiter audit"],
                ["Market", "Price, 24-hour change, traders in the last day, Jupiter's organic score, and the project's own links", "Jupiter"],
              ].map(([k, d, s], i) => (
                <li key={k} className="ledger-row flex gap-4 px-5 py-4">
                  <span className="font-mono text-[11px] text-[var(--ink-mute)] pt-1 w-6 shrink-0">0{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-display text-lg">{k}</div>
                    <p className="text-sm text-[var(--ink-soft)] mt-0.5 leading-relaxed">{d}</p>
                    <p className="text-xs font-mono text-[var(--ink-mute)] mt-1">source: {s}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
          <P>
            Anything no public source here answers — whether liquidity is locked, who the largest
            holders actually are, the creator fee, what the team has been posting — is listed in the
            file as not checked. The analyst closes every opening read on what the file does not
            establish
          </P>
        </Section>

        <Section id="sources" n="06" title="Sources">
          <div className="grid sm:grid-cols-3 gap-3 mt-2">
            <SourceCard name="Solana RPC" via="Helius" what="Mint account, supply, authorities, Token-2022 extensions, largest accounts, wallet balances" />
            <SourceCard name="Jupiter" via="Tokens API v2" what="Price, market cap, liquidity, holders, first pool, audit flags, organic score, links" />
            <SourceCard name="DexScreener" via="Tokens API" what="Pools by venue and their liquidity" />
          </div>
          <P>
            A file opened from a pasted CA is read the moment you paste it. Front-desk files are
            re-read every five minutes. Token logos are fetched by Folio&apos;s server and cached, so a
            slow IPFS gateway never leaves a blank avatar
          </P>
        </Section>

        <Section id="rules" n="07" title="House rules">
          <ul className="mt-2 space-y-2.5">
            {[
              "Only the file. No number, name or fact that is not in it",
              "Name the source of every claim, in words a reader understands",
              "Never say what to buy, sell, hold or enter. Asked anyway, he declines and the answer is stamped Declined",
              "Say plainly what the file does not establish. Never guess",
              "Largest accounts are token accounts, not people — a pool or an exchange is often the biggest",
            ].map((r) => (
              <li key={r} className="flex gap-3 text-[15px] text-[var(--ink-soft)] leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--tag-red)] shrink-0" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
          <P>
            The advice refusal is enforced in code before the model is called, in English and Russian,
            so it never depends on the model choosing to follow its instructions
          </P>
        </Section>

        <Section id="safety" n="08" title="Safety">
          <P>
            Folio is read-only. It never requests a signature or a transaction, never asks for a seed
            phrase or a private key, and the RPC key it reads the chain with stays on the server. If
            anything claiming to be Folio asks you to sign, it is not Folio
          </P>
          <P>
            Nothing in a file is financial advice. Folio is not affiliated with any exchange, wallet or
            token it reports on
          </P>
        </Section>

        <Section id="links" n="09" title="CA and links">
          <Reveal>
            <div className="panel px-5 py-4 mt-2 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)]">Contract address</div>
                <div className="font-mono text-sm mt-1 break-all">{CONTRACT_ADDRESS}</div>
              </div>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost shrink-0 !py-2 text-sm"
              >
                {X_HANDLE} on X ↗
              </a>
            </div>
          </Reveal>
          <P>
            The contract address in the header copies on click. Back to the{" "}
            <Link href="/" className="underline decoration-dotted underline-offset-4 hover:text-[var(--foreground)]">
              desk
            </Link>
          </P>
        </Section>
      </article>
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mt-16 first-of-type:mt-14">
      <Reveal>
        <div className="flex items-baseline gap-3 border-b hairline pb-3 mb-4">
          <span className="font-mono text-xs text-[var(--ink-mute)]">{n}</span>
          <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
        </div>
      </Reveal>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <p className="mt-4 text-[15px] md:text-base text-[var(--ink-soft)] leading-relaxed">{children}</p>
    </Reveal>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[13px] px-1.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--paper-card)_80%,transparent)] border hairline">
      {children}
    </span>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-mute)]">{k}</dt>
      <dd className="font-mono text-sm mt-1">{v}</dd>
    </div>
  );
}

function SourceCard({ name, via, what }: { name: string; via: string; what: string }) {
  return (
    <Reveal>
      <div className="panel px-4 py-4 h-full">
        <div className="font-display text-lg">{name}</div>
        <div className="text-[11px] font-mono text-[var(--ink-mute)] mt-0.5">via {via}</div>
        <p className="text-sm text-[var(--ink-soft)] mt-2 leading-relaxed">{what}</p>
      </div>
    </Reveal>
  );
}
