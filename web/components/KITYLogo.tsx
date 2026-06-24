"use client";

import { motion, useReducedMotion } from "framer-motion";

// Each ball rolls in from a short diagonal — stays within the clipped hero bounds
const BALLS = [
  { letter: "K", fromX: -60, fromY: 50, rotate: -180, delay: 0.00, color: "violet" },
  { letter: "I", fromX: -30, fromY: 60, rotate:  120, delay: 0.11, color: "indigo" },
  { letter: "T", fromX:  30, fromY: 55, rotate: -120, delay: 0.20, color: "violet" },
  { letter: "Y", fromX:  60, fromY: 48, rotate:  160, delay: 0.30, color: "amber"  },
] as const;

const GRAD = {
  violet: {
    fill:   "radial-gradient(circle at 35% 28%, rgba(160,120,255,1) 0%, rgba(80,40,200,1) 75%)",
    glow:   "0 0 32px rgba(124,92,255,0.85), 0 0 72px rgba(124,92,255,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
    border: "rgba(160,120,255,0.9)",
    text:   "#fff",
  },
  indigo: {
    fill:   "radial-gradient(circle at 35% 28%, rgba(120,140,255,1) 0%, rgba(50,60,200,1) 75%)",
    glow:   "0 0 32px rgba(99,102,241,0.85), 0 0 72px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
    border: "rgba(120,140,255,0.9)",
    text:   "#fff",
  },
  amber: {
    fill:   "radial-gradient(circle at 35% 28%, rgba(252,210,60,1) 0%, rgba(180,90,5,1) 80%)",
    glow:   "0 0 32px rgba(245,158,11,0.9), 0 0 72px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
    border: "rgba(252,210,60,0.95)",
    text:   "#1a0a00",
  },
} as const;

interface Props {
  size?: number; // px diameter of each ball
  className?: string;
  gap?: number;
}

export function KITYLogo({ size = 88, className = "", gap = 12 }: Props) {
  const reduced = useReducedMotion();

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap }}
      aria-label="KITY"
    >
      {BALLS.map((b, i) => {
        const g = GRAD[b.color];
        const fontSize = Math.round(size * 0.36);
        const shine = { w: Math.round(size * 0.22), h: Math.round(size * 0.13) };

        return (
          <motion.div
            key={b.letter}
            // ── Entry: rolls in from offscreen ──────────────────────────────
            initial={
              reduced
                ? { opacity: 0, scale: 0.6 }
                : { opacity: 0, x: b.fromX, y: b.fromY, rotate: b.rotate, scale: 0.55 }
            }
            animate={
              reduced
                ? { opacity: 1, scale: 1 }
                : { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }
            }
            transition={
              reduced
                ? { duration: 0.4, delay: b.delay }
                : {
                    duration: 0.7,
                    delay: b.delay,
                    ease: [0.16, 1, 0.3, 1],        // expo-out: fast roll, clean land
                    opacity: { duration: 0.18, delay: b.delay },
                  }
            }
            className="relative grid place-items-center select-none"
            style={{
              width: size,
              height: size,
              borderRadius: "50%",                   // explicit — no Tailwind conflict
              background: g.fill,
              boxShadow: g.glow,
              border: `2px solid ${g.border}`,
              fontSize,
              fontWeight: 900,
              fontFamily: "inherit",
              color: g.text,
              letterSpacing: "-0.01em",
              willChange: "transform",
              flexShrink: 0,
            }}
          >
            {/* Shine highlight */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                top: Math.round(size * 0.08),
                left: Math.round(size * 0.11),
                width: shine.w,
                height: shine.h,
                background: "rgba(255,255,255,0.42)",
                filter: "blur(2px)",
              }}
            />
            {/* Idle float — staggered per ball */}
            <motion.span
              className="relative z-10"
              animate={reduced ? {} : { y: [0, -6, 0] }}
              transition={{
                duration: 2.4 + i * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.9 + b.delay + i * 0.18,
              }}
            >
              {b.letter}
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}
