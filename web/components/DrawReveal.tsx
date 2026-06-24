"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MAIN_RANGE, KITTI_RANGE, KITTI_LETTERS } from "@/lib/odds";

const MAIN_MAX  = MAIN_RANGE;
const KITTI_MAX = KITTI_RANGE;
const LOCK_GAP  = 750;   // ms between each ball locking
const SPIN_MS   = 1600;  // ms of spin before first lock
const INTRO_MS  = 2200;  // drumroll intro duration

type Phase = "idle" | "intro" | "spinning" | "done" | "lucky";

function randAddr() {
  return "0x" + Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

export function DrawReveal({ className = "" }: { className?: string }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [finals, setFinals]       = useState<number[]>([]);
  const [locked, setLocked]       = useState(0);
  const [spin, setSpin]           = useState<number[]>([0, 0, 0, 0, 0]);
  const [luckyWallet, setLuckyWallet] = useState("");
  const [dots, setDots]           = useState(".");

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dotsRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (dotsRef.current)      clearInterval(dotsRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    intervalRef.current = null;
    dotsRef.current = null;
  };

  const start = () => {
    cleanup();
    const f = [
      Math.floor(Math.random() * MAIN_MAX),
      Math.floor(Math.random() * MAIN_MAX),
      Math.floor(Math.random() * MAIN_MAX),
      Math.floor(Math.random() * MAIN_MAX),
      Math.floor(Math.random() * KITTI_MAX),
    ];
    setFinals(f);
    setLocked(0);
    setLuckyWallet(randAddr());
    setPhase("intro");

    // Animated dots during drumroll
    dotsRef.current = setInterval(() =>
      setDots((d) => (d.length >= 3 ? "." : d + ".")), 400
    );

    timeoutsRef.current.push(setTimeout(() => {
      if (dotsRef.current) clearInterval(dotsRef.current);
      setPhase("spinning");

      intervalRef.current = setInterval(() => {
        setSpin((prev) =>
          prev.map((_, i) => Math.floor(Math.random() * (i === 4 ? KITTI_MAX : MAIN_MAX)))
        );
      }, 55);

      for (let i = 0; i < 5; i++) {
        timeoutsRef.current.push(setTimeout(() => {
          setLocked(i + 1);
          if (i === 4) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPhase("done");
            timeoutsRef.current.push(setTimeout(() => setPhase("lucky"), 1400));
          }
        }, SPIN_MS + i * LOCK_GAP));
      }
    }, INTRO_MS));
  };

  const close = () => {
    cleanup();
    setPhase("idle");
  };

  useEffect(() => cleanup, []);

  const open = phase !== "idle";

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={className || "btn btn-ghost w-full text-xs"}
      >
        ▶ Watch a sample draw
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#020510]/95 px-6 backdrop-blur-2xl"
            onClick={phase === "lucky" ? close : undefined}
          >
            <motion.div
              initial={{ scale: 0.88, y: 28 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.55 }}
              className="w-full max-w-lg text-center"
              onClick={(e) => e.stopPropagation()}
            >

              {/* ── INTRO: drumroll ─────────────────────────────── */}
              <AnimatePresence mode="wait">
                {phase === "intro" && (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-6 py-8"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 0.45, repeat: Infinity }}
                      className="text-7xl"
                    >
                      🥁
                    </motion.div>
                    <div className="display display-md text-white">
                      Drawing{dots}
                    </div>
                    <div className="text-indigo-300/50 text-sm">
                      Pulling a public random beacon via Gelato VRF + Drand
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="h-2 w-2 rounded-full bg-violet-500"
                          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── SPINNING + LOCKING ───────────────────────── */}
                {(phase === "spinning" || phase === "done") && (
                  <motion.div
                    key="balls"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8 py-4"
                  >
                    <div>
                      <div className="eyebrow text-violet-400/70 mb-2">
                        {phase === "done" ? "Winning numbers" : "Drawing now…"}
                      </div>
                      <h3 className="display display-md text-white">
                        {phase === "done" ? (
                          <span className="gradient-text">Round settled.</span>
                        ) : (
                          "The draw is live"
                        )}
                      </h3>
                    </div>

                    {/* Balls row */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      {[0, 1, 2, 3].map((i) => (
                        <DrawBall
                          key={i}
                          value={locked > i ? finals[i] : spin[i]}
                          locked={locked > i}
                          index={i}
                          variant="main"
                        />
                      ))}
                      <span className="text-2xl text-indigo-300/25 font-thin select-none">+</span>
                      <DrawBall
                        value={locked > 4 ? finals[4] : spin[4]}
                        locked={locked > 4}
                        index={4}
                        variant="kitti"
                      />
                    </div>

                    <motion.p
                      animate={{ opacity: phase === "done" ? 1 : 0.4 }}
                      className="text-xs text-indigo-300/50"
                    >
                      Provably drawn via Gelato VRF + Drand — verifiable on-chain.
                    </motion.p>
                  </motion.div>
                )}

                {/* ── LUCKY WALLET REVEAL ──────────────────────── */}
                {phase === "lucky" && (
                  <motion.div
                    key="lucky"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8 py-4"
                  >
                    {/* Winning balls (locked, static) */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      {[0, 1, 2, 3].map((i) => (
                        <DrawBall key={i} value={finals[i]} locked index={i} variant="main" />
                      ))}
                      <span className="text-2xl text-indigo-300/25 font-thin select-none">+</span>
                      <DrawBall value={finals[4]} locked index={4} variant="kitti" />
                    </div>

                    {/* Lucky wallet card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.2, ease: [0.16, 1, 0.3, 1], duration: 0.55 }}
                      className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-5 space-y-3"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 0.6, repeat: 3 }}
                        className="text-4xl"
                      >
                        🍀
                      </motion.div>
                      <div className="text-xs font-bold uppercase tracking-widest text-amber-400/70">
                        Lucky Wallet
                      </div>
                      <div className="text-lg font-black text-white leading-tight break-all">
                        {luckyWallet.slice(0, 6)}
                        <span className="text-amber-400">{luckyWallet.slice(6, 10)}</span>
                        <span className="text-indigo-300/40">…</span>
                        <span className="text-amber-400">{luckyWallet.slice(-4)}</span>
                      </div>
                      <div className="text-xs text-indigo-300/50">
                        10% of the prize pool credited to this wallet — withdraw on the Play page
                      </div>
                    </motion.div>

                    <motion.button
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      onClick={close}
                      className="btn-outline w-full"
                    >
                      Close
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DrawBall({
  value, locked, index, variant,
}: {
  value: number;
  locked: boolean;
  index: number;
  variant: "main" | "kitti";
}) {
  const isKitti = variant === "kitti";
  return (
    <motion.div
      animate={
        locked
          ? { scale: [1, 1.45, 0.88, 1.12, 1], y: [0, -14, 4, -6, 0] }
          : { y: [0, -4, 0] }
      }
      transition={
        locked
          ? { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }
          : { duration: 0.35, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 }
      }
      className="relative grid place-items-center rounded-full font-black"
      style={{
        width: isKitti ? 72 : 60,
        height: isKitti ? 72 : 60,
        fontSize: isKitti ? 26 : 22,
        background: isKitti
          ? locked
            ? "radial-gradient(circle at 35% 30%, rgba(245,200,50,1) 0%, rgba(180,100,5,1) 80%)"
            : "radial-gradient(circle at 35% 30%, rgba(245,158,11,0.35) 0%, rgba(20,15,5,0.95) 70%)"
          : locked
          ? "radial-gradient(circle at 35% 30%, rgba(124,92,255,1) 0%, rgba(60,35,180,1) 80%)"
          : "radial-gradient(circle at 35% 30%, rgba(124,92,255,0.35) 0%, rgba(15,21,53,0.95) 70%)",
        color: isKitti ? (locked ? "#1a0a00" : "rgba(245,158,11,0.7)") : locked ? "#fff" : "rgba(124,92,255,0.6)",
        boxShadow: locked
          ? isKitti
            ? "0 0 32px rgba(245,158,11,0.8), 0 0 64px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.3)"
            : "0 0 32px rgba(124,92,255,0.8), 0 0 64px rgba(124,92,255,0.3), inset 0 1px 0 rgba(255,255,255,0.25)"
          : "0 2px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
        border: `2px solid ${locked
          ? isKitti ? "rgba(245,158,11,0.9)" : "rgba(124,92,255,0.9)"
          : isKitti ? "rgba(245,158,11,0.2)" : "rgba(124,92,255,0.25)"
        }`,
      }}
    >
      {/* Shine */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ top: 6, left: 9, width: isKitti ? 18 : 14, height: isKitti ? 11 : 9, background: "rgba(255,255,255,0.35)", filter: "blur(2px)" }}
      />
      <span className="relative z-10">
        {isKitti ? (KITTI_LETTERS[value] ?? value) : value}
      </span>
    </motion.div>
  );
}
