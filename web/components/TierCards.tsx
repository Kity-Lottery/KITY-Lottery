"use client";

import { motion } from "framer-motion";

/**
 * TierCards — the three stake tiers. Only Starter ($2) is live; Pro and Whale
 * are "coming soon". Each tier has its own ticket price, draw cadence, and
 * top-jackpot headline number.
 */
export type Tier = {
  name: string;
  price: string;
  draw: string;
  mega: string;
  blurb: string;
  live: boolean;
  accent: string; // rgb
  icon: string;
};

export const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$2",
    draw: "Every 24h",
    mega: "Rolling jackpot",
    blurb: "The live game. Low stakes, a daily draw that fires even with one ticket in.",
    live: true,
    accent: "124,92,255",
    icon: "🎟️",
  },
  {
    name: "Pro",
    price: "$20",
    draw: "Every 12h",
    mega: "$100,000",
    blurb: "Bigger stakes, twice-daily draws, a six-figure rolling jackpot.",
    live: false,
    accent: "0,212,255",
    icon: "⚡",
  },
  {
    name: "Whale",
    price: "$200",
    draw: "Every 6h",
    mega: "$1,000,000",
    blurb: "High-roller territory — fast draws into a seven-figure rolling jackpot.",
    live: false,
    accent: "245,158,11",
    icon: "💎",
  },
];

export function TierCards({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${className}`}>
      {TIERS.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="spotlight sheen relative flex flex-col p-6"
          style={{ borderColor: t.live ? `rgba(${t.accent},0.4)` : undefined }}
        >
          {/* status chip */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-3xl">{t.icon}</span>
            {t.live ? (
              <span className="pill !px-2.5 !py-1 text-[10px]">
                <span className="pill-dot" />
                Live
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-300/50">
                Coming soon
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="stat-num text-4xl font-black" style={{ color: `rgb(${t.accent})` }}>
              {t.price}
            </span>
            <span className="text-xs text-indigo-300/40">/ ticket</span>
          </div>
          <div className="mt-1 text-base font-bold text-indigo-50">{t.name}</div>
          <p className="mt-2 text-sm leading-relaxed text-indigo-300/55">{t.blurb}</p>

          <div className="mt-5 space-y-1.5 border-t border-white/5 pt-4 text-xs">
            <div className="flex justify-between">
              <span className="text-indigo-300/45">Draw cadence</span>
              <span className="font-semibold text-indigo-100">{t.draw}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-300/45">Top jackpot</span>
              <span className="font-semibold" style={{ color: `rgb(${t.accent})` }}>{t.mega}</span>
            </div>
          </div>

          {!t.live && (
            <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[#050816]/20" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
