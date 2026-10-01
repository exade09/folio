"use client";

import { useCallback, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { consumeConnectIntent } from "@/lib/wallet-intent";
import { notInstalledWallets } from "@/lib/wallets";
import { WalletPickerProvider } from "@/components/WalletPicker";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);

  // Runs whenever a wallet becomes selected. Returning true makes the provider
  // call a full connect(); false makes it try a silent reconnect only. See
  // lib/wallet-intent.ts for why both are needed.
  const autoConnect = useCallback(async () => consumeConnectIntent(), []);

  // Solflare's adapter connects with or without the extension (its web
  // wallet). Phantom and Backpack are stand-ins until installed; an
  // installed wallet registers itself by name and replaces its stand-in.
  // Every other Wallet Standard wallet still shows up on its own.
  const wallets = useMemo(() => [new SolflareWalletAdapter(), ...notInstalledWallets()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        <WalletPickerProvider>{children}</WalletPickerProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
