import { isMintLike, resolveLogo } from "@/lib/token-icon";

export const runtime = "nodejs";

// A token's logo, fetched once by the server and then served from Vercel's
// edge cache. See lib/token-icon.ts for why the browser never goes to the
// metadata host itself.
export async function GET(_req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (!isMintLike(mint)) {
    return new Response("Not a mint", { status: 400 });
  }

  const logo = await resolveLogo(mint);
  if (!logo) {
    // Cached briefly: a token with no logo today may get one tomorrow, and a
    // gateway that was down should be retried before long.
    return new Response("No logo", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" },
    });
  }

  return new Response(logo.bytes as BodyInit, {
    headers: {
      "Content-Type": logo.type,
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      // An SVG opened on its own would otherwise run in our origin.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
