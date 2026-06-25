"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * RoundTimer — counts down live to the round's on-chain `endTime`. A round draws
 * at whichever comes first: its 24h timer, or 15 min after it fills to the
 * ticket cap (filling shortens `endTime` on-chain), so this countdown reflects
 * an early fill automatically. Pass `endTime` (unix seconds) from getRound().
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function RoundTimer({
  endTime,
  ticketCount,
  variant = "hero",
  className = "",
}: {
  endTime?: bigint; // unix seconds; the countdown target
  ticketCount?: bigint; // tickets in the round — a draw can only fire with >= 1
  variant?: "hero" | "compact";
  className?: string;
}) {
  // Tick the wall clock once mounted; SSR/first paint render the "--" state.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const targetMs = endTime !== undefined ? Number(endTime) * 1000 : null;
  const ms = now !== null && targetMs !== null ? Math.max(0, targetMs - now) : null;
  const ready = ms !== null;
  const due = ms !== null && ms <= 0;
  // A real draw is imminent only when an elapsed round actually has tickets. An
  // empty round past its timer is just waiting for the first buyer (the keeper
  // rolls its timer forward), so it must not claim to be "Drawing".
  const drawing = due && (ticketCount ?? 0n) > 0n;

  const safe = ms ?? 0;
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  const s = Math.floor((safe % 60_000) / 1000);
  // Rough time-window fill (assumes a 24h window; best-effort for the hero bar).
  const elapsedPct = ready ? Math.min(100, ((DAY_MS - safe) / DAY_MS) * 100) : 0;

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${className}`}
      >
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className={drawing ? "text-emerald-400" : "text-amber-400"}
        >
          ●
        </motion.span>
        {!ready
          ? "--:--:--"
          : drawing
          ? "Drawing…"
          : due
          ? "Awaiting tickets"
          : `${pad(h)}:${pad(m)}:${pad(s)}`}
        {ready && !due && <span className="text-indigo-300/40">to draw</span>}
      </span>
    );
  }

  return (
    <div className={`space-y-2.5 px-6 lg:px-24 ${className}`}>
      <div className="flex items-center justify-between text-xs text-indigo-300/50">
        <span className="uppercase tracking-[0.2em]">Next draw in</span>
        <span className="text-indigo-300/40">24h or when full</span>
      </div>

      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {[
          { v: h, l: "hrs" },
          { v: m, l: "min" },
          { v: s, l: "sec" },
        ].map((unit, i) => (
          <div key={unit.l} className="flex items-end gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <span
                className="stat-num text-3xl font-black tabular-nums text-white sm:text-4xl"
                style={{ textShadow: "0 0 24px rgba(124,92,255,0.35)" }}
              >
                {ready ? (due ? "00" : pad(unit.v)) : "--"}
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-widest text-indigo-300/40">
                {unit.l}
              </span>
            </div>
            {i < 2 && (
              <span className="pb-5 text-2xl font-black text-indigo-300/25">:</span>
            )}
          </div>
        ))}
      </div>

      {/* time-window progress */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-700/80">
        <motion.div
          className="h-full neon-bar"
          animate={{ width: `${elapsedPct}%` }}
          transition={{ duration: 0.4, ease: "linear" }}
        />
      </div>

      <div className="text-center text-xs text-indigo-300/35">
        Draws on the clock, or early when the round fills — even a single ticket plays.
      </div>
    </div>
  );
}
