import { NextRequest, NextResponse } from "next/server";
import { getMovers } from "@/lib/briefing";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim();
  const sorted = await getMovers(wallet || undefined);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    scope: wallet ? "wallet" : "all-filed",
    movers: sorted.slice(0, 20),
  });
}
