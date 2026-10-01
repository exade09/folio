"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { CaseFile } from "@/lib/types";
import { dur, ease } from "@/lib/motion";
import { WalletWidget } from "./WalletWidget";
import { AgentPanel } from "./AgentPanel";
import { HeroLeft } from "./HeroLeft";
import { useIntroReady } from "./motion/Intro";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AppShell() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const ready = useIntroReady();
  const leftRef = useRef<HTMLDivElement | null>(null);

  const [cases, setCases] = useState<CaseFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseNo, setSelectedCaseNo] = useState<string | null>(null);

  const scan = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not open files for that wallet.");
        setCases(null);
      } else {
        setCases(data.cases);
      }
    } catch {
      setError("The scan didn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (wallet) {
        scan(wallet);
      } else {
        setCases(null);
        setSelectedCaseNo(null);
      }
    });
  }, [wallet, scan]);

  // Swapping the pitch for the case index starts the reader at the top of the
  // new content, not wherever they had scrolled the pitch to.
  useEffect(() => {
    leftRef.current?.scrollTo({ top: 0 });
  }, [wallet]);

  const selectedCase = useMemo(
    () => cases?.find((c) => c.caseNo === selectedCaseNo) ?? null,
    [cases, selectedCaseNo]
  );

  return (
    <div className="lg:flex lg:items-stretch">
      <div
        ref={leftRef}
        className="lg:w-1/2 lg:min-w-0 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto overflow-x-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          {wallet ? (
            <motion.div
              key="index"
              className="px-6 md:px-10 py-8"
              initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -30, filter: "blur(6px)" }}
              transition={{ duration: dur.long, ease: ease.glide }}
            >
              <WalletWidget
                walletShort={shortAddr(wallet)}
                cases={cases}
                loading={loading}
                error={error}
                selectedCaseNo={selectedCaseNo}
                onSelect={setSelectedCaseNo}
                onRescan={() => scan(wallet)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="pitch"
              initial={{ opacity: 0, x: -30, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -40, filter: "blur(8px)" }}
              transition={{ duration: dur.long, ease: ease.glide }}
            >
              <HeroLeft />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="lg:w-1/2 lg:h-[calc(100dvh-3.5rem)] border-t lg:border-t-0 lg:border-l hairline relative"
        initial={{ opacity: 0, x: 60 }}
        animate={ready ? { opacity: 1, x: 0 } : undefined}
        transition={{ duration: dur.cinematic, ease: ease.glide, delay: 0.35 }}
      >
        <AgentPanel selectedCase={selectedCase} />
      </motion.div>
    </div>
  );
}
