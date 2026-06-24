"use client";

import { motion } from "framer-motion";
import { ODDS, formatOneIn } from "@/lib/odds";

/**
 * PrizeMatchGuide — shows which match patterns win which prize tier in the
 * positional Pick-4 game. Four position dots (+ a Kitti star) make the win
 * condition legible at a glance: match all 4 in position + Kitti → Jackpot, etc.
 * Each row also prints the exact odds — the friendly ranges make them reachable.
 */
type Pattern = {
  hits: boolean[]; // length 4 — which positions must match
  kitti: boolean;
  prize: string;
  pct: string;
  note: string;
  odds: number;
  accent: string; // rgb
};

const PATTERNS: Pattern[] = [
  { hits: [true, true, true, true], kitti: true, prize: "Jackpot", pct: "50%", note: "All 4 digits in position + your KITY letter", odds: ODDS.jackpot, accent: "124,92,255" },
  { hits: [true, true, true, true], kitti: false, prize: "2nd Prize", pct: "15%", note: "All 4 digits in position", odds: ODDS.second, accent: "0,212,255" },
  { hits: [true, true, true, false], kitti: false, prize: "3rd Prize", pct: "10%", note: "Any 3 digits in position", odds: ODDS.third, accent: "16,185,129" },
];

function Dot({ on, accent }: { on: boolean; accent: string }) {
  return (
    <span
      className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-black"
      style={
        on
          ? { background: `rgba(${accent},0.9)`, color: "#fff", boxShadow: `0 0 8px rgba(${accent},0.6)` }
          : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.1)" }
      }
    >
      {on ? "●" : "○"}
    </span>
  );
}

export function PrizeMatchGuide() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold text-indigo-100">How you win</div>
        <div className="text-[10px] uppercase tracking-widest text-indigo-300/40">match by position</div>
      </div>

      <div className="space-y-2.5">
        {PATTERNS.map((p, i) => (
          <motion.div
            key={p.prize}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
          >
            <div className="flex items-center gap-1.5">
              {p.hits.map((h, j) => (
                <Dot key={j} on={h} accent={p.accent} />
              ))}
              {p.kitti && (
                <span
                  className="ml-1 grid h-5 w-5 place-items-center rounded-full text-[10px]"
                  style={{ background: "rgba(245,158,11,0.9)", color: "#1a0a00", boxShadow: "0 0 8px rgba(245,158,11,0.6)" }}
                >
                  ★
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 sm:pl-2">
              <div>
                <span className="text-sm font-bold text-indigo-50">{p.prize}</span>
                <span className="ml-2 text-xs text-indigo-300/45">{p.note}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-semibold tabular-nums" style={{ color: `rgb(${p.accent})` }}>
                {formatOneIn(p.odds)}
                <span className="ml-1.5 font-normal text-indigo-300/35">odds</span>
              </div>
            </div>
            <span className="stat-num shrink-0 text-base font-black text-indigo-100/80">
              {p.pct}
              <span className="block text-[9px] font-normal uppercase tracking-wider text-indigo-300/35">of pool</span>
            </span>
          </motion.div>
        ))}
      </div>

      <div className="space-y-2 border-t border-white/5 pt-3 text-xs text-indigo-300/55">
        <div className="flex items-start gap-2">
          <span>🍀</span>
          <span><span className="font-semibold text-indigo-200">Lucky Wallet (10%)</span> — one random ticket every round always pays, even with zero matches.</span>
        </div>
        <div className="flex items-start gap-2">
          <span>🔁</span>
          <span><span className="font-semibold text-indigo-200">Rollover (10%)</span> — every round seeds the next draw, and any unwon prize rolls in too. The jackpot grows until someone wins.</span>
        </div>
        <div className="flex items-start gap-2">
          <span>⚡</span>
          <span><span className="font-semibold text-emerald-300">Claim &amp; withdraw</span> — the Lucky Wallet prize is auto-credited; for Jackpot / 2nd / 3rd, claim your winning ticket, then hit Withdraw to receive your USDC any time.</span>
        </div>
      </div>
    </div>
  );
}
