"use client";

import { motion } from "framer-motion";
import { formatToken } from "@/lib/format";

const TICKET_PRICE = 2_000_000n;
const BPS = 10_000n;

const TIERS = [
  {
    label: "Jackpot",
    icon: "🏆",
    bps: 5_000n,
    odds: "1 in 40,000",
    accent: "124,92,255",
    note: "All 4 + KITY letter",
  },
  {
    label: "2nd Prize",
    icon: "🥈",
    bps: 1_500n,
    odds: "1 in 10,000",
    accent: "0,212,255",
    note: "All 4 in position",
  },
  {
    label: "3rd Prize",
    icon: "🥉",
    bps: 1_000n,
    odds: "1 in 278",
    accent: "16,185,129",
    note: "Any 3 in position",
  },
  {
    label: "Lucky Wallet",
    icon: "🍀",
    bps: 1_000n,
    odds: "guaranteed",
    accent: "245,158,11",
    note: "1 random ticket always wins",
  },
];

export function EstPrizePanel({
  ticketCount,
  nextRoundPool,
}: {
  ticketCount: bigint;
  nextRoundPool: bigint;
}) {
  const pool = ticketCount * TICKET_PRICE + nextRoundPool;
  const hasPool = pool > 0n;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">
          Prize Breakdown
        </span>
        {nextRoundPool > 0n && (
          <span className="text-[10px] text-violet-300/60 font-semibold">
            +${formatToken(nextRoundPool)} rolled in
          </span>
        )}
      </div>

      {TIERS.map((t, i) => {
        const estAmount = hasPool ? (pool * t.bps) / BPS : 0n;
        const isGuaranteed = t.odds === "guaranteed";
        return (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
            style={{
              background: `radial-gradient(ellipse at 0% 50%, rgba(${t.accent},0.06) 0%, transparent 70%)`,
              border: `1px solid rgba(${t.accent},0.14)`,
            }}
          >
            <span className="text-lg leading-none flex-shrink-0">{t.icon}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-indigo-100">{t.label}</span>
                <span className="text-[10px] text-indigo-300/35 truncate hidden sm:inline">
                  {t.note}
                </span>
              </div>
              <div
                className="text-[10px] font-semibold mt-0.5"
                style={{ color: isGuaranteed ? `rgba(${t.accent},0.8)` : "rgba(165,148,255,0.45)" }}
              >
                {isGuaranteed ? "✓ every round" : t.odds}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-sm font-black tabular-nums text-white">
                {hasPool ? `$${formatToken(estAmount)}` : "—"}
              </div>
              <div className="text-[9px] text-indigo-300/30 uppercase tracking-wide">
                {Number(t.bps) / 100}% of pool
              </div>
            </div>
          </motion.div>
        );
      })}

      <div className="flex items-center justify-between rounded-xl bg-white/[0.025] border border-white/6 px-3 py-2 mt-1">
        <div className="text-[10px] text-indigo-300/40 space-y-0.5">
          <div className="font-semibold text-indigo-300/55">Rollover (10%)</div>
          <div>Seeds every next draw. Un-won prizes roll in too — jackpot grows until taken.</div>
        </div>
        <span className="text-[10px] font-bold text-rose-400/60 ml-3 flex-shrink-0">
          {hasPool ? `$${formatToken((pool * 1_000n) / BPS)}` : "—"}
        </span>
      </div>
    </div>
  );
}
