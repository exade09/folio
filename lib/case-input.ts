import { z } from "zod";
import { getCase } from "./cases-store";
import { readTokenFile } from "./token-file";
import type { CaseFile } from "./types";

// A case is normally read from the append-only store. A serverless deploy
// without DATABASE_URL has no persistent store, so the client may hand back
// the case object /api/scan gave it. Only the position part of that object is
// taken on trust — which wallet, which mint, how much — and only after it
// passes this schema. The token facts are never taken from the client: they
// are read again from the chain and the market, so nothing a visitor edits in
// the request can reach the analyst as a "fact".

const position = z.object({
  version: z.literal(2),
  caseNo: z.string().max(40),
  filedAt: z.string().max(40),
  wallet: z.string().max(64),
  mint: z.string().max(64),
  symbol: z.string().max(64),
  name: z.string().max(120),
  logoUri: z.string().max(500).optional(),
  balanceUi: z.number().finite(),
  decimals: z.number().int().min(0).max(18),
  valueUsd: z.number().finite().optional(),
  change24hPct: z.number().finite().optional(),
});

export async function resolveCase(caseNo: string, fallback: unknown): Promise<CaseFile | null> {
  const stored = await getCase(caseNo);
  if (stored) return stored;

  const parsed = position.safeParse(fallback);
  if (!parsed.success || parsed.data.caseNo !== caseNo) return null;

  const read = await readTokenFile(parsed.data.mint);
  return { ...parsed.data, token: read.ok ? read.file : null };
}
