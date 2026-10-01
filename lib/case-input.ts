import { z } from "zod";
import { getCase } from "./cases-store";
import type { CaseFile } from "./types";

// A case is normally read from the append-only store on disk. That store needs
// a persistent filesystem, which a serverless deployment does not have, so the
// client may also hand back the exact case object /api/scan returned to it.
// The payload is validated against the same shape before it is allowed
// anywhere near a prompt — a malformed or padded object is rejected outright
// rather than quietly reaching the model.

const confidence = z.enum(["live", "demo"]);

function sourced<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    value,
    source: z.string().max(200),
    confidence,
  });
}

export const caseFileSchema = z.object({
  caseNo: z.string().max(40),
  filedAt: z.string().max(40),
  wallet: z.string().max(64),
  mint: z.string().max(64),
  symbol: z.string().max(64),
  name: z.string().max(120),
  logoUri: z.string().max(500).optional(),
  balanceUi: z.number(),
  decimals: z.number(),
  metadataSource: confidence,
  overnightChangePct: z.number(),
  facts: z.object({
    contractAge: sourced(z.object({ days: z.number(), filedOn: z.string().max(40) })),
    holderConcentration: sourced(
      z.object({ holderCount: z.number(), top10Pct: z.number(), top1Pct: z.number() })
    ),
    liquidity: sourced(
      z.object({
        venue: z.string().max(80),
        lockedPct: z.number(),
        canLeave: z.boolean(),
        poolAddressShort: z.string().max(40),
      })
    ),
    creatorFee: sourced(
      z.object({
        venue: z.string().max(80),
        collectorShort: z.string().max(40),
        collectorFull: z.string().max(64),
        unclaimedSol: z.number(),
        splitNote: z.string().max(200),
      })
    ),
    socials: sourced(
      z.object({
        lastActivity: z.string().max(60),
        status: z.enum(["active", "quiet", "silent"]),
        handles: z.object({
          twitter: z.string().max(200).optional(),
          telegram: z.string().max(200).optional(),
          website: z.string().max(200).optional(),
        }),
      })
    ),
  }),
});

/**
 * The store is the source of truth. The client payload is only consulted when
 * the store has no such case — which on a persistent-disk deployment means
 * "no such file", and on a serverless one means "the store never kept it".
 */
export async function resolveCase(
  caseNo: string,
  fallback: unknown
): Promise<CaseFile | null> {
  const stored = await getCase(caseNo);
  if (stored) return stored;

  const parsed = caseFileSchema.safeParse(fallback);
  if (!parsed.success) return null;
  if (parsed.data.caseNo !== caseNo) return null;
  return parsed.data as CaseFile;
}
