"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { FEATURED_WALLETS, INSTALL_URL, isHiddenWallet, isMobileBrowser, openInWalletApp } from "@/lib/wallets";
import { markConnectIntent } from "@/lib/wallet-intent";
import { dur, ease, spring } from "@/lib/motion";
import { play } from "@/lib/sound";

// Folio's own wallet picker, in place of the adapter library's modal: it
// decides which wallets are offered (Phantom, Solflare, Backpack first;
// MetaMask not at all), says plainly whether each is ready, and does the
// right thing for one that is not — install it on a computer, open Folio in
// the wallet's app on a phone.

const PickerContext = createContext<{ open: () => void } | null>(null);

export function useWalletPicker() {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("useWalletPicker must be used inside WalletPickerProvider");
  return ctx;
}

export function WalletPickerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <PickerContext.Provider value={value}>
      {children}
      <AnimatePresence>{visible && <PickerDialog key="picker" onClose={() => setVisible(false)} />}</AnimatePresence>
    </PickerContext.Provider>
  );
}

type Status = "ready" | "web" | "install" | "app";

function statusOf(w: Wallet, mobile: boolean): Status {
  const s = w.readyState;
  if (s === WalletReadyState.Installed) return "ready";
  if (s === WalletReadyState.Loadable) return "web";
  return mobile && openInWalletApp(w.adapter.name) ? "app" : "install";
}

const STATUS_LABEL: Record<Status, string> = {
  ready: "Detected",
  web: "Web wallet",
  install: "Install",
  app: "Open in app",
};

function PickerDialog({ onClose }: { onClose: () => void }) {
  const { wallets, wallet: selected, select, connect } = useWallet();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => setMobile(isMobileBrowser()));
  }, []);

  const list = useMemo(() => {
    const visible = wallets.filter((w) => !isHiddenWallet(w.adapter.name));
    const rank = (w: Wallet) => {
      const i = (FEATURED_WALLETS as readonly string[]).indexOf(w.adapter.name);
      return i === -1 ? 10 : i;
    };
    const ready = (w: Wallet) => (w.readyState === WalletReadyState.Installed ? 0 : 1);
    return [...visible].sort((a, b) => rank(a) - rank(b) || ready(a) - ready(b) || a.adapter.name.localeCompare(b.adapter.name));
  }, [wallets]);

  // Escape closes; the page behind does not scroll while the picker is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLButtonElement>("button[data-wallet]")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function choose(w: Wallet) {
    const status = statusOf(w, mobile);
    const name = w.adapter.name;
    play("tap");

    if (status === "install" || status === "app") {
      const href = status === "app" ? openInWalletApp(name) : INSTALL_URL[name] || w.adapter.url;
      if (href) {
        if (status === "app") window.location.assign(href);
        else window.open(href, "_blank", "noopener,noreferrer");
      }
      return;
    }

    onClose();
    if (selected?.adapter.name === name) {
      // Already the selected wallet (say, after a disconnect): selecting it
      // again changes nothing, so ask it to connect directly.
      connect().catch(() => {});
      return;
    }
    // Selecting a new wallet hands it to the provider, which runs a full
    // connect because of this intent (see lib/wallet-intent.ts).
    markConnectIntent();
    select(name as WalletName);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur.short }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(34,48,71,0.45)] backdrop-blur-[3px] cursor-default"
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-picker-title"
        className="panel folder-tab relative w-full sm:max-w-[400px] rounded-b-none sm:rounded-b-[20px] px-5 pt-5 pb-6"
        initial={{ y: 40, opacity: 0, rotate: -1 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        exit={{ y: 30, opacity: 0, transition: { duration: dur.short, ease: ease.exit } }}
        transition={spring.layout}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)]">Connect</div>
            <h2 id="wallet-picker-title" className="font-display text-2xl mt-1">
              Pick a wallet
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border hairline flex items-center justify-center text-[var(--ink-mute)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors"
            aria-label="Close wallet picker"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ul className="mt-5 space-y-2">
          {list.map((w, i) => {
            const status = statusOf(w, mobile);
            const ready = status === "ready" || status === "web";
            return (
              <motion.li
                key={w.adapter.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 + i * 0.05, duration: dur.short, ease: ease.settle }}
              >
                <button
                  type="button"
                  data-wallet={w.adapter.name}
                  onClick={() => choose(w)}
                  className="group w-full flex items-center gap-3 rounded-2xl border hairline px-3.5 py-3 text-left transition-[border-color,background,transform] hover:border-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--paper)_70%,transparent)] active:scale-[0.99]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.adapter.icon} alt="" width={32} height={32} className="w-8 h-8 rounded-[9px] shrink-0" />
                  <span className="font-bold flex-1">{w.adapter.name}</span>
                  <span
                    className={`text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full border ${ready ? "text-[var(--lamp-green)] border-[color-mix(in_srgb,var(--lamp-green)_45%,transparent)]" : "text-[var(--ink-mute)] border-[var(--hairline)]"}`}
                  >
                    {STATUS_LABEL[status]}
                    {!ready && " ↗"}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>

        <p className="mt-5 text-xs text-[var(--ink-mute)] leading-relaxed">
          Folio only reads your address. It never asks you to sign a transaction
        </p>
      </motion.div>
    </motion.div>
  );
}
