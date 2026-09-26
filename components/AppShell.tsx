"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { CaseFile } from "@/lib/types";
import { WalletWidget } from "./WalletWidget";
import { AgentPanel } from "./AgentPanel";
import { HeroLeft } from "./HeroLeft";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AppShell() {
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

  return (
    <div className="lg:flex lg:items-stretch">
      <div className="lg:w-1/2 lg:min-w-0 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto">
        {wallet ? (
          <div className="px-6 md:px-10 py-8">
            <WalletWidget
              walletShort={shortAddr(wallet)}
              cases={cases}
              loading={loading}
              error={error}
              selectedCaseNo={selectedCaseNo}
              onSelect={setSelectedCaseNo}
              onRescan={() => scan(wallet)}
            />
          </div>
        ) : (
          <HeroLeft />
        )}
      </div>

      <div className="lg:w-1/2 lg:h-[calc(100dvh-3.5rem)] border-t lg:border-t-0 lg:border-l hairline">
        <AgentPanel selectedCase={selectedCase} />
      </div>
    </div>
  );
}
