import { formatUnits, parseUnits, type Address } from "viem";
import { TOKEN_DECIMALS } from "./contracts";

/** Format a 6-decimal token amount for display, e.g. "10.00". */
export function formatToken(
  amount: bigint | undefined | null,
  decimals = TOKEN_DECIMALS,
): string {
  if (amount === undefined || amount === null) return "0";
  const s = formatUnits(amount, decimals);
  // Trim to at most 4 fractional digits, drop trailing zeros for tidiness.
  const [whole, frac = ""] = s.split(".");
  if (!frac) return whole;
  const trimmed = frac.slice(0, 4).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/** Parse a human string like "10" into a 6-decimal bigint. Throws on bad input. */
export function parseToken(value: string, decimals = TOKEN_DECIMALS): bigint {
  const v = (value ?? "").trim();
  if (!v) return 0n;
  return parseUnits(v, decimals);
}

/** Shorten an address to 0x1234…abcd. */
export function shortAddress(addr?: string | null): string {
  if (!addr) return "";
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function isZeroAddress(addr?: string | null): boolean {
  return (
    !addr || addr.toLowerCase() === "0x0000000000000000000000000000000000000000"
  );
}

export function sameAddress(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export const STATE_LABELS: Record<number, string> = {
  0: "Recruiting",
  1: "Starting",
  2: "Active",
  3: "Completed",
  4: "Cancelled",
};

export function stateLabel(state: number | bigint | undefined): string {
  if (state === undefined) return "Unknown";
  return STATE_LABELS[Number(state)] ?? "Unknown";
}

export type CircleState = 0 | 1 | 2 | 3 | 4;

export const FEE_DENOMINATOR = 10000n;

/** Format basis points as a percentage string, e.g. 100 -> "1%". */
export function bpsToPercent(bps: number | bigint | undefined): string {
  if (bps === undefined) return "0%";
  const n = Number(bps) / 100;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}%`;
}

export function explorerAddressUrl(chainId: number, addr: Address): string {
  const base =
    chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";
  return `${base}/address/${addr}`;
}
