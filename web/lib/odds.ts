// ── Positional Pick-4 odds model — KITY ─────────────────────────────────────
// Balls 1–4 each pick a digit 0–9; the KITY ball picks a letter K, I, T, or Y.
// Matching is positional, so every probability below is exact and printable
// right on the ticket. Friendlier ranges = the win feels reachable.
//
//   Jackpot  (all 4 in position + KITY) = 10^4 × 4 = 1 in 40,000
//   2nd      (all 4 in position)         = 10^4     = 1 in 10,000
//   3rd      (exactly 3 of 4)            = 1 / [C(4,3)·(1/10)^3·(9/10)] = 1 in 278

export const MAIN_SLOTS = 4;
export const MAIN_RANGE = 10; // digits 0–9
export const KITTI_LETTERS = ["K", "I", "T", "Y"] as const;
export const KITTI_RANGE = KITTI_LETTERS.length; // 4

export const ODDS = {
  jackpot: MAIN_RANGE ** MAIN_SLOTS * KITTI_RANGE, // 40,000
  second: MAIN_RANGE ** MAIN_SLOTS, // 10,000
  third: Math.round(
    1 / (MAIN_SLOTS * (1 / MAIN_RANGE) ** 3 * ((MAIN_RANGE - 1) / MAIN_RANGE)),
  ), // 278
} as const;

export type TierKey = keyof typeof ODDS;

// Ordered most-attainable → rarest, so the UI can lead with the reachable win.
export const TIERS: {
  key: TierKey;
  label: string;
  shortLabel: string;
  icon: string;
  match: string;
  accent: string; // rgb triplet
  weight: number; // visual "attainability" fill (0–1)
}[] = [
  { key: "third",   label: "3rd Prize", shortLabel: "3rd",     icon: "🥉", match: "any 3 balls in position",     accent: "16,185,129",  weight: 0.86 },
  { key: "second",  label: "2nd Prize", shortLabel: "2nd",     icon: "🥈", match: "all 4 balls in position",     accent: "0,212,255",   weight: 0.50 },
  { key: "jackpot", label: "Jackpot",   shortLabel: "Jackpot", icon: "🏆", match: "all 4 + your KITY letter",    accent: "124,92,255",  weight: 0.32 },
];

/** Map a stored Kitti index to its display letter (K / I / T). */
export function kittiLabel(i: number | null | undefined): string {
  if (i === null || i === undefined) return "–";
  return KITTI_LETTERS[i] ?? "?";
}

/** Effective 1-in-N for `tickets` distinct tickets at a tier (linear coverage). */
export function oneInForTickets(tierOdds: number, tickets: number): number {
  if (tickets <= 0) return tierOdds;
  return Math.max(1, Math.round(tierOdds / tickets));
}

/** Probability (0–1) of at least one win at a tier across `tickets` distinct tickets. */
export function chanceForTickets(tierOdds: number, tickets: number): number {
  if (tickets <= 0) return 0;
  return 1 - (1 - 1 / tierOdds) ** tickets;
}

export function formatOneIn(n: number): string {
  return `1 in ${Math.round(n).toLocaleString("en-US")}`;
}

export function formatPct(p: number): string {
  const pct = p * 100;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}

/**
 * Build `count` *distinct* random tickets (positional; repeats within a single
 * ticket are allowed, e.g. 2-2-2-2). Distinct tickets are what actually shorten
 * the odds — more coverage of the same fair draw, never "luckier" numbers.
 */
export function smartSpread(count: number): { main: number[]; kitti: number }[] {
  const seen = new Set<string>();
  const out: { main: number[]; kitti: number }[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 50) {
    guard++;
    const main = Array.from({ length: MAIN_SLOTS }, () =>
      Math.floor(Math.random() * MAIN_RANGE),
    );
    const kitti = Math.floor(Math.random() * KITTI_RANGE);
    const key = `${main.join("")}-${kitti}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ main, kitti });
  }
  return out;
}
