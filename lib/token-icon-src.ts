// Client-safe half of the token logo code: which src a page should use.
// The fetching half lives in token-icon.ts and only runs on the server.

/** Logos kept in the repo for tokens that must never fall back to initials. */
export const LOCAL_ICONS: Record<string, string> = {
  // PUMP, pump.fun's own token: the official logo, the one Jupiter lists.
  pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn: "/tokens/pump.webp",
};

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function isMintLike(value: string): boolean {
  return MINT_RE.test(value);
}

/** The src a page should use for a token's logo: ours, never a stranger's host. */
export function tokenIconSrc(mint: string): string {
  return LOCAL_ICONS[mint] ?? `/api/token-icon/${mint}`;
}
