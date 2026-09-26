"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* No explicit adapter list: any Wallet Standard wallet (Phantom,
          Solflare, Backpack, ...) registers itself and shows up here. */}
      <WalletProvider wallets={[]} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
