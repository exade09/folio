import { Connection, PublicKey } from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

/**
 * The RPC the server reads the chain through. With HELIUS_API_KEY set it is
 * Helius; otherwise SOLANA_RPC_URL, otherwise the public endpoint (which
 * rate-limits quickly and is only fit for trying things out).
 *
 * Server-only on purpose. The key rides in the URL, so it must never be put
 * in a NEXT_PUBLIC_* variable: those are compiled into the JavaScript every
 * visitor downloads. The browser has no reason to touch the RPC at all —
 * Folio never sends a transaction — so NEXT_PUBLIC_SOLANA_RPC_URL can stay
 * the public endpoint.
 */
export function serverRpcUrl(): string {
  const key = process.env.HELIUS_API_KEY?.trim();
  if (key) return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`;
  return process.env.SOLANA_RPC_URL?.trim() || PUBLIC_RPC;
}

let connection: Connection | null = null;
function getConnection(): Connection {
  if (!connection) connection = new Connection(serverRpcUrl(), "confirmed");
  return connection;
}

export interface HeldToken {
  mint: string;
  balanceUi: number;
  decimals: number;
}

/**
 * Every fungible position the wallet holds, across both token programs.
 *
 * Token-2022 mints live under a different program id than classic SPL ones,
 * and a query against one program never returns the other's accounts — a
 * wallet's Token-2022 positions were simply invisible before. A wallet can
 * also hold several token accounts for the same mint (an associated account
 * plus older ones), so balances are summed per mint rather than listed once
 * per account.
 */
export async function fetchHeldTokens(ownerBase58: string, max = 12): Promise<HeldToken[]> {
  const connection = getConnection();
  const owner = new PublicKey(ownerBase58);

  const [classic, t22] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
  ]);

  const byMint = new Map<string, { raw: bigint; decimals: number }>();
  for (const { account } of [...classic.value, ...t22.value]) {
    const info = account.data.parsed?.info;
    const amount = info?.tokenAmount;
    if (!info?.mint || !amount?.amount) continue;
    const raw = BigInt(amount.amount);
    if (raw <= BigInt(0)) continue;
    const prev = byMint.get(info.mint);
    byMint.set(info.mint, {
      raw: (prev?.raw ?? BigInt(0)) + raw,
      decimals: amount.decimals ?? prev?.decimals ?? 0,
    });
  }

  const held: HeldToken[] = [];
  for (const [mint, { raw, decimals }] of byMint) {
    held.push({ mint, decimals, balanceUi: toUi(raw, decimals) });
  }

  held.sort((a, b) => b.balanceUi - a.balanceUi);
  return held.slice(0, max);
}

/** Raw integer amount to a display number, without going through a float first. */
function toUi(raw: bigint, decimals: number): number {
  if (decimals <= 0) return Number(raw);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const frac = (raw % base).toString().padStart(decimals, "0");
  return Number(`${whole}.${frac}`);
}

export interface TokenMeta {
  symbol: string;
  name: string;
  logoUri?: string;
  found: boolean;
}

const JUP_TOKEN_SEARCH_URL = "https://lite-api.jup.ag/tokens/v2/search";

export async function fetchTokenMeta(mint: string): Promise<TokenMeta> {
  try {
    const res = await fetch(`${JUP_TOKEN_SEARCH_URL}?query=${mint}`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const match = Array.isArray(data) ? data.find((t) => t.id === mint) : null;
    if (!match?.symbol) throw new Error("no symbol");
    return {
      symbol: match.symbol,
      name: match.name || match.symbol,
      logoUri: match.icon || undefined,
      found: true,
    };
  } catch {
    return {
      symbol: `${mint.slice(0, 4)}…`,
      name: "Unlisted token",
      found: false,
    };
  }
}

export function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
