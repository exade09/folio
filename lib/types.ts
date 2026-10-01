import type { TokenFile } from "./token-file";

/**
 * One filed position: what the wallet held when the file was opened, and the
 * live file on that token read at the same moment — the chain, Jupiter and
 * DexScreener, each line naming its source.
 *
 * Version 2. Files opened before Folio read live sources carried simulated
 * facts instead; those are not served any more (see normalizeCase).
 */
export interface CaseFile {
  version: 2;
  caseNo: string;
  filedAt: string;
  wallet: string;
  mint: string;
  symbol: string;
  name: string;
  logoUri?: string;
  balanceUi: number;
  decimals: number;
  /** Balance times Jupiter's price when filed, if Jupiter prices it. */
  valueUsd?: number;
  /** Jupiter's 24-hour price change when filed. */
  change24hPct?: number;
  /** Null when the token could not be read at filing time. */
  token: TokenFile | null;
}

/** A stored record is served only if it is a current-format file. */
export function normalizeCase(raw: unknown): CaseFile | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<CaseFile>;
  if (c.version !== 2 || typeof c.caseNo !== "string" || typeof c.mint !== "string") return null;
  return c as CaseFile;
}

export interface WalletCaseIndexEntry {
  mint: string;
  latestCaseNo: string;
  history: string[];
}
