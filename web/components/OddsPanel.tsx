"use client";

import { motion } from "framer-motion";
import {
  ODDS,
  TIERS,
  oneInForTickets,
  formatOneIn,
  formatPct,
  chanceForTickets,
} from "@/lib/odds";

/**
 * OddsMeter — prize-card grid showing what each tier pays and at what odds.
 * Cards are dim until the slip is complete, then glow to confirm the locked-in
 * numbers. Lucky Wallet is always guaranteed; shown as a footer note.
 */
export function OddsMeter({ complete }: { complete: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-100">Odds per ticket</span>
        <motion.span
          animate={{ opacity: complete ? 1 : 0.45 }}
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: complete ? "rgb(16,185,129)" : "rgba(165,148,255,0.5)" }}
        >
          {complete ? "✓ locked in" : "complete your slip"}
        </motion.span>
      </div>

      {/* Prize tier cards */}
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t) => (
          <motion.div
            key={t.key}
            animate={{ opacity: complete ? 1 : 0.32 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-3 text-center"
            style={{
              background: complete
                ? `radial-gradient(circle at 50% 0%, rgba(${t.accent},0.15) 0%, transparent 70%)`
                : "rgba(255,255,255,0.02)",
              border: `1px solid rgba(${t.accent},${complete ? 0.35 : 0.1})`,
              boxShadow: complete ? `0 0 18px rgba(${t.accent},0.12)` : "none",
            }}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider mt-1"
              style={{ color: `rgba(${t.accent},${complete ? 0.85 : 0.4})` }}
            >
              {t.shortLabel}
            </span>
            <span className="text-[11px] font-black text-white tabular-nums leading-tight mt-0.5">
              {complete
                ? t.key === "third"
                  ? "1 in 278"
                  : t.key === "second"
                  ? "1 in 10k"
                  : "1 in 40k"
                : "—"}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Lucky wallet note */}
      <div className="flex items-center gap-2 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/15 px-3 py-2">
        <span className="text-sm">🍀</span>
        <span className="text-[10px] leading-snug text-indigo-300/45">
          <span className="text-fuchsia-300/70 font-semibold">Lucky Wallet</span> — one random ticket wins 10% of the pool every draw, guaranteed.
        </span>
      </div>
    </div>
  );
}

/**
 * OddsBoost — compact two-stat row used inside the cart footer.
 * Shows any-prize and jackpot combined odds for the current cart size,
 * plus two one-tap smart-pick boost buttons.
 */
export function OddsBoost({
  tickets,
  onSmartPick,
}: {
  tickets: number;
  onSmartPick: (n: number) => void;
}) {
  const n = Math.max(1, tickets);
  const anyPrize = oneInForTickets(ODDS.third, n);
  const jackpot  = oneInForTickets(ODDS.jackpot, n);
  const anyPct   = formatPct(chanceForTickets(ODDS.third, n));

  return (
    <div className="space-y-2.5">
      {/* Two-stat pill */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-emerald-300/50 font-semibold mb-0.5">
            Any prize
          </div>
          <div className="text-sm font-black text-emerald-300 tabular-nums leading-none">
            {formatOneIn(anyPrize)}
          </div>
          <div className="text-[9px] text-emerald-300/40 mt-0.5">{anyPct} chance</div>
        </div>
        <div className="h-8 w-px bg-white/8" />
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-widest text-violet-300/50 font-semibold mb-0.5">
            Jackpot
          </div>
          <div className="text-sm font-black text-violet-300 tabular-nums leading-none">
            {formatOneIn(jackpot)}
          </div>
        </div>
      </div>

      {/* Boost buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSmartPick(5)}
          className="btn btn-ghost text-[11px]"
        >
          ✨ +5 smart picks
        </button>
        <button
          type="button"
          onClick={() => onSmartPick(10)}
          className="btn btn-ghost text-[11px]"
        >
          ⚡ +10 tickets
        </button>
      </div>
    </div>
  );
}
