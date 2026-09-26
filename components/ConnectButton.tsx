"use client";

import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = useCallback(() => {
    if (publicKey) return;
    setVisible(true);
  }, [publicKey, setVisible]);

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm px-3 py-1.5 rounded-full border hairline">
          {shortAddr(publicKey.toBase58())}
        </span>
        <button className="btn btn-ghost text-sm" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn-primary" onClick={handleClick} disabled={connecting}>
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
