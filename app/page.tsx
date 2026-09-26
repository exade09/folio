"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Hero } from "@/components/Hero";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <div>
      {publicKey ? <Dashboard /> : <Hero />}

      <footer className="border-t hairline mt-4">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-mute)]">
          <span>Folio is not affiliated with any exchange, wallet, or token it reports on.</span>
          <span className="font-mono">Solana mainnet-beta</span>
        </div>
      </footer>
    </div>
  );
}
