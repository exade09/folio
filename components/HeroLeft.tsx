"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ConnectButton } from "./ConnectButton";
import { TweetCard } from "./TweetCard";
import { SpecimenFile } from "./SpecimenFile";
import { FeaturedDesk } from "./FeaturedDesk";
import type { FeaturedDesk as Desk } from "@/lib/featured";
import { useIntroReady } from "./motion/Intro";
import { SplitReveal } from "./motion/SplitReveal";
import { Reveal } from "./motion/Reveal";
import { Stamp } from "./motion/Stamp";
import { TiltCard } from "./motion/TiltCard";
import { dur, ease } from "@/lib/motion";

export function HeroLeft({ desk }: { desk: Desk | null }) {
  const ready = useIntroReady();

  return (
    <div className="px-6 md:px-10 py-10 md:py-14 max-w-2xl">
      <div className="mb-7 h-7 flex items-center">
        <Stamp tone="brass" size="sm" rotate={-2} play={ready} delay={0.15}>
          An analyst, not an oracle
        </Stamp>
      </div>

      <SplitReveal
        as="h1"
        text="Connect a wallet. He opens a file on every position in it."
        play={ready}
        delay={0.2}
        className="font-display text-4xl md:text-[3.4rem] leading-[1.04] tracking-[-0.02em]"
      />

      <motion.p
        className="mt-6 text-lg text-[var(--ink-soft)] leading-relaxed max-w-xl"
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        animate={ready ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
        transition={{ delay: 0.75, duration: dur.long, ease: ease.settle }}
      >
        Contract age. Holder concentration. Where the liquidity sits and whether it can leave. Who
        collects the creator fee. What the socials have been doing. Every line carries the source
        you can open.
      </motion.p>

      <motion.div
        className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={ready ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: 0.95, duration: dur.base, ease: ease.settle }}
      >
        <ConnectButton />
        <Link
          href="/briefing"
          className="group text-sm font-semibold text-[var(--ink-soft)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1.5"
        >
          See this morning&apos;s page
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </motion.div>

      <motion.div
        className="mt-14"
        initial={{ opacity: 0, y: 30, rotate: -1.5 }}
        animate={ready ? { opacity: 1, y: 0, rotate: 0 } : undefined}
        transition={{ delay: 1.15, duration: dur.cinematic, ease: ease.glide }}
      >
        {/* Live files when the market sources answered; the invented specimen
            only when they didn't, so the pitch never shows an empty desk. */}
        {desk ? <FeaturedDesk desk={desk} play={ready} /> : <SpecimenFile play={ready} />}
      </motion.div>

      <Reveal className="mt-14">
        <TiltCard className="max-w-md">
          <TweetCard />
        </TiltCard>
      </Reveal>

      <Reveal className="mt-10">
        <RealVsDemo />
      </Reveal>

      <Reveal className="mt-10">
        <p className="text-sm text-[var(--ink-mute)]">
          Folio is not affiliated with any exchange, wallet, or token it reports on.
        </p>
      </Reveal>
    </div>
  );
}

function RealVsDemo() {
  return (
    <TiltCard max={4}>
      <div className="panel p-7">
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <InViewStamp tone="brass">Demo</InViewStamp>
          <InViewStamp tone="green" delay={0.18}>
            Live
          </InViewStamp>
          <h2 className="font-display text-xl ml-1">What&apos;s real today</h2>
        </div>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          The token list and the balances are read live off the connected wallet, and token names come
          from Jupiter&apos;s public token list where they&apos;re listed there. The five facts inside each
          file — contract age, holder concentration, liquidity, creator fee, socials — are simulated for
          now: Folio doesn&apos;t have a paid Helius or Birdeye connection wired in yet. Every fact says
          which it is, in the file and in the source line under it.
        </p>
      </div>
    </TiltCard>
  );
}

function InViewStamp({
  children,
  tone,
  delay = 0,
}: {
  children: React.ReactNode;
  tone: "brass" | "green";
  delay?: number;
}) {
  return (
    <motion.span
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 1 }}
      variants={{
        hidden: { scale: 2.2, rotate: -18, opacity: 0 },
        shown: {
          scale: 1,
          rotate: -3,
          opacity: 1,
          transition: { type: "spring", stiffness: 700, damping: 18, mass: 0.7, delay },
        },
      }}
      className={`stamp-ink stamp-ink-sm`}
      style={{ color: tone === "brass" ? "var(--brass)" : "var(--lamp-green)" }}
    >
      {children}
    </motion.span>
  );
}
