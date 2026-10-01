"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Magnetic } from "./motion/Magnetic";
import { markConnectIntent } from "@/lib/wallet-intent";
import { dur, ease } from "@/lib/motion";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function ConnectButton({ size = "md" }: { size?: "sm" | "md" }) {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = useCallback(() => {
    if (publicKey) return;
    markConnectIntent();
    setVisible(true);
  }, [publicKey, setVisible]);

  // In the header on a phone, the wallet buttons shrink to icons: next to the
  // logo, the CA and two round buttons, there is no room for words below
  // 640 px. The hero right under the header keeps the full-size button.
  const compact = size === "sm";
  const pad = compact ? "text-[13px] h-8 w-8 px-0 py-0 sm:w-auto sm:px-3.5" : "";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {publicKey ? (
        <motion.div
          key="connected"
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: dur.short, ease: ease.settle }}
        >
          <span className="font-mono text-sm pl-2.5 pr-3 py-1.5 rounded-full border hairline hidden sm:flex items-center gap-2 bg-[color-mix(in_srgb,var(--paper-card)_60%,transparent)]">
            <span className="live-dot" aria-hidden="true" />
            {shortAddr(publicKey.toBase58())}
          </span>
          <button
            className={`btn btn-ghost text-sm ${compact ? "h-8 w-8 px-0 py-0 sm:w-auto sm:px-3.5" : "px-3.5 py-1.5"}`}
            onClick={() => disconnect()}
            aria-label="Disconnect wallet"
          >
            {compact && <ExitGlyph className="sm:hidden" />}
            <span className={compact ? "hidden sm:inline" : ""}>Disconnect</span>
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="disconnected"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: dur.short, ease: ease.settle }}
        >
          <Magnetic>
            <button
              className={`btn btn-primary btn-shine ${pad}`}
              onClick={handleClick}
              disabled={connecting}
              aria-label={connecting ? "Connecting wallet" : "Connect wallet"}
            >
              <WalletGlyph />
              <span className={compact ? "hidden sm:inline" : ""}>
                {connecting ? "Connecting…" : "Connect wallet"}
              </span>
            </button>
          </Magnetic>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ExitGlyph({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M6.5 2.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 5 13.5 8l-3 3M13.5 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 8.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.5 3.5 10 1.8a1 1 0 0 1 1.2.7l.3 1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
