"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { CaseFile } from "@/lib/types";
import { WalletWidget } from "./WalletWidget";
import { AgentPanel } from "./AgentPanel";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function Dashboard() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

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

  const selectedCase = useMemo(
    () => cases?.find((c) => c.caseNo === selectedCaseNo) ?? null,
    [cases, selectedCaseNo]
  );

  if (!wallet) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
        <WalletWidget
          walletShort={shortAddr(wallet)}
          cases={cases}
          loading={loading}
          error={error}
          selectedCaseNo={selectedCaseNo}
          onSelect={setSelectedCaseNo}
          onRescan={() => scan(wallet)}
        />
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)]">
          <AgentPanel selectedCase={selectedCase} />
        </div>
      </div>
    </div>
  );
}
