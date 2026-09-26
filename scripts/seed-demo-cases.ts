// One-off manual QA helper: files real case entries for a test wallet using
// a hardcoded token list, so the UI can be reviewed without depending on a
// rate-limited public RPC for the "wallet holds these tokens" step. Not part
// of the app; run with `npx tsx scripts/seed-demo-cases.ts` and delete when done.
import { fetchTokenMeta } from "../lib/solana";
import { buildDemoFacts, buildOvernightChangePct } from "../lib/demo-enrichment";
import { fileCase } from "../lib/cases-store";

const WALLET = "Eyjh5DN25gGDC3BkcuwHaDGpg4pqytaEtLb5Lempw87k";

const TOKENS = [
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", balanceUi: 1240.5, decimals: 6 },
  { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", balanceUi: 42_500_000, decimals: 5 },
  { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", balanceUi: 3000, decimals: 6 },
  { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", balanceUi: 18000, decimals: 6 },
];

async function main() {
  for (const t of TOKENS) {
    const meta = await fetchTokenMeta(t.mint);
    const facts = buildDemoFacts(t.mint);
    const overnightChangePct = buildOvernightChangePct(t.mint);
    const c = await fileCase({
      wallet: WALLET,
      mint: t.mint,
      symbol: meta.symbol,
      name: meta.name,
      logoUri: meta.logoUri,
      balanceUi: t.balanceUi,
      decimals: t.decimals,
      metadataSource: meta.found ? "live" : "demo",
      overnightChangePct,
      facts,
    });
    console.log(c.caseNo, c.symbol, c.name, meta.found ? "(live meta)" : "(unlisted)");
  }
}

main();
