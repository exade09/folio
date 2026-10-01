"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ConnectButton } from "./ConnectButton";
import { useIntroReady } from "./motion/Intro";
import { dur, ease } from "@/lib/motion";

const WORD = "Folio";

export function SiteHeader() {
  const ready = useIntroReady();
  const pathname = usePathname();

  return (
    <motion.header
      className="relative z-20 border-b hairline backdrop-blur-[6px] bg-[color-mix(in_srgb,var(--wall-blue-soft)_62%,transparent)]"
      initial={{ y: -56, opacity: 0 }}
      animate={ready ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: dur.long, ease: ease.glide, delay: 0.05 }}
    >
      <div className="w-full h-14 px-5 flex items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2 shrink-0" aria-label="Folio, home">
          <FolderGlyph />
          <span className="font-display text-base tracking-tight flex overflow-hidden" aria-hidden="true">
            {WORD.split("").map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: "110%" }}
                animate={ready ? { y: "0%" } : undefined}
                transition={{ delay: 0.25 + i * 0.045, duration: dur.base, ease: ease.glide }}
              >
                {ch}
              </motion.span>
            ))}
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-7 text-sm font-semibold text-[var(--ink-mute)]">
          <Link
            href="/"
            className={`nav-link transition-colors hover:text-[var(--foreground)] ${pathname === "/" ? "text-[var(--foreground)]" : ""}`}
          >
            Desk
          </Link>
          <Link
            href="/briefing"
            className={`nav-link transition-colors hover:text-[var(--foreground)] ${pathname?.startsWith("/briefing") ? "text-[var(--foreground)]" : ""}`}
          >
            This morning
          </Link>
        </nav>

        <ConnectButton size="sm" />
      </div>
    </motion.header>
  );
}

/** A folder whose front flap lifts when the wordmark is hovered. */
function FolderGlyph() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M1.5 3.5a2 2 0 0 1 2-2h4.2l2 2h8.8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-11Z"
        fill="var(--manila-deep)"
        stroke="var(--ink)"
        strokeWidth="1.3"
      />
      <path
        d="M1.5 7h19v7.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V7Z"
        fill="var(--manila)"
        stroke="var(--ink)"
        strokeWidth="1.3"
        className="origin-bottom transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover:[transform:skewX(-8deg)_scaleY(0.82)]"
      />
    </svg>
  );
}
