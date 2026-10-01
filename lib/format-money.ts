// Display formatting for market figures on the front desk.

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export function usdCompact(n: number | undefined): string {
  return n === undefined ? "—" : compactUsd.format(n);
}

/** Prices of a hundredth of a cent and below keep four significant digits. */
export function usdPrice(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function utcTime(iso: string): string {
  return `${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

export function signedPct(n: number, digits = 1): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
