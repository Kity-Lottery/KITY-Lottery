"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const PRIZES = [
  { label: "Jackpot",       sub: "All 4 in position + KITY letter", pct: 50, grad: "from-violet-500 via-purple-400 to-violet-500", icon: "🏆" },
  { label: "2nd Prize",     sub: "All 4 in position",               pct: 15, grad: "from-sky-500 via-cyan-400 to-sky-500",         icon: "🥈" },
  { label: "3rd Prize",     sub: "Any 3 in position",               pct: 10, grad: "from-emerald-500 via-teal-400 to-emerald-500", icon: "🥉" },
  { label: "Lucky Wallet",  sub: "Always pays — random ticket",     pct: 10, grad: "from-amber-500 via-yellow-300 to-amber-500",   icon: "🍀" },
  { label: "Rollover",      sub: "Seeds the next draw",             pct: 10, grad: "from-rose-500 via-pink-400 to-rose-500",       icon: "🔁" },
];

export function PrizeBreakdown() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="space-y-3.5">
      <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50 mb-4">
        Prize Structure
      </div>

      {PRIZES.map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, x: -12 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5">
              <span>{p.icon}</span>
              <span className="font-semibold text-indigo-100">{p.label}</span>
              <span className="text-indigo-300/40 hidden sm:inline">— {p.sub}</span>
            </span>
            <span className="font-black text-white tabular-nums">{p.pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden bg-white/5">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${p.grad}`}
              initial={{ width: 0 }}
              animate={inView ? { width: `${p.pct}%` } : { width: 0 }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
              style={{
                boxShadow: `0 0 8px rgba(124,92,255,0.3)`,
              }}
            />
          </div>
        </motion.div>
      ))}

      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.7 }}
        className="text-xs text-indigo-300/40 pt-2 border-t border-white/5"
      >
        No jackpot winner → rolls to the next round (bigger prize) · Winnings are credited on-chain — one-click Withdraw, any time
      </motion.p>
    </div>
  );
}
