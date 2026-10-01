import { serverRpcUrl } from "./solana";
export { LOCAL_ICONS, isMintLike, tokenIconSrc } from "./token-icon-src";

// Token logos, served from our own origin.
//
// A token's icon is whatever URL its creator put in the metadata: an IPFS
// gateway that rate-limits, a launchpad's CDN that refuses hotlinks, a bucket
// a visitor's network blocks. Pointing <img> at those straight from the page
// left most avatars broken. Instead the browser asks /api/token-icon/<mint>,
// and the server finds the picture, tries it through more than one route, and
// hands back the bytes with a long cache — after the first visitor, Vercel's
// edge serves it and nobody waits on IPFS again.

// Gateways tried for anything stored on IPFS, fastest-answering first. ipfs.io
// is kept, but last: it rate-limits shared hosts like Vercel's hard.
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://ipfs.io/ipfs/",
];

/** An IPFS path (cid plus optional path) if the URL points into IPFS. */
function ipfsPath(url: string): string | null {
  if (url.startsWith("ipfs://")) return url.slice("ipfs://".length).replace(/^ipfs\//, "");
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/ipfs\/(.+)$/);
    if (m) return m[1];
    const sub = u.hostname.match(/^([a-z0-9]{46,})\.ipfs\./i);
    if (sub) return `${sub[1]}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    // Not a URL at all; nothing to rewrite.
  }
  return null;
}

/** Every concrete URL worth trying for one logo URL, in order. */
export function expandLogoUrl(url: string): string[] {
  const path = ipfsPath(url);
  if (!path) return [url];
  const out = IPFS_GATEWAYS.map((g) => g + path);
  if (url.startsWith("https://") && !out.includes(url)) out.splice(1, 0, url);
  return out;
}

/** Only public https hosts: metadata URLs are written by strangers. */
function isFetchable(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname;
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[")) return false;
    return true;
  } catch {
    return false;
  }
}

async function json(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 86_400 },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/**
 * Where a mint's logo may live, best source first: the CDN copy Helius keeps
 * of the on-chain metadata image, then the icon Jupiter lists, then the one on
 * DexScreener, then the raw metadata image. Each lookup failing only removes
 * its own candidates.
 */
export async function logoCandidates(mint: string): Promise<string[]> {
  const [helius, jup, dex] = await Promise.allSettled([
    json(serverRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "icon", method: "getAsset", params: { id: mint } }),
    }),
    json(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`),
    json(`https://api.dexscreener.com/tokens/v1/solana/${mint}`),
  ]);

  const first: string[] = [];
  const later: string[] = [];

  if (helius.status === "fulfilled") {
    const r = (helius.value as { result?: { content?: { files?: { uri?: string; cdn_uri?: string; mime?: string }[]; links?: { image?: string } } } })?.result;
    for (const f of r?.content?.files ?? []) {
      if (f.cdn_uri) first.push(f.cdn_uri);
    }
    if (r?.content?.links?.image) later.push(r.content.links.image);
    for (const f of r?.content?.files ?? []) {
      if (f.uri && (!f.mime || f.mime.startsWith("image/"))) later.push(f.uri);
    }
  }
  if (jup.status === "fulfilled" && Array.isArray(jup.value)) {
    const t = (jup.value as { id?: string; icon?: string }[]).find((x) => x.id === mint);
    if (t?.icon) first.push(t.icon);
  }
  if (dex.status === "fulfilled" && Array.isArray(dex.value)) {
    for (const p of dex.value as { baseToken?: { address?: string }; info?: { imageUrl?: string } }[]) {
      if (p.baseToken?.address === mint && p.info?.imageUrl) {
        first.push(p.info.imageUrl);
        break;
      }
    }
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...first, ...later].flatMap(expandLogoUrl)) {
    if (!seen.has(u) && isFetchable(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

const MAX_BYTES = 2_500_000;

function sniff(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  const head = new TextDecoder().decode(b.slice(0, 256)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  return null;
}

/** Follows at most three redirects, checking each hop is still a public host. */
async function fetchImage(url: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    if (!isFetchable(current)) return null;
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: { Accept: "image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5", "User-Agent": "FolioIcon/1.0" },
        cache: "no-store",
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      current = new URL(loc, current).toString();
      continue;
    }
    if (!res.ok || !res.body) return null;
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
    const type = sniff(buf);
    return type ? { bytes: buf, type } : null;
  }
  return null;
}

/** The first candidate that answers with a real image. */
export async function resolveLogo(mint: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  const candidates = (await logoCandidates(mint)).slice(0, 9);
  // Three at a time: a dead gateway costs one timeout, not one per URL, and
  // the earlier (better) sources still win when they answer.
  for (let i = 0; i < candidates.length; i += 3) {
    try {
      return await Promise.any(
        candidates.slice(i, i + 3).map(async (url) => {
          const hit = await fetchImage(url);
          if (!hit) throw new Error("miss");
          return hit;
        })
      );
    } catch {
      // Every URL in this group failed; try the next group.
    }
  }
  return null;
}
