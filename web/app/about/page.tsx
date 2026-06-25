"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Connect your wallet",
    body: "Plug in any EVM wallet — MetaMask, Coinbase Wallet, Rainbow. No account. No email. No KYC.",
    icon: "🔗",
  },
  {
    n: "02",
    title: "Pick your numbers",
    body: "Choose a digit 0–9 for each of the four balls — repeats allowed, so 7-7-1-4 is fine — plus a KITY letter, K, I, T or Y. Or hit Quick Pick.",
    icon: "🎯",
  },
  {
    n: "03",
    title: "Add to cart & buy",
    body: "Stack multiple tickets in your cart — each distinct slip is real added coverage. Pay $2 USDC per ticket; one transaction covers the whole cart.",
    icon: "🛒",
  },
  {
    n: "04",
    title: "Draw fires every 24 hours",
    body: "When the round's 24-hour timer ends, the contract requests verifiable randomness from Pyth Entropy. The draw runs even if a single ticket is in.",
    icon: "⏱️",
  },
  {
    n: "05",
    title: "Winnings credited on-chain",
    body: "When a round settles, the Lucky Wallet prize is credited automatically; jackpot and tier winners claim their ticket, then withdraw. No forms, no waiting period.",
    icon: "💸",
  },
];

const STATS = [
  { value: "100%", label: "On-chain", sub: "Every draw, every payout" },
  { value: "Pyth", label: "Randomness", sub: "Verifiable, on-chain" },
  { value: "6s", label: "Settlement", sub: "Base block time" },
  { value: "Open", label: "Source", sub: "Audit it yourself" },
];

const TECH = [
  {
    name: "Pyth Entropy",
    desc: "Verifiable on-chain randomness. The provider commits to a secret before each draw, so no one — including KITY — can predict or manipulate the outcome.",
    icon: "🎲",
    color: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/20",
  },
  {
    name: "Base",
    desc: "Coinbase's L2 built on the OP Stack. Sub-cent gas fees, 2-second blocks, and the security of Ethereum mainnet underneath.",
    icon: "🔵",
    color: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20",
  },
  {
    name: "USDC",
    desc: "Every ticket costs $2 USDC. Every prize pays out in USDC. No volatile token, no impermanent loss, no conversion step.",
    icon: "💵",
    color: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/20",
  },
  {
    name: "Open source",
    desc: "The contract, the tests, the frontend — all open source. Fork it, audit it, break it. We welcome scrutiny.",
    icon: "🔓",
    color: "from-amber-500/20 to-yellow-500/10",
    border: "border-amber-500/20",
  },
];

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-16 pb-8 lg:max-w-5xl lg:mx-auto">

      {/* Hero */}
      <Section className="pt-4 text-center space-y-6">
        <div className="flex justify-center">
          <span className="pill">
            <span className="pill-dot" />
            Built on Base · Powered by Pyth Entropy
          </span>
        </div>
        <h1 className="display display-lg text-white">
          The lottery where fairness is{" "}
          <span className="gradient-text">on-chain proof.</span>
        </h1>
        <p className="mx-auto max-w-md text-pretty text-base leading-relaxed text-indigo-300/70">
          Traditional lotteries hide the odds. KITY puts every draw on a public blockchain so anyone
          — including you — can verify the result is legit.
        </p>
        <div className="flex justify-center pt-1">
          <Link href="/play" className="btn-cta">
            Play the next draw
            <span aria-hidden>→</span>
          </Link>
        </div>
      </Section>

      {/* Stats bar */}
      <Section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="card-glass text-center py-4 px-2 space-y-0.5"
            >
              <div className="gradient-text text-2xl font-black">{s.value}</div>
              <div className="text-xs font-bold text-indigo-100">{s.label}</div>
              <div className="text-[10px] text-indigo-300/40">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Problem / Solution */}
      <Section className="card-glass space-y-4 lg:max-w-3xl">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">The Problem</h2>
        <p className="text-indigo-100 text-sm leading-relaxed">
          Every traditional lottery — national, state, or online — asks you to{" "}
          <span className="text-white font-semibold">trust them</span>. Trust that the draw wasn't rigged.
          Trust that the odds are what they publish. Trust that your winnings will actually arrive.
        </p>
        <p className="text-indigo-300/60 text-sm leading-relaxed">
          That's a lot of trust to place in an organization that profits when you lose.
        </p>
        <div className="border-t border-white/5 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50 mb-3">The Fix</h2>
          <p className="text-indigo-100 text-sm leading-relaxed">
            KITY replaces trust with cryptographic proof. The random number comes from{" "}
            <span className="text-violet-300 font-semibold">Pyth Entropy</span> — verifiable on-chain randomness
            that no one, including KITY, can predict or bias. The draw is settled by a smart contract
            that <em>cannot</em> be modified after deployment. Winners receive USDC instantly.
            And the odds aren't hidden — a flat <span className="text-violet-300 font-semibold">1 in 40,000</span>{" "}
            at the jackpot, printed right on the ticket. Everything is auditable on-chain, forever.
          </p>
        </div>
      </Section>

      {/* How it works */}
      <Section className="space-y-5 lg:max-w-3xl">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">How It Works</h2>
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="card-glass sheen flex gap-4 items-start"
            >
              <div className="shrink-0 text-2xl">{step.icon}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-300/30 tracking-widest">{step.n}</span>
                  <span className="text-sm font-bold text-indigo-100">{step.title}</span>
                </div>
                <p className="text-xs text-indigo-300/60 leading-relaxed">{step.body}</p>
              </div>
        <div className="flex justify-center pt-1">
          <a
            href="https://github.com/Kity-Lottery/KITY-Lottery"
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-semibold text-violet-300 underline underline-offset-4 hover:text-violet-200 transition-colors"
          >
            Inspect the public repo on GitHub
          </a>
        </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Prize structure infographic */}
      <Section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">Prize Split — Every Round</h2>
        <div className="card-glass space-y-3">
          {[
            { label: "Jackpot", note: "All 4 in position + KITY letter", pct: 50, color: "#7c5cff" },
            { label: "2nd Prize", note: "All 4 in position", pct: 15, color: "#00d4ff" },
            { label: "3rd Prize", note: "Any 3 in position", pct: 10, color: "#10b981" },
            { label: "Lucky Wallet", note: "Random winner — always pays", pct: 10, color: "#f59e0b" },
            { label: "Rollover", note: "Seeds the next draw — jackpots grow", pct: 10, color: "#f43f5e" },
          ].map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-indigo-100">{t.label}
                  <span className="ml-1.5 text-indigo-300/40 font-normal hidden sm:inline">— {t.note}</span>
                </span>
                <span className="font-black text-white">{t.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: t.color, boxShadow: `0 0 8px ${t.color}60` }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${t.pct * 2}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.08, ease: [0.25, 1, 0.5, 1] }}
                />
              </div>
            </motion.div>
          ))}
          <p className="text-[10px] text-indigo-300/30 pt-2 border-t border-white/5">
            No winner in a tier? It rolls into the next round. Winnings are credited on-chain — claim any time with one click.
          </p>
        </div>
      </Section>

      {/* Growing pool story */}
      <Section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">The Pool That Never Sleeps</h2>
        <div className="card-glass space-y-5">
          <p className="text-sm text-indigo-100 leading-relaxed">
            When no ticket matches the winning numbers for a prize tier,{" "}
            <span className="text-violet-300 font-semibold">that money doesn't vanish</span>. The jackpot rolls
            straight into the next round — a bigger prize for the next round's players. On top of that, 10% of
            every round always rolls into the next draw, so the jackpot keeps compounding with no side pool.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "Timer ends. No jackpot winner.",
                body: "The 50% jackpot allocation rolls into the next round's jackpot instead of going back to the protocol.",
              },
              {
                icon: "📈",
                title: "The pot compounds.",
                body: "On top of the rollover, every round always sends 10% into the next draw. It builds quietly, round after round, with no side pool.",
              },
              {
                icon: "💥",
                title: "It only resets when someone wins.",
                body: "The jackpot keeps climbing draw after draw until a ticket finally matches. Then it pays out — credited on-chain instantly, withdrawable any time — and starts growing all over again.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.09 }}
                className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-2"
              >
                <div className="text-xl">{s.icon}</div>
                <div className="text-xs font-bold text-indigo-100 leading-snug">{s.title}</div>
                <p className="text-xs text-indigo-300/55 leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs text-violet-300/80 leading-relaxed">
              <span className="font-bold text-violet-200">The result:</span> a round with zero top-prize winners is not a quiet round — it's a round that silently makes the next big payout even bigger. The pool is always building, always visible on the Play page.
            </p>
          </div>
        </div>
      </Section>

      {/* Split prizes */}
      <Section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">What If Two People Pick the Same Numbers?</h2>
        <div className="card-glass space-y-4">
          <p className="text-sm text-indigo-100 leading-relaxed">
            It can happen. When it does, the prize for that tier is{" "}
            <span className="text-violet-300 font-semibold">split equally among all winners</span>. No one is penalized
            for thinking alike — but the payout per person scales down with each additional winner.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                scenario: "1 winner matches the jackpot",
                result: "100% of the jackpot tier — the whole thing",
                color: "text-emerald-300",
                bg: "bg-emerald-500/5 border-emerald-500/20",
              },
              {
                scenario: "2 winners match the jackpot",
                result: "50% of the tier each, instant",
                color: "text-sky-300",
                bg: "bg-sky-500/5 border-sky-500/20",
              },
              {
                scenario: "3 winners match the jackpot",
                result: "33.3% of the tier each, instant",
                color: "text-amber-300",
                bg: "bg-amber-500/5 border-amber-500/20",
              },
              {
                scenario: "No winners in a tier",
                result: "Full tier amount rolls into the next round",
                color: "text-violet-300",
                bg: "bg-violet-500/5 border-violet-500/20",
              },
            ].map((r, i) => (
              <motion.div
                key={r.scenario}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className={`rounded-xl border p-4 space-y-1.5 ${r.bg}`}
              >
                <div className="text-xs text-indigo-300/50 font-medium">{r.scenario}</div>
                <div className={`text-sm font-bold ${r.color}`}>{r.result}</div>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-indigo-300/40 leading-relaxed border-t border-white/5 pt-4">
            The smart contract handles this automatically. Winners are identified and the prize is divided in the same settlement transaction, then credited on-chain — claim any time with one click, no manual distribution.
          </p>
        </div>
      </Section>

      {/* Tech stack */}
      <Section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">Under The Hood</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TECH.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`sheen rounded-2xl border p-4 bg-gradient-to-br ${t.color} ${t.border} space-y-2`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm font-bold text-indigo-100">{t.name}</span>
              </div>
              <p className="text-xs text-indigo-300/60 leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* CTA footer */}
      <Section className="card-glass text-center space-y-3 py-8">
        <div className="text-2xl">🏆</div>
        <h3 className="text-lg font-black text-white">Ready to play?</h3>
        <p className="text-sm text-indigo-300/60">
          The next draw fires every 24 hours — even with a single ticket in. Every entry is $2 USDC.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/play" className="btn-cta">
            Enter the draw
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/faq"
            className="px-6 py-3 rounded-2xl text-sm font-semibold border border-white/10 text-indigo-300 hover:border-white/20 transition-colors"
          >
            Read the FAQ
          </Link>
        </div>
      </Section>

    </div>
  );
}
