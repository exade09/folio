import { X_HANDLE, X_URL } from "@/lib/site";

/**
 * Link to Folio's X account. A heavy typeset "X" — not X's trademarked logo
 * artwork, and not a thin cross, which in a header reads as "close" — plus the
 * handle on wide screens, so it is plainly an account link. Drop the official
 * mark from X's brand kit in here if you want the exact logo.
 */
export function XLink() {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Folio on X (${X_HANDLE})`}
      title={X_HANDLE}
      className="h-8 min-w-8 px-2.5 rounded-full border hairline flex items-center justify-center gap-1.5 text-[var(--ink)] hover:text-[var(--paper-card)] hover:bg-[var(--ink)] hover:border-[var(--ink)] transition-colors shrink-0"
    >
      <span className="text-[15px] leading-none font-extrabold tracking-tight" style={{ fontFamily: "var(--font-body)" }} aria-hidden="true">
        X
      </span>
      <span className="hidden xl:inline font-mono text-[11px]" aria-hidden="true">
        {X_HANDLE}
      </span>
    </a>
  );
}
