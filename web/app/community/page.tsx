"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const CHANNELS = [
  {
    name: "Twitter / X",
    handle: "@kity.lottery",
    icon: "𝕏",
    desc: "Draw results, jackpot milestones, product updates, and live rolling-jackpot announcements.",
    cta: "Follow @kity.lottery",
    href: "https://x.com/kity.lottery",
    color: "from-slate-500/20 to-gray-500/10",
    border: "border-slate-500/25",
    badge: "Announcements",
    badgeColor: "bg-slate-500/20 text-slate-300",
  },
  {
    name: "Email",
    handle: "kity.lottery@proton.me",
    icon: "✉️",
    desc: "Bug reports, partnership enquiries, or anything you'd rather not say publicly.",
    cta: "Send a message",
    href: "mailto:kity.lottery@proton.me",
    color: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/25",
    badge: null,
    badgeColor: "",
  },
];

const RITUALS = [
  {
    day: "Weekly",
    title: "Odds Explained",
    desc: "A deep dive into the probability math behind each prize tier. Learn to think like a player who actually understands their edge.",
    icon: "📊",
  },
  {
    day: "Per draw",
    title: "Draw Verification Party",
    desc: "When a round settles, we walk through the on-chain randomness together. Show your work. Trust gets built by doing, not claiming.",
    icon: "🔬",
  },
  {
    day: "Monthly",
    title: "Winner Stories",
    desc: "Real winners (with permission) sharing how they play, what they won, and what they'd do differently. No marketing spin.",
    icon: "🏆",
  },
  {
    day: "Ongoing",
    title: "Referral Rewards",
    desc: "Bring someone new to KITY and both of you earn bonus entries. The more the community grows, the bigger every jackpot gets.",
    icon: "🎁",
  },
];

const VALUES = [
  {
    title: "Verify, don't trust",
    body: "We expect our community to question everything — including us. The tools to audit every draw are public. Use them.",
    icon: "🔍",
  },
  {
    title: "Luck is fair. Strategy is yours.",
    body: "Winning is random. But understanding odds, sizing your plays, and knowing the prize tiers is a real edge. We talk about it openly.",
    icon: "🎯",
  },
  {
    title: "Transparency isn't a feature",
    body: "It's the baseline. Hiding how randomness works, or making verification hard, is disqualifying. Everything at KITY is open by default.",
    icon: "💡",
  },
  {
    title: "Winners build the community",
    body: "When you win, we celebrate loudly. When you lose, we talk about why the odds are still fair. Both stories matter.",
    icon: "🤝",
  },
];

function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: [0.25, 1, 0.5, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function CommunityPage() {
  return (
    <div className="space-y-14 pb-8 lg:max-w-5xl lg:mx-auto">

      {/* Hero */}
      <div className="pt-2 space-y-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-5xl"
        >
          🌐
        </motion.div>
        <h1 className="display display-md text-white">
          You&apos;re not just a{" "}
          <span className="gradient-text">lottery player.</span>
        </h1>
        <p className="text-base text-indigo-300/60 leading-relaxed max-w-md mx-auto text-pretty">
          KITY is built by people who think fairness in gambling is non-negotiable. If that's you too,
          pull up a chair.
        </p>
      </div>

      {/* Community channels */}
      <div className="space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-300/50">
          Where We Hang Out
        </h2>
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {CHANNELS.map((c, i) => (
            <Card key={c.name} delay={i * 0.08}
              className={`sheen rounded-2xl border p-5 bg-gradient-to-br ${c.color} ${c.border} space-y-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-indigo-100">{c.name}</span>
                      {c.badge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.badgeColor}`}>
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-indigo-300/40 font-mono">{c.handle}</div>
                  </div>
                </div>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-bold text-violet-300 border border-violet-500/30 rounded-lg px-3 py-1.5 hover:bg-violet-500/10 transition-colors"
                >
                  {c.cta} →
                </a>
              </div>
              <p className="text-xs text-indigo-300/60 leading-relaxed">{c.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Source / verification */}
      <div className="card-glass space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-300/50">
          Source & Verification
        </h2>
        <p className="text-xs text-indigo-300/60 leading-relaxed">
          The contracts, tests, and frontend live in the public repo. Use it to verify the smart contract code,
          inspect the test suite, and review the app implementation before you play.
        </p>
        <a
          href="https://github.com/Kity-Lottery/KITY-Lottery"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-violet-200 transition-colors"
        >
          View the GitHub repo <span aria-hidden>↗</span>
        </a>
      </div>

      {/* Community values */}
      <div className="space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-300/50">
          How We Roll
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <Card key={v.title} delay={i * 0.06} className="card-glass sheen space-y-2">
              <div className="text-xl">{v.icon}</div>
              <div className="text-sm font-bold text-indigo-100">{v.title}</div>
              <p className="text-xs text-indigo-300/55 leading-relaxed">{v.body}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Recurring rituals */}
      <div className="space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-300/50">
          Community Rituals
        </h2>
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {RITUALS.map((r, i) => (
            <Card key={r.title} delay={i * 0.07} className="card-glass flex gap-4 items-start">
              <span className="text-2xl shrink-0">{r.icon}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-100">{r.title}</span>
                  <span className="text-[10px] text-indigo-300/30 uppercase tracking-widest font-semibold">{r.day}</span>
                </div>
                <p className="text-xs text-indigo-300/55 leading-relaxed">{r.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Ambassador teaser */}
      <Card className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌟</span>
          <div>
            <div className="text-sm font-bold text-amber-200">Ambassador Program</div>
            <div className="text-xs text-amber-400/50">Coming soon</div>
          </div>
        </div>
        <p className="text-xs text-amber-200/60 leading-relaxed">
          Power users who help grow the community — by creating explainer content, moderating
          channels, or bringing new players — will earn USDC credits, exclusive draw access,
          and a revenue share on referral volume.
        </p>
        <p className="text-xs text-amber-300/50">
          Interested? Reach out at <span className="text-amber-300/70 font-mono">kity.lottery@proton.me</span> or review the public repo.
        </p>
      </Card>

      {/* CTA */}
      <div className="card-glass text-center space-y-4 py-8">
        <h3 className="text-lg font-black text-white">Start here.</h3>
        <p className="text-sm text-indigo-300/60 max-w-sm mx-auto">
          Follow <span className="text-violet-300 font-mono">@kity.lottery</span> on X for draw results,
          review the source repo for verification, or email us at{" "}
          <a href="mailto:kity.lottery@proton.me" className="text-violet-300 hover:text-violet-200 transition-colors">
            kity.lottery@proton.me
          </a>.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a
            href="https://x.com/kity.lottery"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-6 py-3 rounded-2xl text-sm font-bold text-white"
          >
            𝕏 Follow @kity.lottery →
          </a>
          <Link
            href="/about"
            className="px-6 py-3 rounded-2xl text-sm font-semibold border border-white/10 text-indigo-300 hover:border-white/20 transition-colors"
          >
            How KITY works
          </Link>
          <a
            href="https://github.com/Kity-Lottery/KITY-Lottery"
            target="_blank"
            rel="noreferrer noopener"
            className="px-6 py-3 rounded-2xl text-sm font-semibold border border-white/10 text-indigo-300 hover:border-white/20 transition-colors"
          >
            Source repo
          </a>
        </div>
      </div>

    </div>
  );
}
