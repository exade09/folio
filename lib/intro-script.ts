// Kept outside the client component on purpose: a server component that
// imports a plain string from a "use client" module receives a client
// reference, not the string, and the root layout needs the real text to
// inline it into <head>.

export const INTRO_SEEN_KEY = "folio:intro";

/**
 * Runs before first paint. Marks the document when the intro should not
 * play — already seen this session, or the visitor asked for reduced motion —
 * so CSS can hide the cover before it is ever drawn.
 */
export const INTRO_PREPAINT_SCRIPT = `try{if(sessionStorage.getItem("${INTRO_SEEN_KEY}")==="seen"||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="skip"}}catch(e){document.documentElement.dataset.intro="skip"}`;
