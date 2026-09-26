import { NextRequest, NextResponse } from "next/server";
import { fetchHeldTokens, fetchTokenMeta, isValidPublicKey } from "@/lib/solana";
import { buildDemoFacts, buildOvernightChangePct } from "@/lib/demo-enrichment";
import { fileCase } from "@/lib/cases-store";
import type { CaseFile } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: { wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const wallet = (body.wallet || "").trim();
  if (!wallet || !isValidPublicKey(wallet)) {
    return NextResponse.json({ error: "That is not a Solana address." }, { status: 400 });
  }

  let held;
  try {
    held = await fetchHeldTokens(wallet);
  } catch {
    return NextResponse.json(
      { error: "Could not read that wallet from the chain. The RPC may be rate-limited — try again in a moment." },
      { status: 502 }
    );
  }

  if (held.length === 0) {
    return NextResponse.json({ wallet, cases: [] satisfies CaseFile[] });
  }

  const cases = await Promise.all(
    held.map(async (token) => {
      const meta = await fetchTokenMeta(token.mint);
      const facts = buildDemoFacts(token.mint);
      const overnightChangePct = buildOvernightChangePct(token.mint);
      return fileCase({
        wallet,
        mint: token.mint,
        symbol: meta.symbol,
        name: meta.name,
        logoUri: meta.logoUri,
        balanceUi: token.balanceUi,
        decimals: token.decimals,
        metadataSource: meta.found ? "live" : "demo",
        overnightChangePct,
        facts,
      });
    })
  );

  return NextResponse.json({ wallet, cases });
}
