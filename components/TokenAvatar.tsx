"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tokenIconSrc } from "@/lib/token-icon-src";

function hueFrom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * A token's logo. With a mint it asks our own origin first (a logo kept in
 * the repo, or /api/token-icon, which fetches and caches it server-side), and
 * only then the raw metadata URL. If every source fails it falls back to the
 * ticker's initials on a colour drawn from the ticker.
 */
export function TokenAvatar({
  symbol,
  mint,
  logoUri,
  size = 36,
}: {
  symbol: string;
  mint?: string;
  logoUri?: string;
  size?: number;
}) {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (mint) list.push(tokenIconSrc(mint));
    if (logoUri && /^https?:\/\//.test(logoUri) && !list.includes(logoUri)) list.push(logoUri);
    return list;
  }, [mint, logoUri]);

  const [attempt, setAttempt] = useState({ key: "", index: 0 });
  const key = sources.join("|");
  const index = attempt.key === key ? attempt.index : 0;
  const src = sources[index];
  const imgRef = useRef<HTMLImageElement | null>(null);

  const next = () => setAttempt({ key, index: index + 1 });

  // An <img> in server-rendered HTML can fail before React hydrates and
  // attaches onError, and that event is then never seen. After mount, check
  // whether it already gave up.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      void Promise.resolve().then(() => setAttempt({ key, index: index + 1 }));
    }
  }, [key, index]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        ref={imgRef}
        src={src}
        alt=""
        width={size}
        height={size}
        decoding="async"
        onError={next}
        className="rounded-full object-cover shrink-0 bg-[var(--paper-card)]"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  const hue = hueFrom(symbol || "?");
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-mono font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${hue} 45% 88%)`,
        color: `hsl(${hue} 45% 28%)`,
      }}
      aria-hidden="true"
    >
      {(symbol || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}
