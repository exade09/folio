import { Connection, PublicKey } from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export interface HeldToken {
  mint: string;
  balanceUi: number;
  decimals: number;
}

export async function fetchHeldTokens(ownerBase58: string, max = 12): Promise<HeldToken[]> {
  const connection = new Connection(RPC_URL, "confirmed");
  const owner = new PublicKey(ownerBase58);

  const resp = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  const held: HeldToken[] = [];
  for (const { account } of resp.value) {
    const info = account.data.parsed?.info;
    const amount = info?.tokenAmount;
    if (!amount || Number(amount.amount) <= 0) continue;
    held.push({
      mint: info.mint,
      balanceUi: amount.uiAmount ?? 0,
      decimals: amount.decimals ?? 0,
    });
  }

  held.sort((a, b) => b.balanceUi - a.balanceUi);
  return held.slice(0, max);
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
