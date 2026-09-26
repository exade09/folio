"use client";

import { useEffect, useState } from "react";

export type MascotMood = "idle" | "thinking" | "answering" | "refusing" | "error" | "filed";

const MOOD_LABEL: Record<MascotMood, string> = {
  idle: "Waiting",
  thinking: "Reading the file",
  answering: "Answering",
  refusing: "Declining",
  error: "Stuck",
  filed: "Filed",
};

export function moodLabel(mood: MascotMood) {
  return MOOD_LABEL[mood];
}

// Real art lives in /public/mascot/<mood>.png — drop the six files in and
// this picks them up automatically. Checked via a plain Image() preload
// (not the rendered <img>'s own onError) because a missing SSR'd image
// errors before React hydrates and attaches a listener, so that event is
// otherwise missed. Until a mood's file exists, a plain placeholder renders
// instead of pretending to be the real character.
function assetFor(mood: MascotMood) {
  return `/mascot/${mood}.png`;
}

const checked = new Map<string, boolean>();

function useImageExists(src: string): boolean | null {
  const [exists, setExists] = useState<boolean | null>(checked.get(src) ?? null);

  useEffect(() => {
    let cancelled = false;

    if (checked.has(src)) {
      void Promise.resolve().then(() => {
        if (!cancelled) setExists(checked.get(src)!);
      });
      return () => {
        cancelled = true;
      };
    }

    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      checked.set(src, true);
      setExists(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      checked.set(src, false);
      setExists(false);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return exists;
}

export function MascotImage({
  mood = "idle",
  size = 220,
  className = "",
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
}) {
  const src = assetFor(mood);
  const exists = useImageExists(src);

  return (
    <div
      className={`mascot-frame mascot-anim-${mood} ${className}`}
      style={{ width: size, height: size }}
    >
      {exists ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Folio's analyst, currently ${moodLabel(mood).toLowerCase()}`}
          width={size}
          height={size}
          className="w-full h-full object-contain rounded-3xl"
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full rounded-3xl flex flex-col items-center justify-center gap-1 border-2 border-dashed"
          style={{ borderColor: "var(--hairline-strong)", background: "var(--wall-blue-soft)" }}
        >
          <span className="text-3xl" aria-hidden="true">
            🐾
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--ink-mute)] text-center px-2">
            {mood}.png missing
          </span>
        </div>
      )}
    </div>
  );
}
