// Every duration, curve and spring the site moves with lives here, so motion
// is tuned in one place instead of drifting apart across forty components.
//
// The house style: things settle, they do not bounce. Paper is set down, a
// drawer slides shut, a stamp lands once. Springs are critically damped or
// close to it; the only overshoot anywhere is the stamp, on purpose.

type Bezier = [number, number, number, number];

export const ease = {
  /** The default. Fast start, long soft landing — a card set down on a desk. */
  settle: [0.22, 1, 0.36, 1] as Bezier,
  /** Harder deceleration for large travel (the intro cover, pane swaps). */
  glide: [0.16, 1, 0.3, 1] as Bezier,
  /** Symmetric, for loops and things that come back where they started. */
  sway: [0.65, 0, 0.35, 1] as Bezier,
  /** Leaves quickly and without ceremony. */
  exit: [0.4, 0, 1, 1] as Bezier,
} as const;

export const dur = {
  micro: 0.18,
  short: 0.32,
  base: 0.5,
  long: 0.8,
  cinematic: 1.15,
} as const;

export const spring = {
  /** Layout moves and highlights sliding between rows. */
  layout: { type: "spring", stiffness: 380, damping: 36, mass: 0.9 },
  /** Cursor-follow: soft enough to feel like weight, quick enough not to lag. */
  follow: { type: "spring", stiffness: 140, damping: 22, mass: 0.6 },
  /** Magnetic buttons. A little looser, so the pull reads. */
  magnet: { type: "spring", stiffness: 220, damping: 15, mass: 0.35 },
  /** A rubber stamp hitting paper. The one deliberate overshoot. */
  stamp: { type: "spring", stiffness: 700, damping: 18, mass: 0.7 },
} as const;

/** Delay between siblings in a staggered group. */
export const stagger = {
  tight: 0.035,
  base: 0.06,
  loose: 0.1,
} as const;

/** Rise-and-settle, the most common entrance on the site. */
export const riseIn = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: dur.base, ease: ease.settle },
  },
};
