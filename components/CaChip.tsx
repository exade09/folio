"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CONTRACT_ADDRESS } from "@/lib/site";
import { play } from "@/lib/sound";
import { dur, ease } from "@/lib/motion";

/**
 * "CA: <address>" in the header. One click copies the full address — the only
 * thing anyone reads a contract address in a header to do — and the chip says
 * so for a moment. The address is shown whole on wide screens and shortened
 * to its first and last four characters elsewhere; the copy is always the
 * full address.
 */
export function CaChip() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!CONTRACT_ADDRESS) return null;
  const short = `${CONTRACT_ADDRESS.slice(0, 4)}…${CONTRACT_ADDRESS.slice(-4)}`;

  async function copy() {
    const ok = await writeClipboard(CONTRACT_ADDRESS);
    if (!ok) return;
    play("tap");
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy contract address ${CONTRACT_ADDRESS}`}
      aria-label={`Contract address ${CONTRACT_ADDRESS}. Click to copy.`}
      className="group relative h-8 rounded-full border hairline pl-3 pr-2.5 flex items-center gap-2 font-mono text-[11px] bg-[color-mix(in_srgb,var(--paper-card)_55%,transparent)] hover:border-[var(--foreground)] hover:bg-[var(--paper-card)] transition-colors min-w-0"
    >
      <span className="font-bold tracking-wide text-[var(--ink-soft)]">CA:</span>
      <span className="relative overflow-hidden h-4 min-w-0 block">
        {/* Holds the chip at the address's width, so swapping in "copied"
            doesn't shrink it and shove the rest of the header sideways. */}
        <span className="invisible block whitespace-nowrap" aria-hidden="true">
          <span className="hidden xl:inline">{CONTRACT_ADDRESS}</span>
          <span className="xl:hidden">{short}</span>
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "copied" : "address"}
            className="absolute inset-0 block whitespace-nowrap text-left"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: dur.micro, ease: ease.settle }}
          >
            {copied ? (
              <span className="text-[var(--lamp-green)] font-bold">copied</span>
            ) : (
              <>
                <span className="hidden xl:inline">{CONTRACT_ADDRESS}</span>
                <span className="xl:hidden">{short}</span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="shrink-0 text-[var(--ink-mute)] group-hover:text-[var(--foreground)] transition-colors" aria-hidden="true">
        {copied ? (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5 6.5 12 13 4.5" stroke="var(--lamp-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8.5" height="8.5" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 5V3.8A1.8 1.8 0 0 0 8.7 2H3.8A1.8 1.8 0 0 0 2 3.8v4.9a1.8 1.8 0 0 0 1.8 1.8H5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Contract address copied" : ""}
      </span>
    </button>
  );
}

/** Clipboard API where allowed; the old textarea trick where it isn't (non-secure contexts, older Safari). */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
