# Folio

An analyst for a Solana wallet. Connect a wallet and Folio opens a file on every
position in it: contract age, holder concentration, where the liquidity sits and
whether it can leave, who collects the creator fee, what the socials have been
doing. Every line carries the source you can open. Files are numbered when filed
and never edited afterward, including the ones that age badly.

Originally described for a Robinhood Chain launch; rebuilt here for Solana.

## Stack

| Layer     | Choice                                                        |
| --------- | -------------------------------------------------------------- |
| Framework | Next.js 16, App Router, Turbopack                              |
| Styling   | Tailwind CSS v4 + a hand-built "case file" design system in `app/globals.css` |
| Fonts     | Geist Sans / Geist Mono, Source Serif 4 for display, via `next/font` |
| Chain     | Solana mainnet-beta, read-only, through Helius RPC (server-side) |
| Storage   | Postgres on Neon (via the Vercel integration); JSON files locally |
| Wallet    | Wallet Standard auto-detection via `@solana/wallet-adapter-react` (no per-wallet adapter package needed for Phantom, Solflare, Backpack, …) |
| AI        | OpenAI Chat Completions, grounded strictly to one case file per call |

## Running it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Copy `.env.example` to `.env.local` and fill in:

- `OPENAI_API_KEY` — without it the analyst reports he is unreachable; the
  rest of the product still works.
- `HELIUS_API_KEY` — the RPC the server reads wallets through. Without it the
  public endpoint is used, which rate-limits within a few scans.
- `DATABASE_URL` — optional locally. Set it (`vercel env pull .env.local`
  copies the project's) to file cases into Neon; leave it empty and cases are
  JSON files under `data/cases/`.

All three are server-only. None of them may go in a `NEXT_PUBLIC_*` variable.

## What's real today and what isn't

This is the one thing the product cannot afford to fudge, so it's spelled out
plainly rather than left to be discovered:

- **Real, live:** the wallet connection, the list of tokens it holds (classic
  SPL and Token-2022, with several accounts for one mint summed), and their
  balances — read straight off Solana mainnet-beta through Helius. Token
  name/symbol/logo come from Jupiter's public token list (`lite-api.jup.ag`)
  when a mint is listed there; unlisted mints fall back to a shortened address,
  never a made-up name.
- **Simulated, clearly marked "Demo":** the five analytical facts inside each
  file — contract age, holder concentration, liquidity location and lock
  status, creator fee collector, social activity. Reading them needs indexer
  calls (Helius, plus a DEX source for liquidity) that are not wired in yet —
  the Helius connection is only used to read balances so far. Every fact
  carries a `confidence: "demo" | "live"` tag end to end — in the JSON, in the
  UI stamp next to it, and in what the AI analyst is told to disclose when
  asked about it. Nothing simulated is ever presented as live.
- The overnight change shown on the briefing page is simulated the same way,
  seeded per token per UTC day so it's stable within a day rather than
  re-rolling on every request.

Wiring in real data later is additive: replace `buildDemoFacts` in
`lib/demo-enrichment.ts` with real Helius/Birdeye calls that return the same
`PositionFacts` shape, set `confidence: "live"`, and everything downstream —
the file view, the ask endpoint's grounding, the briefing feed — needs no
other change.

## How a file is filed

Every scan files brand new cases (`F-000001`, `F-000002`, …). A case, once
filed, is never opened for writing again: re-scanning a position files a new
case, and the old one stays exactly as it was — including a number that later
reads as wrong. A case page lists its own earlier filings.

`lib/cases-store.ts` is the only thing the app imports, and it picks one of two
stores by environment:

- **Postgres** (`lib/store/pg-store.ts`), when `DATABASE_URL` is set — what
  production runs on, via Neon's HTTP driver. One table, `folio_cases`, written
  only by `INSERT`. Numbers come from a sequence, so any number of serverless
  instances filing at once never hand out the same one. A trigger rejects
  `UPDATE`, `DELETE` and `TRUNCATE` on the table, so the never-edited rule holds
  in the database itself, for anyone holding the connection string — not just
  for this app. The schema is created on first use, idempotently, inside one
  transaction that takes an advisory lock, so two cold instances cannot trip
  over each other creating it.
- **JSON files** (`lib/store/file-store.ts`), when it is not — for local
  development. Filings in a process run one at a time: `/api/scan` files a
  wallet's positions in parallel, and the counter's read-then-write used to let
  parallel filings take the same number and overwrite each other (twelve
  positions came out as two files). Case files are written with `wx`, so a
  stale counter fails loudly rather than replacing a filed case. On Vercel
  without a database it writes to the instance's temp dir, which keeps scans
  working but forgets them on the next cold start.

Re-reading a file does not need the store to have kept it: the client sends
the case it was given back with every question (`lib/case-input.ts`), so the
analyst answers either way.

## The AI analyst

`lib/ai.ts` builds a per-request system prompt containing exactly one case
file's JSON and instructs the model to answer only from it, cite which field
it used, and say plainly when something isn't in the file. A buy/sell/
investment-advice question is refused before the model is even called
(`isAdviceRequest` in the same file) — that rule doesn't depend on the model
choosing to follow the system prompt, and the patterns cover English and
Russian, since the site is read in both.

The same file builds a second prompt, `streamAnalysisOfCase`, for the opening
read the agent gives the moment a position is selected: same grounding, same
house rules, but asked to walk the five facts in the order that matters for that
particular position and to close on what the file does not establish.

## Routes

```
/                     the whole product: case index on the left, the analyst on the right
/case/[caseNo]         one file on its own page: five facts, sources, prior filings, ask box
/briefing              "this morning" — filed positions ranked by overnight move
```

`/` is a two-pane shell. The left half is the wallet: the pitch before a wallet
is connected, the case index after. The right half is the analyst, full height —
mascot, status line, and the transcript for whichever position is selected.
Selecting a position is what sets him working: he opens that file and reads it
out unprompted, then takes questions about it. Selecting it again later does not
spend a second call — the transcript is already there.

## API

```
POST /api/scan      { wallet } → reads live token accounts, files new cases
POST /api/analyze    { caseNo, caseFile? } → streams the opening read on that file
POST /api/ask        { caseNo, question, caseFile? } → streams a grounded answer
GET  /api/briefing   ?wallet= optional → movers, sorted by |overnight change|
```

`/api/analyze` and `/api/ask` answer with newline-delimited JSON rather than a
single object, one event per line, so the agent's text can be written out as the
model produces it:

```
{"t":"delta","v":"The contract is 395 days old"}   a piece of the answer
{"t":"refusal","v":"He does not answer that one…"} an advice question, refused
{"t":"error","v":"…"}                              the analyst is unreachable
{"t":"done"}                                        nothing further is coming
```

A refusal is decided before the model is called and arrives as a single event.
`lib/agent-client.ts` reads this on the browser side; a chunk boundary can land
mid-character, so the decoder stays in streaming mode and a partial last line is
carried into the next read.

The optional `caseFile` on both endpoints is the case object `/api/scan` already
returned to the client. It is used only when the on-disk store has no such case —
which is what happens on a serverless deployment, where the store cannot keep
anything (see below). It is validated against the full `CaseFile` shape in
`lib/case-input.ts` before it is allowed near a prompt.

## Manual QA without burning RPC quota

The public mainnet RPC used for local dev rate-limits quickly. To review the
file/ask/briefing UI without depending on it, `scripts/seed-demo-cases.ts`
files a handful of real, well-known mints (USDC, BONK, JUP, $WIF) against a
throwaway wallet address, using the same `fetchTokenMeta` → `buildDemoFacts`
→ `fileCase` pipeline the live scan uses — only the "read this wallet's
balances from RPC" step is skipped. Run it with:

```bash
npx tsx scripts/seed-demo-cases.ts
```

## The front desk

Before a wallet is connected, the pitch shows live files on a few tokens
people are watching — the list is `FEATURED` in `lib/featured.ts` (pump.fun's
PUMP, e/acc, PAID, Super Inu at the time of writing). They are read from
Jupiter's token API (one request for all of them) and DexScreener (one request,
for the largest pool's venue), on the server, and the home page regenerates at
most every five minutes.

Unlike a wallet's case file, nothing on these is simulated. Every line names
the source and field it came from, and where no public source answers the
question the file says so: liquidity lock status is shown as not checked, and
the age line is the first pool's opening, which Jupiter is explicit is not the
mint's creation time. Jupiter's "top holders" share is labelled the way Jupiter
labels it, without assuming how many holders it counts. Links from these
sources only render if they are plain http(s).

If Jupiter cannot be reached, the pitch falls back to the invented specimen
file instead of an empty desk. The files page through on their own while on
screen; picking one is the only thing that makes them sound.

## Sound

`lib/sound.ts` synthesises every sound with the Web Audio API — no audio files.
A rubber stamp for the red stamps (FILED, DECLINED, the intro's ON FILE), a
page turn when a file opens, a hand of cards dealt when the index arrives,
uneven pencil ticks while the analyst writes, a desk bell when a wallet
connects, two low knocks when something fails. All of it is quiet and sits in a
short generated room reverb behind a compressor.

Nothing sounds before the visitor's first click or key press (browsers forbid
it, and sounds asked for earlier are dropped, not queued). Sound follows what
the visitor does: loops that run on their own, like the paging desk and the
specimen, stay silent. The speaker in the header turns it all off, and the
choice is remembered per browser.

## Motion

Everything that moves is tuned from `lib/motion.ts` — curves, durations, springs,
stagger — and built from the primitives in `components/motion/`, on
[`motion`](https://motion.dev) for React. The house style is that things settle
rather than bounce; the only deliberate overshoot is a stamp landing.

- First visit in a session opens on a closed case file that swings open
  (`components/motion/Intro.tsx`). A script in `<head>` (`lib/intro-script.ts`)
  hides it before first paint for returning visitors and for reduced motion.
- Behind the page: a ruled grid with slight parallax, a desk-lamp light that
  follows the cursor, and dust drawn to a canvas (`Atmosphere.tsx`). Pointer
  effects are off on touch devices; the canvas pauses when the tab is hidden.
- `MotionConfig reducedMotion="user"` turns every transform into an instant
  change for anyone who has asked for less motion; CSS loops stop too.

## Wallet connection

The provider connects only when the visitor has just asked to: clicking
"Connect wallet" marks that intent (`lib/wallet-intent.ts`) and the provider's
`autoConnect` callback turns it into a full `connect()`. A page load with a
remembered wallet only tries a silent reconnect. With a plain
`autoConnect={false}`, picking a wallet in the modal selected it and stopped
there — nothing ever asked the wallet to connect.

## Notes

- Folio is not affiliated with any wallet, chain, or token it reports on.
- Nothing here executes a transaction. The wallet connection is read-only
  (public key + token account balances); there is no swap, no transfer, no
  signature request anywhere in this build.
