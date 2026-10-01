"use client";

export type MascotMood = "idle" | "thinking" | "answering" | "refusing" | "error" | "filed";

const MOODS: MascotMood[] = ["idle", "thinking", "answering", "refusing", "error", "filed"];

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

/**
 * The clerk. Art lives in /public/mascot/<mood>.webp: square, transparent,
 * with the body cut by the bottom edge on purpose, so the frame he sits in can
 * put a desk along that edge.
 *
 * Where his mood changes (the analyst panel), all six poses are mounted at
 * once and only the current one is visible, so a mood change cross-fades
 * between pictures that are already decoded instead of blinking while the
 * next one loads. Where he never changes (an avatar), pass `still` and only
 * the one picture is fetched.
 */
export function MascotImage({
  mood = "idle",
  size = 220,
  still = false,
  className = "",
}: {
  mood?: MascotMood;
  size?: number;
  still?: boolean;
  className?: string;
}) {
  const shown = still ? [mood] : MOODS;
  return (
    <div
      className={`mascot-frame mascot-anim-${mood} relative ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Folio's analyst, currently ${moodLabel(mood).toLowerCase()}`}
    >
      {shown.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={m}
          src={`/mascot/${m}.webp`}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          draggable={false}
          decoding="async"
          loading={m === mood ? "eager" : "lazy"}
          className="absolute inset-0 w-full h-full object-contain select-none transition-opacity duration-200 ease-out"
          style={{ opacity: m === mood ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
