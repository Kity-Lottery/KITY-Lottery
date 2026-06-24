"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface Props {
  n: number;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "main" | "kitti";
  label?: string;
  size?: "md" | "lg" | "xl";
}

export function LotteryBall({ n, selected, disabled, onClick, variant = "main", label, size = "md" }: Props) {
  const blocked = !!disabled && !selected;
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (selected) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 500);
      return () => clearTimeout(t);
    }
  }, [selected]);

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Ring burst on selection */}
      <AnimatePresence>
        {burst && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 2.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{
              width: size === "xl" ? 80 : size === "lg" ? 62 : 48,
              height: size === "xl" ? 80 : size === "lg" ? 62 : 48,
              border: `2px solid rgba(${variant === "kitti" ? "245,158,11" : "124,92,255"},0.9)`,
            }}
          />
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onClick}
        disabled={blocked}
        whileHover={!blocked ? { scale: 1.18, y: -3 } : undefined}
        whileTap={!blocked ? { scale: 0.8 } : undefined}
        animate={
          selected
            ? { scale: [1, 1.55, 0.88, 1.12, 1], y: [0, -10, 2, -3, 0] }
            : { scale: 1, y: 0 }
        }
        transition={
          selected
            ? { duration: 0.42, ease: [0.16, 1, 0.3, 1] }
            : { type: "spring", stiffness: 420, damping: 30 }
        }
        className={[
          "lottery-ball",
          variant === "kitti" ? "lottery-ball-kitti" : "lottery-ball-main",
          size === "xl" ? "lottery-ball-xl" : size === "lg" ? "lottery-ball-lg" : "",
          selected ? "selected" : "",
          blocked ? "opacity-20 cursor-not-allowed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label ?? n}
      </motion.button>
    </div>
  );
}
