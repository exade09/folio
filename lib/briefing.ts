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

  return [...cases].sort(
    (a, b) => Math.abs(b.overnightChangePct) - Math.abs(a.overnightChangePct)
  );
}
