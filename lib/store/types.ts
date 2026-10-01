import type { CaseFile } from "../types";

export type CaseDraft = Omit<CaseFile, "caseNo" | "filedAt">;

/**
 * Everything the app asks of the case store. Two implementations sit behind
 * it — Postgres (lib/store/pg-store.ts) when DATABASE_URL is set, plain JSON
 * files (lib/store/file-store.ts) when it is not — and neither offers a way
 * to change or remove a case once filed. That absence is the product rule,
 * not an omission.
 */
export interface CaseStore {
  /** Files a new case under the next number and returns it as stored. */
  fileCase(draft: CaseDraft): Promise<CaseFile>;
  getCase(caseNo: string): Promise<CaseFile | null>;
  /** The newest case for each mint this wallet has had filed. */
  listLatestCasesForWallet(wallet: string): Promise<CaseFile[]>;
  /** Every case filed for this wallet and mint, newest first. */
  getCaseHistory(wallet: string, mint: string): Promise<CaseFile[]>;
  /** The most recently filed cases across all wallets, newest first. */
  listRecentCases(limit?: number): Promise<CaseFile[]>;
}

export function formatCaseNo(n: number | bigint): string {
  // padStart never truncates, so case one million reads F-1000000, not F-000000.
  return `F-${String(n).padStart(6, "0")}`;
}
