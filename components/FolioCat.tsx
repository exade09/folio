"use client";

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

function Face({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "thinking":
      return (
        <g>
          <ellipse cx="82" cy="86" rx="5" ry="7" fill="var(--ink)" />
          <ellipse cx="118" cy="84" rx="5" ry="7" fill="var(--ink)" />
          <path d="M76 72 q6 -6 13 -2" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M111 70 q6 -5 13 -1" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M94 103 q6 4 12 0" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case "answering":
      return (
        <g>
          <circle cx="83" cy="86" r="6.5" fill="var(--ink)" />
          <circle cx="117" cy="86" r="6.5" fill="var(--ink)" />
          <circle cx="85.5" cy="83.5" r="1.6" fill="var(--paper)" />
          <circle cx="119.5" cy="83.5" r="1.6" fill="var(--paper)" />
          <path d="M92 101 q8 7 16 0" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case "refusing":
      return (
        <g>
          <path d="M76 82 h13" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
          <path d="M111 82 h13" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
          <path d="M75 70 l13 4" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M124 70 l-13 4" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M93 103 h14" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case "error":
      return (
        <g>
          <path d="M77 80 l11 11 M88 80 l-11 11" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M112 80 l11 11 M123 80 l-11 11" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M92 104 q8 -6 16 0" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case "filed":
      return (
        <g>
          <path d="M76 86 q7 -9 14 0" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M110 86 q7 -9 14 0" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M92 100 q8 8 16 0" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="83" cy="86" r="5.5" fill="var(--ink)" className="folio-cat-blink" />
          <circle cx="117" cy="86" r="5.5" fill="var(--ink)" className="folio-cat-blink" />
          <path d="M93 101 q7 5 14 0" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
  }
}

function Prop({ mood }: { mood: MascotMood }) {
  if (mood === "thinking") {
    return (
      <g className="folio-cat-thought">
        <circle cx="156" cy="46" r="4" fill="var(--paper-card)" stroke="var(--hairline-strong)" />
        <circle cx="168" cy="34" r="5.5" fill="var(--paper-card)" stroke="var(--hairline-strong)" />
        <circle cx="184" cy="20" r="8" fill="var(--paper-card)" stroke="var(--hairline-strong)" />
        <text x="184" y="24" textAnchor="middle" fontSize="11" fill="var(--ink-mute)" className="font-mono">
          ?
        </text>
      </g>
    );
  }
  if (mood === "answering") {
    return (
      <g transform="translate(150 118) rotate(-8)">
        <rect x="0" y="0" width="34" height="26" rx="3" fill="var(--paper-card)" stroke="var(--hairline-strong)" />
        <line x1="6" y1="8" x2="28" y2="8" stroke="var(--ink-mute)" strokeWidth="1.6" />
        <line x1="6" y1="14" x2="24" y2="14" stroke="var(--ink-mute)" strokeWidth="1.6" />
        <line x1="6" y1="20" x2="20" y2="20" stroke="var(--ink-mute)" strokeWidth="1.6" />
      </g>
    );
  }
  if (mood === "refusing") {
    return (
      <g transform="translate(148 108)">
        <circle cx="16" cy="16" r="16" fill="none" stroke="var(--tag-red)" strokeWidth="3.5" />
        <line x1="6" y1="26" x2="26" y2="6" stroke="var(--tag-red)" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    );
  }
  if (mood === "error") {
    return (
      <g transform="translate(158 96)">
        <path d="M10 0 L20 0 L18 22 L12 22 Z" fill="var(--tag-red)" />
        <circle cx="15" cy="30" r="4" fill="var(--tag-red)" />
      </g>
    );
  }
  if (mood === "filed") {
    return (
      <g transform="translate(140 96) rotate(-10)" className="stamp-in">
        <rect x="0" y="0" width="58" height="30" rx="4" fill="none" stroke="var(--tag-red)" strokeWidth="3" />
        <text
          x="29"
          y="20"
          textAnchor="middle"
          fontSize="12"
          fontWeight={700}
          fill="var(--tag-red)"
          className="font-mono track-wide"
        >
          FILED
        </text>
      </g>
    );
  }
  return null;
}

export function FolioCat({
  mood = "idle",
  size = 220,
  className = "",
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={`folio-cat folio-cat-${mood} ${className}`}
      role="img"
      aria-label={`Folio's analyst, currently ${moodLabel(mood).toLowerCase()}`}
    >
      <ellipse cx="102" cy="204" rx="52" ry="9" fill="var(--ink)" opacity="0.08" />

      <g className="folio-cat-tail">
        <path
          d="M148 168 Q182 160 178 128 Q176 108 156 108"
          stroke="var(--paper)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M148 168 Q182 160 178 128 Q176 108 156 108"
          stroke="var(--hairline-strong)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
          opacity="0.12"
        />
      </g>

      <g className="folio-cat-body">
        <path
          d="M56 202 Q50 140 62 118 Q78 100 102 100 Q126 100 142 118 Q154 140 148 202 Z"
          fill="var(--paper)"
        />
        <path
          d="M56 202 Q50 140 62 118 Q78 100 102 100 Q126 100 142 118 Q154 140 148 202 Z"
          fill="url(#folio-cat-shade)"
          opacity="0.5"
        />

        <path d="M92 122 L112 122 L104 176 L100 176 Z" fill="var(--ink)" />
        <circle cx="102" cy="120" r="5" fill="var(--ink)" />

        <ellipse cx="72" cy="182" rx="11" ry="8" fill="var(--paper)" stroke="var(--hairline-strong)" />
        <ellipse cx="132" cy="182" rx="11" ry="8" fill="var(--paper)" stroke="var(--hairline-strong)" />
      </g>

      <g className="folio-cat-head" style={{ transformOrigin: "102px 88px" }}>
        <path d="M62 58 L82 44 L86 68 Z" fill="var(--paper)" stroke="var(--hairline-strong)" strokeWidth="1.5" />
        <path d="M142 58 L122 44 L118 68 Z" fill="var(--paper)" stroke="var(--hairline-strong)" strokeWidth="1.5" />
        <path d="M67 56 L80 48 L82 62 Z" fill="var(--tag-red)" opacity="0.55" />
        <path d="M137 56 L124 48 L122 62 Z" fill="var(--tag-red)" opacity="0.55" />

        <circle cx="102" cy="88" r="46" fill="var(--paper)" />
        <circle cx="102" cy="88" r="46" fill="url(#folio-cat-shade)" opacity="0.35" />

        <Face mood={mood} />

        <path d="M96 94 q6 3 12 0" stroke="var(--ink-mute)" strokeWidth="1.6" fill="none" opacity="0.4" />
        <line x1="60" y1="92" x2="80" y2="90" stroke="var(--ink-mute)" strokeWidth="1.2" opacity="0.5" />
        <line x1="60" y1="98" x2="80" y2="98" stroke="var(--ink-mute)" strokeWidth="1.2" opacity="0.4" />
        <line x1="124" y1="90" x2="144" y2="92" stroke="var(--ink-mute)" strokeWidth="1.2" opacity="0.5" />
        <line x1="124" y1="98" x2="144" y2="98" stroke="var(--ink-mute)" strokeWidth="1.2" opacity="0.4" />
      </g>

      <Prop mood={mood} />

      <defs>
        <linearGradient id="folio-cat-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cabinet-blue)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--cabinet-blue)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
