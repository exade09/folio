export type Confidence = "live" | "demo";

export interface SourcedFact<T> {
  value: T;
  source: string;
  confidence: Confidence;
}

export interface PositionFacts {
  contractAge: SourcedFact<{ days: number; filedOn: string }>;
  holderConcentration: SourcedFact<{ holderCount: number; top10Pct: number; top1Pct: number }>;
  liquidity: SourcedFact<{
    venue: string;
    lockedPct: number;
    canLeave: boolean;
    poolAddressShort: string;
  }>;
  creatorFee: SourcedFact<{
    venue: string;
    collectorShort: string;
    collectorFull: string;
    unclaimedSol: number;
    splitNote: string;
  }>;
  socials: SourcedFact<{
    lastActivity: string;
    status: "active" | "quiet" | "silent";
    handles: { twitter?: string; telegram?: string; website?: string };
  }>;
}

export interface CaseFile {
  caseNo: string;
  filedAt: string;
  wallet: string;
  mint: string;
  symbol: string;
  name: string;
  logoUri?: string;
  balanceUi: number;
  decimals: number;
  metadataSource: Confidence;
  overnightChangePct: number;
  facts: PositionFacts;
}

export interface WalletCaseIndexEntry {
  mint: string;
  latestCaseNo: string;
  history: string[];
}
