# Folio

An analyst for Solana tokens. Connect a wallet and Folio opens a file on every
position in it — or paste any token's contract address in the analyst's pane and
it opens a file on that, no wallet needed. A file holds the token's age, holder
concentration, liquidity next to market cap, who can still mint or freeze it,
and its market and activity, all read live, every line naming its source. The
analyst (built on GPT-6 ASTRA; see /docs) reads it out and answers questions
from it. Files are numbered when filed and never edited afterward.

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

Everything in a file is read live, at the moment the file is opened
(`lib/token-file.ts`):

- **Solana RPC (Helius):** the wallet's token accounts (classic SPL and
  Token-2022, several accounts for one mint summed), the mint account — supply,
  mint and freeze authority, Token-2022 extensions said in terms of what they
  let someone do (transfer fee, permanent delegate, transfer hook, pausable…) —
  the ten largest token accounts, and names for mints Jupiter does not list
  (DAS `getAssetBatch`).
- **Jupiter (Tokens API v2):** price, market cap, 24-hour change, liquidity,
  holder count and top-holder share, first pool and launchpad, audit flags,
  organic score, the project's links.
- **DexScreener:** the largest pool, by venue.

What no public source here answers — whether liquidity is locked, who the
largest holders actually are, the creator fee, what the team has been posting —
is listed in the file as `notChecked`, shown under it, and the analyst closes
on it. Nothing is simulated any more. Files from before this (version 1, with
simulated facts) stay in the append-only store but are no longer served
(`normalizeCase` in `lib/types.ts`).

A wallet scan prices every held token on Jupiter first and files the twelve
largest by dollar value. Reads are batched: one RPC call for every mint
account, one for names, one Jupiter and one DexScreener request per batch, and
the largest-accounts read (which has no batch form) three at a time, to stay
inside the Helius plan's request rate.

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
house rules, but asked to lead with what is most striking about that token —
live authorities or Token-2022 extensions first — and to close on what the file
does not establish.

The model comes from `OPENAI_MODEL`. The site's docs name GPT-6 ASTRA
(`AGENT_MODEL` in `lib/site.ts`), so set `OPENAI_MODEL` to that model's API id.
Reasoning-family models (o-series, GPT-5, GPT-6) get `max_completion_tokens`
with room to think and no custom temperature; older chat models get
`temperature`. If the API still turns a parameter down, the request is retried
once with only what every chat model accepts.

## Routes

```
/                     the whole product: case index on the left, the analyst on the right
/case/[caseNo]         one file on its own page: the facts, sources, prior filings, ask box
/briefing              filed positions ranked by their 24-hour move when filed
/docs                  how the desk works, for visitors
```

`/` is a two-pane shell. The left half is the wallet: the pitch before a wallet
is connected, the case index after. The right half is the analyst, full height —
mascot, status line, and the transcript for whichever position is selected.
Selecting a position is what sets him working: he opens that file and reads it
out unprompted, then takes questions about it. Selecting it again later does not
spend a second call — the transcript is already there.

## API

```
POST /api/scan            { wallet } → reads live token accounts, files new cases
POST /api/analyze          { caseNo, caseFile? } → streams the opening read on that file
POST /api/ask              { caseNo, question, caseFile? } → streams a grounded answer
POST /api/token            { mint, question? } → a file on any token, then the read or answer
GET  /api/token-icon/:mint  the token's logo, fetched server-side and edge-cached
GET  /api/briefing         ?wallet= optional → movers, sorted by |24h change|
```

`/api/analyze` and `/api/ask` answer with newline-delimited JSON rather than a
single object, one event per line, so the agent's text can be written out as the
model produces it:

```
{"t":"file","v":{…TokenFile}}                       /api/token only: the file, first
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
anything (see below). Only its position part (wallet, mint, balance) is taken,
after validation in `lib/case-input.ts`; the token facts are re-read from the
chain and the market, so nothing edited in the request reaches the analyst as
a fact.

Replies end without a full stop — house style. The model is asked for it and
`withoutFinalPeriod` in `lib/ai.ts` makes sure of it.

Token logos never load from the metadata host directly: IPFS gateways
rate-limit and launchpad CDNs refuse hotlinks. `/api/token-icon/:mint` tries
Helius's CDN copy, Jupiter's and DexScreener's icons and several IPFS gateways,
returns the first real image, and lets Vercel's edge cache it for a month.
PUMP's official logo is kept in `public/tokens/` (`lib/token-icon-src.ts`).

## Brand and header

- **The clerk.** Six poses in `public/mascot/` (WebP, 512 px, transparent; see
  the README there). In the analyst panel all six are mounted at once and
  cross-fade, so a mood change never waits on a download; avatars load one.
- **Logo and icons.** `public/brand/folio-mark.webp` in the header, and
  `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`, all cut from the
  idle pose.
- **Contract address.** `CONTRACT_ADDRESS` in `lib/site.ts`, shown in the
  header as `CA: …` and copied whole on click. `NEXT_PUBLIC_FOLIO_CA`
  overrides it without a code change.
- **X.** `X_URL` in the same file; the header links to it.

## The front desk

Before a wallet is connected, the pitch shows live files on a few tokens
people are watching — the list is `FEATURED` in `lib/featured.ts` (pump.fun's
PUMP, e/acc, PAID, Super Inu at the time of writing). They are read from
Jupiter's token API (one request for all of them) and DexScreener (one request,
for the largest pool's venue), on the server, and the home page regenerates at
most every five minutes.

As in a wallet's case file, nothing on these is simulated. Every line names
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

The picker is Folio's own (`components/WalletPicker.tsx`, list in
`lib/wallets.ts`), not the adapter library's modal. Phantom, Solflare and
Backpack are always listed first; MetaMask, which now registers for Solana
too, is left out. An installed wallet connects through Wallet Standard under
its own name. Solflare also connects without the extension, through its web
wallet (`@solana/wallet-adapter-solflare`). A wallet that is not installed
opens its download page on a computer, and on a phone opens Folio inside the
wallet app's browser, where it is then detected.

The provider connects only when the visitor has just picked a wallet: picking
one marks that intent (`lib/wallet-intent.ts`) and the provider's
`autoConnect` callback turns it into a full `connect()`. A page load with a
remembered wallet only tries a silent reconnect. With a plain
`autoConnect={false}`, picking a wallet in the modal selected it and stopped
there — nothing ever asked the wallet to connect.

## Notes

- Folio is not affiliated with any wallet, chain, or token it reports on.
- Nothing here executes a transaction. The wallet connection is read-only
  (public key + token account balances); there is no swap, no transfer, no
  signature request anywhere in this build.
