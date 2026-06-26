// ------------------------------------------------------------
// RoundCarousel – a swipeable, minimalist carousel for round cards
// ------------------------------------------------------------
"use client";

import { motion, useAnimation } from "framer-motion";
import { useRef, useEffect } from "react";
import { RoundCard } from "./RoundCard";

type Props = {
  settledCount: number;
  viewRoundId: bigint | null;
  setViewOffset: (fn: (prev: number) => number) => void;
  address?: string;
};

export function RoundCarousel({
  settledCount,
  viewRoundId,
  setViewOffset,
  address,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Compute how many cards to show – 3 on desktop, 2 on mobile
  const cardsToShow = window.innerWidth > 640 ? 3 : 2;
  const startIdx = Math.max(settledCount - 1 - cardsToShow - 0, 0);
  const roundIds = Array.from({ length: cardsToShow }, (_, i) => {
    const idx = settledCount - 1 - startIdx - i;
    return idx >= 0 ? BigInt(idx) : null;
  }).filter(Boolean) as bigint[];

  // Drag handler – when drag ends, decide whether to move left/right
  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 80) {
      // drag right → show newer rounds
      setViewOffset((o) => Math.max(o - 1, 0));
    } else if (info.offset.x < -80) {
      // drag left → show older rounds
      setViewOffset((o) => Math.min(o + 1, settledCount - 1));
    }
  };

  // Sync animation when viewOffset changes (optional “snap” effect)
  useEffect(() => {
    controls.start({ x: 0 });
  }, [settledCount, setViewOffset, controls]);

  return (
    <div className="relative py-4">
      {/* Progress badge */}
      <div className="absolute top-2 right-2 text-xs text-indigo-300/60">
        Round {viewRoundId?.toString() ?? "—"} / {settledCount - 1}
      </div>

      <motion.div
        ref={containerRef}
        className="flex gap-4 overflow-x-hidden cursor-grab"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
        animate={controls}
      >
        {roundIds.map((id) => (
          <div key={id.toString()} className="min-w-[300px]">
            <RoundCard roundId={id} userAddress={address} />
          </div>
        ))}
      </motion.div>

      {/* Optional subtle scroll hint */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
    </div>
  );
}
