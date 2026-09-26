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
| Chain     | Solana mainnet-beta, read-only                                 |
| Wallet    | Wallet Standard auto-detection via `@solana/wallet-adapter-react` (no per-wallet adapter package needed for Phantom, Solflare, Backpack, …) |
| AI        | OpenAI Chat Completions, grounded strictly to one case file per call |

## Running it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Set `OPENAI_API_KEY` in `.env.local` (see
`.env.example`) before the "ask" box on a case file will answer — without it,
the rest of the product still works, the ask box just reports the analyst is
unreachable.

## What's real today and what isn't

This is the one thing the product cannot afford to fudge, so it's spelled out
plainly rather than left to be discovered:

- **Real, live:** the wallet connection, the list of SPL tokens it holds, and
  their balances — read straight off Solana mainnet-beta with a public RPC
  call. Token name/symbol/logo come from Jupiter's public token list
  (`lite-api.jup.ag`) when a mint is listed there; unlisted mints fall back to
  a shortened address, never a made-up name.
- **Simulated, clearly marked "Demo":** the five analytical facts inside each
  file — contract age, holder concentration, liquidity location and lock
  status, creator fee collector, social activity. These need a paid indexer
  (Helius or Birdeye) that this build doesn't have a key for yet. Every fact
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

`lib/cases-store.ts` is a small append-only JSON store (`data/cases/`, git-
ignored). Scanning a wallet always writes brand new case numbers
(`F-000001`, `F-000002`, …); an existing case file is never opened for
writing again. Re-scanning the same position files a new case rather than
updating the old one, and the old one stays exactly as it was — including a
number that later reads as wrong. `getCaseHistory` is what a case page uses to
list its own prior filings.

This is a local, single-instance store — good for development and a small
deployment with a persistent disk, not for a serverless platform with an
ephemeral filesystem. Moving it to a real database (Postgres, SQLite on a
volume, etc.) means replacing the file reads/writes in `cases-store.ts`; the
function signatures are the seam.

## The AI analyst

`lib/ai.ts` builds a per-request system prompt containing exactly one case
file's JSON and instructs the model to answer only from it, cite which field
it used, and say plainly when something isn't in the file. A buy/sell/
investment-advice question is refused before the model is even called
(`isAdviceRequest` in the same file) — that rule doesn't depend on the model
choosing to follow the system prompt.

## Routes

```
/                     landing page, what's in a file, what's real vs demo
/wallet/[address]      case index for a connected wallet — scans + files on load
/case/[caseNo]         one file: the five facts, sources, prior filings, ask box
/briefing              "this morning" — filed positions ranked by overnight move
```

## API

```
POST /api/scan      { wallet } → reads live token accounts, files new cases
POST /api/ask        { caseNo, question } → grounded answer from that one file
GET  /api/briefing   ?wallet= optional → movers, sorted by |overnight change|
```

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

## Notes

- Folio is not affiliated with any wallet, chain, or token it reports on.
- Nothing here executes a transaction. The wallet connection is read-only
  (public key + token account balances); there is no swap, no transfer, no
  signature request anywhere in this build.
