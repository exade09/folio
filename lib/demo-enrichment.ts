import { seededRandom, pick, range, utcDayKey } from "./prng";
import type { PositionFacts } from "./types";

// Everything in this file is simulated. Nothing here reads a real indexer.
// It exists so the product's shape — one file per position, every line
// sourced — can be felt end to end before Helius / Birdeye keys are wired
// in. Swap `buildDemoFacts` for a real lookup once those keys exist; the
// `CaseFile` shape and the "confidence" tag on every fact stay the same, so
// nothing downstream (the file view, the ask endpoint, the briefing) has to
// change when a field goes from demo to live.

const LIQUIDITY_VENUES = ["Raydium CLMM", "Meteora DBC", "pump.fun bonding curve", "Orca Whirlpool"] as const;
const FEE_VENUES = ["pump.fun creator fee", "Meteora fee split", "Raydium LP fee share"] as const;
const SOCIAL_STATUS = ["active", "quiet", "silent"] as const;

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function fakeAddressFrom(rnd: () => number): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 44; i++) out += alphabet[Math.floor(rnd() * alphabet.length)];
  return out;
}

export function buildDemoFacts(mint: string): PositionFacts {
  const rnd = seededRandom(mint);

  const days = Math.floor(range(rnd, 1, 420));
  const filedOn = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const holderCount = Math.floor(range(rnd, 40, 18000));
  const top10Pct = Math.round(range(rnd, 8, 78) * 10) / 10;
  const top1Pct = Math.round(Math.min(top10Pct * 0.6, range(rnd, 2, 40)) * 10) / 10;

  const venue = pick(rnd, LIQUIDITY_VENUES);
  const lockedPct = Math.round(range(rnd, 0, 100));
  const canLeave = lockedPct < 85 && rnd() > 0.35;
  const poolAddressShort = shortAddr(fakeAddressFrom(rnd));

  const feeVenue = pick(rnd, FEE_VENUES);
  const collectorFull = fakeAddressFrom(rnd);
  const unclaimedSol = Math.round(range(rnd, 0, 240) * 100) / 100;
  const splitNote =
    feeVenue === "pump.fun creator fee"
      ? "0.30% on the bonding curve, tiering down after graduation"
      : "split is set at pool creation and reads directly off the position";

  const status = pick(rnd, SOCIAL_STATUS);
  const lastActivityDays = Math.floor(range(rnd, 0, 60));
  const lastActivity =
    lastActivityDays === 0 ? "today" : `${lastActivityDays} day${lastActivityDays === 1 ? "" : "s"} ago`;
  const hasTwitter = rnd() > 0.25;
  const hasTelegram = rnd() > 0.4;
  const hasWebsite = rnd() > 0.55;

  return {
    contractAge: {
      value: { days, filedOn },
      source: "mint account creation slot (simulated)",
      confidence: "demo",
    },
    holderConcentration: {
      value: { holderCount, top10Pct, top1Pct },
      source: "token account snapshot (simulated)",
      confidence: "demo",
    },
    liquidity: {
      value: { venue, lockedPct, canLeave, poolAddressShort },
      source: `${venue} pool state (simulated)`,
      confidence: "demo",
    },
    creatorFee: {
      value: {
        venue: feeVenue,
        collectorShort: shortAddr(collectorFull),
        collectorFull,
        unclaimedSol,
        splitNote,
      },
      source: `${feeVenue} vault (simulated)`,
      confidence: "demo",
    },
    socials: {
      value: {
        lastActivity,
        status,
        handles: {
          twitter: hasTwitter ? "x.com/(handle redacted in demo)" : undefined,
          telegram: hasTelegram ? "t.me/(handle redacted in demo)" : undefined,
          website: hasWebsite ? "(site redacted in demo)" : undefined,
        },
      },
      source: "social listener (simulated)",
      confidence: "demo",
    },
  };
}

export function buildOvernightChangePct(mint: string): number {
  const rnd = seededRandom(`${mint}:${utcDayKey()}`);
  const magnitude = range(rnd, 0, 38);
  const sign = rnd() > 0.5 ? 1 : -1;
  return Math.round(magnitude * sign * 10) / 10;
}
