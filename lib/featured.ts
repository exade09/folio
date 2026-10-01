import { z } from "zod";

// Tokens on the front desk: files opened on live public data for a handful of
// tokens people are watching, shown before anyone connects a wallet.
//
// Everything here is read, never invented. Each line of a featured file names
// the source and field it came from, and where no public source answers a
// question — whether liquidity is locked, for one — the file says it was not
// checked rather than guessing. That is the difference from the specimen on
// the pitch, whose tickers are invented precisely so it can show figures
// without a source.

export const FEATURED: { mint: string; note?: string }[] = [
  { mint: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn", note: "pump.fun's own token" },
  { mint: "CbcyNo7m1amFWqEQm2m4PLv1UNvpcL3C1Ujm6AkzpKoU" },
  { mint: "98kfF7rmsg1QDUEoCqNE7g7M1FdrTt92TEp2CLzypump" },
  { mint: "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP" },
];

/** How long a front-desk file may be served before it is re-read. */
export const FEATURED_REVALIDATE_SECONDS = 300;

const JUP_SEARCH = "https://lite-api.jup.ag/tokens/v2/search";
const DEXSCREENER_TOKENS = "https://api.dexscreener.com/tokens/v1/solana";

// Only the fields the file uses, all optional: a field Jupiter drops for one
// token should cost that line, not the whole file.
const num = z.number().finite();
const stats = z.object({ priceChange: num.optional(), holderChange: num.optional(), numTraders: num.optional() }).partial();
const jupToken = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  icon: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().optional(),
  telegram: z.string().optional(),
  dev: z.string().optional(),
  launchpad: z.string().optional(),
  metaLaunchpad: z.string().optional(),
  graduatedAt: z.string().optional(),
  holderCount: num.optional(),
  mcap: num.optional(),
  fdv: num.optional(),
  usdPrice: num.optional(),
  liquidity: num.optional(),
  stats24h: stats.optional(),
  firstPool: z.object({ id: z.string().optional(), createdAt: z.string() }).partial().optional(),
  audit: z
    .object({
      mintAuthorityDisabled: z.boolean(),
      freezeAuthorityDisabled: z.boolean(),
      topHoldersPercentage: num,
      devBalancePercentage: num,
      devMints: num,
    })
    .partial()
    .optional(),
  organicScore: num.optional(),
  organicScoreLabel: z.string().optional(),
  isVerified: z.boolean().optional(),
  updatedAt: z.string().optional(),
});

const dexPair = z.object({
  dexId: z.string(),
  pairAddress: z.string(),
  url: z.string().optional(),
  labels: z.array(z.string()).optional(),
  baseToken: z.object({ address: z.string() }),
  liquidity: z.object({ usd: num.optional() }).optional(),
});

export interface FeaturedToken {
  mint: string;
  note?: string;
  name: string;
  symbol: string;
  icon?: string;
  verified: boolean;
  priceUsd?: number;
  mcapUsd?: number;
  change24hPct?: number;
  /** Jupiter's own refresh time for this token, or our read time when absent. */
  asOf: string;

  age?: { firstPoolAt: string; days: number; launchpad?: string; graduatedAt?: string };
  holders?: { count?: number; topHoldersPct?: number; change24hPct?: number };
  liquidity?: {
    totalUsd?: number;
    largestPool?: { venue: string; address: string; usd?: number; url?: string };
  };
  authorities?: {
    mintRenounced?: boolean;
    freezeRenounced?: boolean;
    devMints?: number;
    devBalancePct?: number;
  };
  activity?: {
    traders24h?: number;
    organicScore?: number;
    organicLabel?: string;
    links: { kind: "x" | "website" | "telegram"; url: string }[];
  };
}

export interface FeaturedDesk {
  tokens: FeaturedToken[];
  readAt: string;
}

const DAY_MS = 86_400_000;

/**
 * These URLs come from third-party APIs and end up in href and src
 * attributes. Only plain http(s) gets through: a javascript: or data: URL
 * from a token's metadata never reaches the page.
 */
function safeUrl(u: string | undefined): string | undefined {
  if (!u) return undefined;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: FEATURED_REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

const VENUE: Record<string, string> = {
  pumpswap: "PumpSwap",
  raydium: "Raydium",
  meteora: "Meteora",
  orca: "Orca",
  "meteora-dlmm": "Meteora DLMM",
};

function venueName(dexId: string, labels?: string[]) {
  const base = VENUE[dexId] ?? dexId.charAt(0).toUpperCase() + dexId.slice(1);
  return labels?.length ? `${base} ${labels.join(" ")}` : base;
}

/**
 * Reads the front desk. Returns null when Jupiter cannot be reached at all —
 * the caller shows the specimen file instead of an empty desk. DexScreener is
 * optional: without it the liquidity line keeps its total and only loses the
 * name of the largest pool.
 */
export async function getFeaturedDesk(): Promise<FeaturedDesk | null> {
  const mints = FEATURED.map((f) => f.mint);
  const readAt = new Date().toISOString();

  let jup: z.infer<typeof jupToken>[];
  try {
    const raw = await getJson(`${JUP_SEARCH}?query=${mints.join(",")}`);
    jup = (Array.isArray(raw) ? raw : [])
      .map((t) => jupToken.safeParse(t))
      .filter((r) => r.success)
      .map((r) => r.data);
  } catch {
    return null;
  }
  if (jup.length === 0) return null;

  const largest = new Map<string, z.infer<typeof dexPair>>();
  try {
    const raw = await getJson(`${DEXSCREENER_TOKENS}/${mints.join(",")}`);
    for (const p of Array.isArray(raw) ? raw : []) {
      const r = dexPair.safeParse(p);
      if (!r.success) continue;
      const prev = largest.get(r.data.baseToken.address);
      if (!prev || (r.data.liquidity?.usd ?? 0) > (prev.liquidity?.usd ?? 0)) {
        largest.set(r.data.baseToken.address, r.data);
      }
    }
  } catch {
    // Liquidity keeps its total from Jupiter; only the venue goes missing.
  }

  const now = Date.now();
  const tokens: FeaturedToken[] = [];
  for (const { mint, note } of FEATURED) {
    const t = jup.find((j) => j.id === mint);
    if (!t) continue;
    const pool = largest.get(mint);
    const firstPoolAt = t.firstPool?.createdAt;
    const links: NonNullable<FeaturedToken["activity"]>["links"] = [];
    for (const [kind, url] of [
      ["x", safeUrl(t.twitter)],
      ["website", safeUrl(t.website)],
      ["telegram", safeUrl(t.telegram)],
    ] as const) {
      if (url) links.push({ kind, url });
    }

    tokens.push({
      mint,
      note,
      name: t.name,
      symbol: t.symbol,
      icon: safeUrl(t.icon),
      verified: Boolean(t.isVerified),
      priceUsd: t.usdPrice,
      mcapUsd: t.mcap ?? t.fdv,
      change24hPct: t.stats24h?.priceChange,
      asOf: t.updatedAt ?? readAt,
      age: firstPoolAt
        ? {
            firstPoolAt,
            days: Math.max(0, Math.floor((now - Date.parse(firstPoolAt)) / DAY_MS)),
            launchpad: t.launchpad,
            graduatedAt: t.graduatedAt,
          }
        : undefined,
      holders: {
        count: t.holderCount,
        topHoldersPct: t.audit?.topHoldersPercentage,
        change24hPct: t.stats24h?.holderChange,
      },
      liquidity: {
        totalUsd: t.liquidity,
        largestPool: pool
          ? {
              venue: venueName(pool.dexId, pool.labels),
              address: pool.pairAddress,
              usd: pool.liquidity?.usd,
              url: safeUrl(pool.url),
            }
          : undefined,
      },
      authorities: t.audit
        ? {
            mintRenounced: t.audit.mintAuthorityDisabled,
            freezeRenounced: t.audit.freezeAuthorityDisabled,
            devMints: t.audit.devMints,
            devBalancePct: t.audit.devBalancePercentage,
          }
        : undefined,
      activity: {
        traders24h: t.stats24h?.numTraders,
        organicScore: t.organicScore,
        organicLabel: t.organicScoreLabel,
        links,
      },
    });
  }

  return tokens.length ? { tokens, readAt } : null;
}
