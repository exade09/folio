"use client";

import { useCallback, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { consumeConnectIntent } from "@/lib/wallet-intent";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);

  // Runs whenever a wallet becomes selected. Returning true makes the provider
  // call a full connect(); false makes it try a silent reconnect only. See
  // lib/wallet-intent.ts for why both are needed.
  const autoConnect = useCallback(async () => consumeConnectIntent(), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* No explicit adapter list: any Wallet Standard wallet (Phantom,
          Solflare, Backpack, ...) registers itself and shows up here. */}
      <WalletProvider wallets={[]} autoConnect={autoConnect}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
