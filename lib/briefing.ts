import { listLatestCasesForWallet, listRecentCases } from "./cases-store";
import type { CaseFile } from "./types";

export async function getMovers(wallet?: string): Promise<CaseFile[]> {
  let cases: CaseFile[];
  if (wallet) {
    cases = await listLatestCasesForWallet(wallet);
  } else {
    const recent = await listRecentCases();
    const byMint = new Map<string, CaseFile>();
    for (const c of recent) {
      if (!byMint.has(c.mint)) byMint.set(c.mint, c);
    }
    cases = Array.from(byMint.values());
  }

  // Only files where Jupiter reported a 24-hour change can be ranked by it.
  return cases.filter((c) => c.change24hPct !== undefined).sort(
    (a, b) => Math.abs(b.change24hPct ?? 0) - Math.abs(a.change24hPct ?? 0)
  );
}
