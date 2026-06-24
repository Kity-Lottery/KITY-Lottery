"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ParticleField } from "@/components/ParticleField";
import { Reveal } from "@/components/Reveal";
import { MagneticButton } from "@/components/MagneticButton";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { SpotlightCard } from "@/components/SpotlightCard";
import { Marquee } from "@/components/Marquee";
import { TierCards } from "@/components/TierCards";
import { KITYLogo } from "@/components/KITYLogo";

/* ────────────────────────────────────────────────────────────────────────── */

const STATS = [
  { value: 2,   prefix: "$", label: "per ticket",   sub: "USDC on Base" },
  { value: 24,  suffix: "h", label: "every draw",   sub: "runs with one ticket" },
  { value: 40,  suffix: "k", label: "jackpot odds", sub: "a flat 1-in-40,000" },
  { value: 278, suffix: "",  label: "3rd prize",    sub: "1-in-278 · friendliest odds" },
];

const STEPS = [
  {
    n: "01",
    title: "Pick 4 + 1",
    body: "Choose a digit 0–9 for each of four balls, then one KITY letter — K, I, T or Y. Quick-pick if you feel lucky.",
    icon: "🎯",
  },
  {
    n: "02",
    title: "Beat the clock",
    body: "Every round runs a 24-hour timer. When it hits zero the draw fires — even if you're the only ticket in the pot.",
    icon: "⏱️",
  },
  {
    n: "03",
    title: "Draw fires",
    body: "Pyth Entropy delivers a verifiable random number and the contract draws the winning numbers on-chain.",
    icon: "⚡",
  },
  {
    n: "04",
    title: "Get paid",
    body: "When the round settles, claim your winning ticket and withdraw your USDC — any time, no expiry.",
    icon: "💸",
  },
];

const TIERS = [
  { name: "Jackpot", pct: "50%", match: "All 4 digits + KITY · 1 in 40k", glow: "from-violet-500/25 to-indigo-500/5", big: true, icon: "🏆" },
  { name: "2nd Prize", pct: "15%", match: "All 4 digits in position · 1 in 10k", glow: "from-sky-500/20 to-cyan-500/5", icon: "🥈" },
  { name: "3rd Prize", pct: "10%", match: "Any 3 in position · 1 in 278", glow: "from-emerald-500/20 to-teal-500/5", icon: "🥉" },
  { name: "Lucky Wallet", pct: "10%", match: "One random ticket — always pays", glow: "from-fuchsia-500/20 to-pink-500/5", icon: "🍀" },
  { name: "Rollover", pct: "15%", match: "Seeds the next draw — jackpots grow", glow: "from-amber-500/20 to-yellow-500/5", icon: "🔁" },
];

const FAIRNESS = [
  {
    title: "Verifiable seed",
    body: "The seed comes from Pyth Entropy — the provider commits to it in advance, so nobody, including us, can predict or bias it.",
    icon: "🛰️",
  },
  {
    title: "Pyth Entropy",
    body: "Pyth delivers that randomness on-chain to an immutable contract. The whole request → fulfill flow is logged and auditable on BaseScan.",
    icon: "🔗",
  },
  {
    title: "Re-run it yourself",
    body: "Every draw emits a DrawReady event with the exact seed. Each winning digit is keccak256-derived from it — replay it with any script and confirm the winners.",
    icon: "🔍",
  },
];

const TRUST = [
  "PYTH ENTROPY",
  "VERIFIABLE RANDOMNESS",
  "BASE L2",
  "USDC SETTLEMENT",
  "OPEN SOURCE",
  "NON-CUSTODIAL",
  "IMMUTABLE CONTRACT",
  "PROVABLY FAIR",
];

/* ────────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="space-y-28 pb-10 lg:space-y-40">
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="full-bleed vignette relative flex min-h-[88vh] items-center justify-center overflow-hidden">
        {/* particle simulator */}
        <div className="absolute inset-0">
          <ParticleField />
        </div>

        {/* floating number chips */}
        <FloatingChips />

        {/* hero copy */}
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">

          {/* ── KITY rolling-balls logo ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-10 flex justify-center"
          >
            <KITYLogo size={82} gap={14} />
          </motion.div>

          <motion.div
            initial={{ y: 12, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-7 flex justify-center"
          >
            <span className="pill">
              <span className="pill-dot" />
              Live on Base · Provably fair
            </span>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="display display-xl text-white"
          >
            The fairest lottery
            <br />
            <span className="gradient-text">ever put on-chain.</span>
          </motion.h1>

          <motion.p
            initial={{ y: 16, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-indigo-200/70"
          >
            $2 a ticket. Pick 4 digits plus a KITY letter. A draw anyone can verify
            fires every 24 hours — even with a single ticket in. Jackpots roll forward
            until someone wins. Prizes credit on-chain instantly — withdraw any time, no expiry.
          </motion.p>

          <motion.div
            initial={{ y: 14, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <MagneticButton href="/play" className="btn-cta" ariaLabel="Enter the draw">
              Enter the draw
              <span aria-hidden>→</span>
            </MagneticButton>
            <a href="#how" className="btn-outline">
              See how it works
            </a>
          </motion.div>
        </div>

        {/* scroll cue */}
        <motion.a
          href="#trust"
          aria-label="Scroll down"
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-indigo-300/40"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.a>
      </section>

      {/* ═══ TRUST STRIP + STATS ════════════════════════════════════════════ */}
      <section id="trust" className="space-y-12">
        <Marquee duration={34} className="text-indigo-300/30">
          {TRUST.map((t) => (
            <span key={t} className="mx-8 text-xs font-semibold tracking-[0.25em]">
              {t}
              <span className="ml-8 text-violet-400/40">✦</span>
            </span>
          ))}
        </Marquee>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <SpotlightCard className="px-5 py-7 text-center sm:py-8">
                <div className="stat-num gradient-text text-4xl sm:text-5xl">
                  <AnimatedNumber value={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-sm font-semibold text-indigo-100">{s.label}</div>
                <div className="text-xs text-indigo-300/40">{s.sub}</div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section id="how" className="space-y-14">
        <Reveal className="text-center">
          <div className="eyebrow text-violet-400/70">How it works</div>
          <h2 className="display display-lg mt-4 text-white">
            Four steps. Then <span className="gradient-text">math takes over.</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <SpotlightCard className="sheen group h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="stat-num text-3xl font-black text-white/10 transition-colors group-hover:text-violet-400/30">
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-indigo-50">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-300/60">{step.body}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ PRIZE TIERS — BENTO ════════════════════════════════════════════ */}
      <section className="space-y-14">
        <Reveal className="text-center">
          <div className="eyebrow text-violet-400/70">Where the pool goes</div>
          <h2 className="display display-lg mt-4 text-white">
            Six ways to win. <span className="gradient-text">One pool.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-indigo-300/60">
            Every $2 ticket flows into a single round pool, split across the tiers
            below. No winner in a tier? It rolls straight into the next draw —
            nothing is ever skimmed.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {TIERS.map((t, i) => (
            <Reveal
              key={t.name}
              delay={i * 0.06}
              className={t.big ? "col-span-2 lg:row-span-2" : ""}
            >
              <SpotlightCard
                className={`sheen h-full bg-gradient-to-br p-6 ${t.glow} ${
                  t.big ? "flex flex-col justify-between lg:p-8" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={t.big ? "text-4xl" : "text-2xl"}>{t.icon}</span>
                  <span
                    className={`stat-num gradient-text ${t.big ? "text-5xl lg:text-7xl" : "text-3xl"}`}
                  >
                    {t.pct}
                  </span>
                </div>
                <div className={t.big ? "mt-6" : "mt-4"}>
                  <div className={`font-bold text-indigo-50 ${t.big ? "text-2xl" : "text-base"}`}>
                    {t.name}
                  </div>
                  <div className="mt-1 text-sm text-indigo-300/55">{t.match}</div>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ STAKE TIERS ════════════════════════════════════════════════════ */}
      <section className="space-y-12">
        <Reveal className="text-center">
          <div className="eyebrow text-violet-400/70">Choose your stakes</div>
          <h2 className="display display-lg mt-4 text-white">
            Three ways to play. <span className="gradient-text">One starts now.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-indigo-300/60">
            Begin at $2 today. Higher tiers — bigger stakes, faster draws, and
            rolling jackpots up to $1,000,000 — are coming soon.
          </p>
        </Reveal>
        <TierCards />
      </section>

      {/* ═══ ROLLING JACKPOT ════════════════════════════════════════════════ */}
      <section className="full-bleed relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <ParticleField density={0.55} interactive={false} />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050816]/40 via-transparent to-[#050816]/60" />

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="eyebrow text-amber-400/70">Rolls forever</div>
            <h2 className="display display-lg mt-4 text-white">
              The jackpot that{" "}
              <span className="gradient-text-gold">never resets.</span>
            </h2>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-indigo-200/70">
              Nothing is skimmed into a side pool. Every round seeds 10% straight
              into the next draw — and any prize nobody wins rolls forward too.
            </p>
            <p className="mt-4 text-pretty leading-relaxed text-indigo-300/55">
              So the pot only grows. It compounds round after round until someone
              finally takes it — then it starts climbing all over again.
            </p>
            <div className="mt-8">
              <MagneticButton href="/play" className="btn-cta" ariaLabel="Play now">
                Buy a ticket
                <span aria-hidden>→</span>
              </MagneticButton>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="flex justify-center">
            <div className="spotlight grain relative flex w-full max-w-sm flex-col gap-5 p-8">
              <div className="absolute -inset-1 -z-10 rounded-[26px] bg-gradient-to-br from-amber-500/10 to-violet-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <div className="eyebrow text-indigo-300/40">Rolling jackpot</div>
                <span className="text-xs font-semibold text-emerald-300/80">↑ growing</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { r: 11, v: "$520", w: "34%", live: false },
                  { r: 12, v: "$740", w: "52%", live: false },
                  { r: 13, v: "$980", w: "73%", live: false },
                  { r: 14, v: "$1,240", w: "100%", live: true },
                ].map((row) => (
                  <div key={row.r} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-[10px] text-indigo-300/40">Round {row.r}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: row.w }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{
                          background: row.live
                            ? "linear-gradient(90deg,#f59e0b,#fde68a)"
                            : "linear-gradient(90deg,#7c5cff,#00d4ff)",
                          boxShadow: row.live ? "0 0 10px rgba(245,158,11,0.6)" : "none",
                        }}
                      />
                    </div>
                    <span
                      className={`w-16 shrink-0 text-right text-sm font-black tabular-nums ${
                        row.live ? "text-amber-200" : "text-indigo-100"
                      }`}
                    >
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="hairline w-full" />
              <div className="text-center text-xs text-indigo-300/45">
                Illustrative — every round with no winner starts the next one bigger.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FAIRNESS ═══════════════════════════════════════════════════════ */}
      <section className="space-y-14">
        <Reveal className="text-center">
          <div className="eyebrow text-cyan-400/70">Don&apos;t trust. Verify.</div>
          <h2 className="display display-lg mt-4 text-white">
            Randomness you can <span className="gradient-text">audit yourself.</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {FAIRNESS.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1}>
              <SpotlightCard className="h-full p-7">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-2xl">
                  {f.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold text-indigo-50">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-300/60">{f.body}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <section className="full-bleed vignette relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ParticleField density={0.7} />
        </div>
        <Reveal className="relative z-10 px-6 text-center">
          <h2 className="display display-lg text-white">
            Your numbers are <span className="gradient-text">waiting.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty text-indigo-200/70">
            Connect a wallet, pick four digits and a KITY letter, and join the round.
            The next draw fires every 24 hours — even with one ticket in.
          </p>
          <div className="mt-9 flex justify-center">
            <MagneticButton href="/play" className="btn-cta" ariaLabel="Enter the draw">
              Enter the draw
              <span aria-hidden>→</span>
            </MagneticButton>
          </div>
          <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-indigo-300/30">
            Play responsibly and check your local laws before participating. KITY is
            a smart contract on a public blockchain — not financial advice.
          </p>
        </Reveal>
      </section>
    </div>
  );
}

/* ── Decorative floating number chips in the hero ─────────────────────────── */
function FloatingChips() {
  const chips = [
    { label: "7",   x: "10%", y: "28%", dur: 7,   rot: "-8deg",  c: "violet" },
    { label: "3",   x: "84%", y: "20%", dur: 8.5,  rot: "6deg",   c: "violet" },
    { label: "0",   x: "16%", y: "68%", dur: 6.5,  rot: "5deg",   c: "violet" },
    { label: "4",   x: "88%", y: "65%", dur: 9,    rot: "-6deg",  c: "violet" },
    { label: "9",   x: "6%",  y: "50%", dur: 7.8,  rot: "10deg",  c: "violet" },
  ] as const;

  const palette: Record<string, string> = {
    violet: "from-violet-500/30 to-indigo-600/10 text-violet-200 border-violet-400/30",
    cyan: "from-cyan-500/25 to-sky-600/10 text-cyan-200 border-cyan-400/30",
    amber: "from-amber-500/25 to-yellow-600/10 text-amber-200 border-amber-400/30",
  };

  return (
    <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden="true">
      {chips.map((chip, i) => (
        <div
          key={i}
          className="float-slow absolute"
          style={{
            left: chip.x,
            top: chip.y,
            ["--float-dur" as string]: `${chip.dur}s`,
            ["--rot" as string]: chip.rot,
            animationDelay: `${i * 0.4}s`,
          }}
        >
          <div
            className={`grid h-14 w-14 place-items-center rounded-2xl border bg-gradient-to-br backdrop-blur-md ${palette[chip.c]}`}
            style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
          >
            <span className="text-xl font-black">{chip.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
