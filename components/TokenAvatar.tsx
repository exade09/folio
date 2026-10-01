"use client";

import { useEffect, useRef, useState } from "react";

function hueFrom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function TokenAvatar({
  symbol,
  logoUri,
  size = 36,
}: {
  symbol: string;
  logoUri?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // An <img> in server-rendered HTML can fail before React hydrates and
  // attaches onError, and that event is then never seen — the visitor is left
  // with a broken-image glyph. After mount, check whether it already gave up.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      void Promise.resolve().then(() => setFailed(true));
    }
  }, [logoUri]);

  if (logoUri && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={logoUri}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="rounded-full object-cover shrink-0"
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
