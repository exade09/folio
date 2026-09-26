import type { CaseFile, Confidence } from "./types";

export interface FactLine {
  label: string;
  headline: string;
  detail: string;
  source: string;
  confidence: Confidence;
}

export function factLines(c: CaseFile): FactLine[] {
  const { contractAge, holderConcentration, liquidity, creatorFee, socials } = c.facts;

  return [
    {
      label: "Contract age",
      headline: `${contractAge.value.days} days old`,
      detail: `Filed on ${contractAge.value.filedOn}.`,
      source: contractAge.source,
      confidence: contractAge.confidence,
    },
    {
      label: "Holder concentration",
      headline: `${holderConcentration.value.holderCount.toLocaleString()} holders`,
      detail: `Top 10 hold ${holderConcentration.value.top10Pct}%. Top 1 holds ${holderConcentration.value.top1Pct}%.`,
      source: holderConcentration.source,
      confidence: holderConcentration.confidence,
    },
    {
      label: "Liquidity",
      headline: liquidity.value.venue,
      detail: `${liquidity.value.lockedPct}% locked. ${
        liquidity.value.canLeave ? "It can leave." : "It cannot leave."
      } Pool ${liquidity.value.poolAddressShort}.`,
      source: liquidity.source,
      confidence: liquidity.confidence,
    },
    {
      label: "Creator fee",
      headline: creatorFee.value.venue,
      detail: `Collector ${creatorFee.value.collectorShort}. ${creatorFee.value.unclaimedSol} SOL unclaimed. ${creatorFee.value.splitNote}.`,
      source: creatorFee.source,
      confidence: creatorFee.confidence,
    },
    {
      label: "Socials",
      headline:
        socials.value.status === "silent"
          ? "Silent"
          : socials.value.status === "quiet"
            ? "Quiet"
            : "Active",
      detail: `Last activity ${socials.value.lastActivity}. ${describeHandles(socials.value.handles)}`,
      source: socials.source,
      confidence: socials.confidence,
    },
  ];
}

function describeHandles(handles: { twitter?: string; telegram?: string; website?: string }) {
  const present = [handles.twitter && "X", handles.telegram && "Telegram", handles.website && "a website"].filter(
    Boolean
  );
  if (present.length === 0) return "No handles found.";
  return `Has ${present.join(", ")}.`;
}
