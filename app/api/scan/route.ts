import { NextRequest, NextResponse } from "next/server";
import { fetchHeldTokens, isValidPublicKey } from "@/lib/solana";
import { jupiterTokens, readTokenFiles } from "@/lib/token-file";
import { fileCase } from "@/lib/cases-store";
import type { CaseFile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How many positions get a file per scan, largest by dollar value first. */
const MAX_FILES = 12;

export async function POST(req: NextRequest) {
  let body: { wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const wallet = (body.wallet || "").trim();
  if (!wallet || !isValidPublicKey(wallet)) {
    return NextResponse.json({ error: "That is not a Solana address" }, { status: 400 });
  }

  let held;
  try {
    held = await fetchHeldTokens(wallet, 60);
  } catch {
    return NextResponse.json(
      { error: "Could not read that wallet from the chain. The RPC may be rate-limited — try again in a moment" },
      { status: 502 }
    );
  }

  if (held.length === 0) {
    return NextResponse.json({ wallet, cases: [] satisfies CaseFile[] });
  }

  // Rank by what the positions are worth, not by raw token counts: a
  // million of a dead memecoin should not push out the position that
  // matters. Unpriced tokens follow the priced ones.
  const jup = await jupiterTokens(held.map((h) => h.mint));
  const valued = held.map((h) => {
    const price = jup.get(h.mint)?.usdPrice;
    return { ...h, valueUsd: price !== undefined ? h.balanceUi * price : undefined };
  });
  valued.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1) || b.balanceUi - a.balanceUi);
  const top = valued.slice(0, MAX_FILES);

  const files = await readTokenFiles(
    top.map((t) => t.mint),
    jup
  );

  const cases: CaseFile[] = [];
  for (const t of top) {
    const r = files.get(t.mint);
    const token = r?.ok ? r.file : null;
    const j = jup.get(t.mint);
    cases.push(
      await fileCase({
        version: 2,
        wallet,
        mint: t.mint,
        symbol: token?.symbol ?? j?.symbol ?? `${t.mint.slice(0, 4)}…`,
        name: token?.name ?? j?.name ?? "Unlisted token",
        logoUri: j?.icon,
        balanceUi: t.balanceUi,
        decimals: t.decimals,
        valueUsd: t.valueUsd,
        change24hPct: j?.stats24h?.priceChange,
        token,
      })
    );
  }

  return NextResponse.json({ wallet, cases });
}
