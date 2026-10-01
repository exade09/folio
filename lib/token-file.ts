import { z } from "zod";
import { dexPair, jupToken, safeUrl, venueName } from "./featured";
import { serverRpcUrl } from "./solana";
import { isMintLike } from "./token-icon-src";

// A file on any token, opened from nothing but its contract address.
//
// No wallet is involved: the visitor pastes a mint and the analyst reads what
// the public record says about it. Three sources, each named on every line it
// fills: the chain itself through our RPC (supply, authorities, Token-2022
// extensions, the largest accounts), Jupiter (market, holders, age, audit
// flags) and DexScreener (the largest pool). A source that is down costs its
// own lines; only the chain is required, since without it there is no proof
// the address is a token at all.

export interface TokenFile {
  kind: "token";
  mint: string;
  name: string;
  symbol: string;
  readAt: string;
  program: "SPL Token" | "Token-2022";
  listedOnJupiter: boolean;
  verifiedOnJupiter?: boolean;

  supply: { amount: number; decimals: number; source: string };
  authorities: {
    mintAuthority: string | null;
    freezeAuthority: string | null;
    source: string;
  };
  /** Token-2022 extensions that change what a holder can do with the token. */
  extensions?: { name: string; detail: string }[];

  market?: {
    priceUsd?: number;
    marketCapUsd?: number;
    fdvUsd?: number;
    change24hPct?: number;
    liquidityUsd?: number;
    source: string;
  };
  largestPool?: { venue: string; address: string; liquidityUsd?: number; url?: string; source: string };
  holders?: { count?: number; top10SharePct?: number; change24hPct?: number; source: string };
  largestAccounts?: {
    top1Pct: number;
    top10Pct: number;
    accountsRead: number;
    caveat: string;
    source: string;
  };
  age?: { firstPoolAt: string; days: number; launchpad?: string; graduatedAt?: string; source: string };
  dev?: { tokensMintedByDev?: number; devBalancePct?: number; source: string };
  activity?: { traders24h?: number; organicScore?: number; organicLabel?: string; source: string };
  links: { kind: "x" | "website" | "telegram"; url: string }[];
  /** Questions people ask that none of the sources here answer. */
  notChecked: string[];
}

export type TokenFileResult =
  | { ok: true; file: TokenFile }
  | { ok: false; status: number; message: string };

const DAY_MS = 86_400_000;
const RPC = "Solana RPC";

async function rpc<T>(method: string, params: unknown[] | Record<string, unknown>): Promise<T> {
  const res = await fetch(serverRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const data = (await res.json()) as { result?: T; error?: { message?: string } };
  if (data.error) throw new Error(data.error.message || "rpc error");
  return data.result as T;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

const parsedMint = z.object({
  owner: z.string(),
  data: z.object({
    program: z.string(),
    parsed: z.object({
      type: z.literal("mint"),
      info: z.object({
        decimals: z.number(),
        supply: z.string(),
        mintAuthority: z.string().nullable().optional(),
        freezeAuthority: z.string().nullable().optional(),
        extensions: z.array(z.object({ extension: z.string(), state: z.unknown().optional() })).optional(),
      }),
    }),
  }),
});

const largestAccounts = z.object({
  value: z.array(z.object({ address: z.string(), amount: z.string() })),
});

const asset = z
  .object({
    content: z
      .object({ metadata: z.object({ name: z.string().optional(), symbol: z.string().optional() }).partial() })
      .partial()
      .optional(),
  })
  .partial();

function short(a: string) {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function toUi(raw: string, decimals: number): number {
  const n = BigInt(raw);
  if (decimals <= 0) return Number(n);
  const base = BigInt(10) ** BigInt(decimals);
  return Number(`${n / base}.${(n % base).toString().padStart(decimals, "0")}`);
}

function pct(part: bigint, whole: bigint): number {
  if (whole === BigInt(0)) return 0;
  return Number((part * BigInt(100_000)) / whole) / 1000;
}

/** Token-2022 extensions, said in terms of what they let someone do. */
function describeExtensions(exts: { extension: string; state?: unknown }[]): { name: string; detail: string }[] {
  const out: { name: string; detail: string }[] = [];
  for (const e of exts) {
    const s = (e.state ?? {}) as Record<string, unknown>;
    switch (e.extension) {
      case "transferFeeConfig": {
        const newer = (s.newerTransferFee ?? {}) as { transferFeeBasisPoints?: number };
        const bps = newer.transferFeeBasisPoints ?? 0;
        out.push({
          name: "Transfer fee",
          detail: `${(bps / 100).toFixed(2)}% of every transfer is withheld${s.transferFeeConfigAuthority ? `; the rate can be changed by ${short(String(s.transferFeeConfigAuthority))}` : "; nobody can change the rate"}`,
        });
        break;
      }
      case "permanentDelegate":
        out.push({
          name: "Permanent delegate",
          detail: s.delegate
            ? `${short(String(s.delegate))} can move or burn tokens out of any holder's account`
            : "set, but with no delegate address",
        });
        break;
      case "transferHook":
        if (s.programId) {
          out.push({ name: "Transfer hook", detail: `every transfer also runs program ${short(String(s.programId))}` });
        }
        break;
      case "nonTransferable":
        out.push({ name: "Non-transferable", detail: "holders cannot send it to anyone" });
        break;
      case "defaultAccountState":
        if (String(s.accountState) === "frozen") {
          out.push({ name: "Frozen by default", detail: "new holder accounts start frozen until the freeze authority thaws them" });
        }
        break;
      case "mintCloseAuthority":
        if (s.closeAuthority) {
          out.push({ name: "Mint close authority", detail: `${short(String(s.closeAuthority))} can close the mint once supply is zero` });
        }
        break;
      case "pausableConfig":
        out.push({
          name: "Pausable",
          detail: `${s.paused ? "transfers are paused right now" : "transfers can be paused"}${s.authority ? ` by ${short(String(s.authority))}` : ""}`,
        });
        break;
      case "interestBearingConfig":
        out.push({ name: "Interest-bearing", detail: "the displayed balance grows over time at a rate an authority sets" });
        break;
      case "scaledUiAmountConfig":
        out.push({ name: "Scaled UI amount", detail: "the displayed balance is multiplied by a factor an authority can change" });
        break;
      default:
        // metadataPointer, tokenMetadata, groupPointer and the like describe the
        // token rather than limit holders; they are not risk lines.
        break;
    }
  }
  return out;
}

/** Runs at most `limit` of the tasks at once, in order. */
async function pool<T>(items: string[], limit: number, task: (item: string) => Promise<T>): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: "fulfilled", value: await task(items[i]) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Jupiter's record for each mint it lists, keyed by mint. */
export async function jupiterTokens(mints: string[]): Promise<Map<string, z.infer<typeof jupToken>>> {
  const out = new Map<string, z.infer<typeof jupToken>>();
  for (let i = 0; i < mints.length; i += 100) {
    const batch = mints.slice(i, i + 100);
    try {
      const raw = await getJson(`https://lite-api.jup.ag/tokens/v2/search?query=${batch.join(",")}`);
      for (const t of Array.isArray(raw) ? raw : []) {
        const r = jupToken.safeParse(t);
        if (r.success && batch.includes(r.data.id)) out.set(r.data.id, r.data);
      }
    } catch {
      // That batch simply goes unlisted; the chain lines still stand.
    }
  }
  return out;
}

async function largestPools(mints: string[]): Promise<Map<string, z.infer<typeof dexPair>>> {
  const out = new Map<string, z.infer<typeof dexPair>>();
  for (let i = 0; i < mints.length; i += 30) {
    try {
      const raw = await getJson(`https://api.dexscreener.com/tokens/v1/solana/${mints.slice(i, i + 30).join(",")}`);
      for (const p of Array.isArray(raw) ? raw : []) {
        const r = dexPair.safeParse(p);
        if (!r.success) continue;
        const prev = out.get(r.data.baseToken.address);
        if (!prev || (r.data.liquidity?.usd ?? 0) > (prev.liquidity?.usd ?? 0)) out.set(r.data.baseToken.address, r.data);
      }
    } catch {
      // Pools go unnamed; liquidity keeps Jupiter's total.
    }
  }
  return out;
}

/**
 * Files on several tokens at once, with as few calls as the sources allow:
 * one RPC call for every mint account, one for every name, one Jupiter and
 * one DexScreener request per batch, and the largest-accounts read — the one
 * call the RPC has no batch form of — three at a time, so a wallet with a
 * dozen tokens stays inside the RPC plan's request rate.
 */
export async function readTokenFiles(
  mintInputs: string[],
  known?: Map<string, z.infer<typeof jupToken>>
): Promise<Map<string, TokenFileResult>> {
  const results = new Map<string, TokenFileResult>();
  const mints = [...new Set(mintInputs.map((m) => m.trim()))];
  for (const m of mints) {
    if (!isMintLike(m)) results.set(m, { ok: false, status: 400, message: "That does not look like a Solana contract address" });
  }
  const valid = mints.filter((m) => isMintLike(m));
  if (!valid.length) return results;

  const [accounts, assets, jup, pools, largest] = await Promise.all([
    rpc<{ value: unknown[] }>("getMultipleAccounts", [valid, { encoding: "jsonParsed", commitment: "confirmed" }]).then(
      (r) => ({ ok: true as const, value: r.value }),
      () => ({ ok: false as const, value: [] as unknown[] })
    ),
    rpc<unknown[]>("getAssetBatch", { ids: valid }).catch(() => [] as unknown[]),
    known && valid.every((m) => known.has(m)) ? Promise.resolve(known) : jupiterTokens(valid),
    largestPools(valid),
    pool(valid, 3, (m) => rpc<unknown>("getTokenLargestAccounts", [m, { commitment: "confirmed" }])),
  ]);

  valid.forEach((mint, i) => {
    if (!accounts.ok) {
      results.set(mint, { ok: false, status: 502, message: "Could not read that address from the chain right now. Try again in a moment" });
      return;
    }
    const das = Array.isArray(assets) ? assets.find((a) => (a as { id?: string })?.id === mint) : undefined;
    const lg = largest[i];
    results.set(
      mint,
      buildFile(mint, accounts.value[i], lg?.status === "fulfilled" ? lg.value : undefined, das, jup.get(mint), pools.get(mint))
    );
  });
  return results;
}

export async function readTokenFile(mintInput: string): Promise<TokenFileResult> {
  const mint = mintInput.trim();
  const results = await readTokenFiles([mint]);
  return results.get(mint) ?? { ok: false, status: 500, message: "Nothing came back for that address" };
}

function buildFile(
  mint: string,
  accountValue: unknown,
  largestValue: unknown,
  dasValue: unknown,
  j: z.infer<typeof jupToken> | undefined,
  pool: z.infer<typeof dexPair> | undefined
): TokenFileResult {
  if (!accountValue) {
    return { ok: false, status: 404, message: "Nothing lives at that address on Solana mainnet" };
  }
  const acct = parsedMint.safeParse(accountValue);
  if (!acct.success) {
    return { ok: false, status: 422, message: "That address is not a token mint. Paste the token's contract address, not a wallet or a pool" };
  }

  const info = acct.data.data.parsed.info;
  const program: TokenFile["program"] = acct.data.data.program === "spl-token-2022" ? "Token-2022" : "SPL Token";
  const readAt = new Date().toISOString();

  const meta = dasValue ? asset.safeParse(dasValue) : undefined;
  const dasMeta = meta?.success ? meta.data.content?.metadata : undefined;
  const name = j?.name || dasMeta?.name?.trim() || "Unnamed token";
  const symbol = j?.symbol || dasMeta?.symbol?.trim() || short(mint);

  const file: TokenFile = {
    kind: "token",
    mint,
    name,
    symbol,
    readAt,
    program,
    listedOnJupiter: Boolean(j),
    verifiedOnJupiter: j ? Boolean(j.isVerified) : undefined,
    supply: { amount: toUi(info.supply, info.decimals), decimals: info.decimals, source: RPC },
    authorities: {
      mintAuthority: info.mintAuthority ?? null,
      freezeAuthority: info.freezeAuthority ?? null,
      source: RPC,
    },
    links: [],
    notChecked: [
      "whether the liquidity is locked or burned",
      "who the largest holders are (wallet, pool, exchange or team)",
      "the creator fee and who collects it",
      "what the project's socials have been saying",
    ],
  };

  const exts = info.extensions ? describeExtensions(info.extensions) : [];
  if (exts.length) file.extensions = exts;

  if (largestValue) {
    const r = largestAccounts.safeParse(largestValue);
    const supplyRaw = BigInt(info.supply);
    if (r.success && r.data.value.length && supplyRaw > BigInt(0)) {
      const amounts = r.data.value.map((a) => BigInt(a.amount));
      const top10 = amounts.slice(0, 10).reduce((s, a) => s + a, BigInt(0));
      file.largestAccounts = {
        top1Pct: pct(amounts[0], supplyRaw),
        top10Pct: pct(top10, supplyRaw),
        accountsRead: amounts.length,
        caveat:
          "These are token accounts, not people: the largest is often a liquidity pool, a bonding curve or an exchange",
        source: RPC,
      };
    }
  }

  if (j) {
    file.market = {
      priceUsd: j.usdPrice,
      marketCapUsd: j.mcap,
      fdvUsd: j.fdv,
      change24hPct: j.stats24h?.priceChange,
      liquidityUsd: j.liquidity,
      source: "Jupiter",
    };
    file.holders = {
      count: j.holderCount,
      top10SharePct: j.audit?.topHoldersPercentage,
      change24hPct: j.stats24h?.holderChange,
      source: "Jupiter",
    };
    if (j.firstPool?.createdAt) {
      file.age = {
        firstPoolAt: j.firstPool.createdAt,
        days: Math.max(0, Math.floor((Date.now() - Date.parse(j.firstPool.createdAt)) / DAY_MS)),
        launchpad: j.launchpad,
        graduatedAt: j.graduatedAt,
        source: "Jupiter (age of the first trading pool, not of the mint)",
      };
    }
    if (j.audit?.devMints !== undefined || j.audit?.devBalancePercentage !== undefined) {
      file.dev = {
        tokensMintedByDev: j.audit?.devMints,
        devBalancePct: j.audit?.devBalancePercentage,
        source: "Jupiter audit",
      };
    }
    file.activity = {
      traders24h: j.stats24h?.numTraders,
      organicScore: j.organicScore,
      organicLabel: j.organicScoreLabel,
      source: "Jupiter",
    };
    for (const [kind, url] of [
      ["x", safeUrl(j.twitter)],
      ["website", safeUrl(j.website)],
      ["telegram", safeUrl(j.telegram)],
    ] as const) {
      if (url) file.links.push({ kind, url });
    }
  }

  if (pool) {
    file.largestPool = {
      venue: venueName(pool.dexId, pool.labels),
      address: pool.pairAddress,
      liquidityUsd: pool.liquidity?.usd,
      url: safeUrl(pool.url),
      source: "DexScreener",
    };
  }

  return { ok: true, file };
}
