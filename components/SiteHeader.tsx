"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ConnectButton } from "./ConnectButton";
import { SoundToggle } from "./SoundToggle";
import { CaChip } from "./CaChip";
import { XLink } from "./XLink";
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
      {/* From md up, three columns so the nav stays centred however wide the
          CA gets. Below that the nav is hidden, and a hidden grid item takes
          no cell — the row becomes a plain space-between flex instead. */}
      <div className="w-full h-14 px-4 sm:px-5 flex justify-between md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="group flex items-center gap-2 shrink-0" aria-label="Folio, home">
            <motion.img
              src="/brand/folio-mark.webp"
              alt=""
              width={30}
              height={30}
              className="w-[30px] h-[30px] select-none"
              draggable={false}
              initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
              animate={ready ? { scale: 1, opacity: 1, rotate: 0 } : undefined}
              whileHover={{ rotate: [0, -8, 6, 0], transition: { duration: 0.5 } }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.15 }}
            />
            <span className="font-display text-base tracking-tight hidden sm:flex overflow-hidden" aria-hidden="true">
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
          <motion.div
            className="min-w-0"
            initial={{ opacity: 0, x: -8 }}
            animate={ready ? { opacity: 1, x: 0 } : undefined}
            transition={{ delay: 0.45, duration: dur.base, ease: ease.settle }}
          >
            <CaChip />
          </motion.div>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[var(--ink-mute)]">
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
          <Link
            href="/docs"
            className={`nav-link transition-colors hover:text-[var(--foreground)] ${pathname?.startsWith("/docs") ? "text-[var(--foreground)]" : ""}`}
          >
            Docs
          </Link>
        </nav>

        <div className="flex items-center justify-end gap-2 md:col-start-3 shrink-0">
          {/* The centre nav is hidden on a phone; Docs stays one tap away. */}
          <Link
            href="/docs"
            className="md:hidden text-[13px] font-semibold text-[var(--ink-mute)] hover:text-[var(--foreground)] px-1"
          >
            Docs
          </Link>
          <XLink />
          <SoundToggle />
          <ConnectButton size="sm" />
        </div>
      </div>
    </motion.header>
  );
}
