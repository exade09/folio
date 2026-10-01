// Set once, the first time the app finishes hydrating. Components that mount
// after this point were not in the server HTML, so they are free to start from
// an "empty" visual state (a counter at zero, a bar at nothing) without
// mismatching markup React is trying to hydrate. Components mounting during
// hydration must render exactly what the server did, and animate from there.
let hydrated = false;

export function markHydrated() {
  hydrated = true;
}

export function isHydrated() {
  return hydrated;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
