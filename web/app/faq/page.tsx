"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const SECTIONS: { title: string; icon: string; items: FaqItem[] }[] = [
  {
    title: "How KITY Works",
    icon: "⚙️",
    items: [
      {
        q: "What is KITY?",
        a: "KITY is a provably fair, on-chain lottery on Base. Every round fires a verifiable random draw via Pyth Entropy. Winners claim their ticket and withdraw to their wallet — any time, no expiry.",
      },
      {
        q: "How do I enter?",
        a: (
          <>
            Connect any EVM-compatible wallet (MetaMask, Coinbase Wallet, Rainbow), pick your numbers
            on the{" "}
            <Link href="/play" className="text-violet-400 underline underline-offset-2">Play page</Link>,
            add to cart, and approve the USDC transaction. That's it — you're in the round.
          </>
        ),
      },
      {
        q: "What does a ticket cost?",
        a: "$2 USDC per ticket on the live Starter tier. Higher tiers — $20 (Pro) and $200 (Whale), with rolling jackpots up to $100k and $1M — are coming soon. You can buy multiple tickets per round; gas on Base is typically under $0.01.",
      },
      {
        q: "Can I put the same number on more than one ball?",
        a: "Yes. KITY is a positional Pick-4 — you choose a digit 0–9 for each of the four balls independently, so 7-7-1-4, or even 2-2-2-2, is perfectly valid. A ball wins when your digit matches the drawn digit in that position. Add one KITY letter (K, I, T or Y) and matching all four positions plus the KITY letter takes the jackpot.",
      },
      {
        q: "When does the draw happen?",
        a: "Every round runs on a 24-hour timer — or sooner if it fills to 1,000 tickets. There's no minimum head-count: the draw runs even if a single ticket is in the pot. The live countdown on the Play page shows exactly how long is left.",
      },
      {
        q: "What if hardly anyone enters a round?",
        a: "The draw still fires on the 24-hour timer — even with one ticket. A quiet round just means more of the pool rolls into the next one, so the jackpot keeps growing and tends to pull players back in.",
      },
    ],
  },
  {
    title: "Fairness & Verification",
    icon: "🔍",
    items: [
      {
        q: "Can KITY rig the draw?",
        a: "No. Once the contract is deployed, its logic is immutable — nobody, including the team, can change how winners are selected. The random seed comes from Pyth Entropy, a verifiable on-chain randomness service. KITY never touches the randomness.",
      },
      {
        q: "What is Pyth Entropy?",
        a: "Pyth Entropy is a verifiable on-chain randomness service. When a draw triggers, KITY requests a random number; the Pyth provider — committed to a secret in advance, so it can't bias the result — delivers it back to the smart contract. The whole flow is auditable on-chain.",
      },
      {
        q: "How do I verify a past draw myself?",
        a: (
          <>
            Every draw emits a <code className="text-violet-300 bg-white/5 px-1 rounded text-xs">DrawReady</code> event
            on-chain with the random value used. You can look up any round on{" "}
            <span className="text-violet-400">BaseScan</span>, find the
            <code className="text-violet-300 bg-white/5 px-1 rounded text-xs ml-1">entropyCallback</code> transaction,
            and trace the randomness back to the Pyth request. Each winning digit is derived from that seed with
            keccak256 — re-compute it yourself with any script to confirm.
          </>
        ),
      },
      {
        q: "Is the smart contract audited?",
        a: (
          <>
            The contract is fully open source. A formal third-party audit is planned before mainnet launch.
            You can review the code, tests, and frontend in the public repo{" "}
            <a
              href="https://github.com/Kity-Lottery/KITY-Lottery"
              target="_blank"
              rel="noreferrer noopener"
              className="text-violet-400 underline underline-offset-2"
            >
              on GitHub
            </a>
            .
          </>
        ),
      },
      {
        q: "Can a whale just buy a huge number of tickets?",
        a: "They can, but it buys exactly proportional coverage at full price — every ticket is $2 and the per-ticket odds are fixed. There's no cap and no volume discount, so there's no edge to corner: more distinct tickets simply means paying for more chances at the same fair draw.",
      },
    ],
  },
  {
    title: "Prizes & Payouts",
    icon: "💰",
    items: [
      {
        q: "How is the prize pool split?",
        a: (
          <ul className="space-y-1 text-xs text-indigo-300/70">
            <li>🏆 <strong className="text-indigo-100">Jackpot (50%)</strong> — All 4 digits in position + KITY letter · 1 in 40,000</li>
            <li>🥈 <strong className="text-indigo-100">2nd Prize (15%)</strong> — All 4 digits in position · 1 in 10,000</li>
            <li>🥉 <strong className="text-indigo-100">3rd Prize (10%)</strong> — Any 3 digits in position · 1 in 278</li>
            <li>🍀 <strong className="text-indigo-100">Lucky Wallet (10%)</strong> — One random ticket always wins this</li>
            <li>🔁 <strong className="text-indigo-100">Rollover (10%)</strong> — Seeds the next draw; the jackpot keeps growing</li>
            <li>🏛️ <strong className="text-indigo-100">Platform Fee (5%)</strong> — Protocol sustainability</li>
          </ul>
        ),
      },
      {
        q: "What are my odds of winning?",
        a: (
          <>
            <p className="mb-2">Matching is positional and the ranges are friendly — digits 0–9 on the four balls, K/I/T/Y on the KITY letter — so the odds are exact and printed on every ticket:</p>
            <ul className="space-y-1 text-xs text-indigo-300/70">
              <li>🏆 <strong className="text-indigo-100">Jackpot</strong> — 1 in 40,000</li>
              <li>🥈 <strong className="text-indigo-100">2nd Prize</strong> — 1 in 10,000</li>
              <li>🥉 <strong className="text-indigo-100">3rd Prize</strong> — 1 in 278</li>
            </ul>
            <p className="mt-2">Every distinct ticket you add is real extra coverage, so two tickets roughly halve those numbers, ten tickets cut them to a tenth, and so on. The Play page shows your combined odds live as you stack tickets.</p>
          </>
        ),
      },
      {
        q: "What is the rollover?",
        a: "10% of every round always rolls straight into the next draw — and any prize tier nobody wins rolls forward too. There's no separate side pool: the jackpot simply compounds round after round until someone wins it, then it starts climbing again.",
      },
      {
        q: "What happens if nobody wins a prize tier?",
        a: (
          <>
            <p className="mb-2">No prize is ever skimmed. If no ticket matches a tier, that money rolls straight into the <strong className="text-indigo-100">next round</strong> — making the next 100-player draw bigger.</p>
            <ul className="space-y-1 text-xs text-indigo-300/70">
              <li>🏆 <strong className="text-indigo-100">No jackpot winner</strong> → 50% rolls into next round&apos;s jackpot</li>
              <li>🥈 <strong className="text-indigo-100">No 2nd-prize winner</strong> → 15% rolls forward</li>
              <li>🥉 <strong className="text-indigo-100">No 3rd-prize winner</strong> → 10% rolls forward</li>
              <li>🍀 <strong className="text-indigo-100">Lucky Wallet</strong> → always pays; one random ticket wins every round</li>
            </ul>
            <p className="mt-2">A quiet round just makes the next jackpot bigger. On top of that, 10% of every round always rolls into the next draw — so the pot grows even when there is a winner.</p>
          </>
        ),
      },
      {
        q: "What if multiple people pick the exact same winning numbers?",
        a: (
          <>
            <p className="mb-2">The prize for that tier is split equally among all matching winners. The smart contract identifies every winning ticket in the same transaction and divides the allocation proportionally.</p>
            <ul className="space-y-1 text-xs text-indigo-300/70">
              <li>1 jackpot winner → receives 100% of the jackpot tier</li>
              <li>2 jackpot winners → each receives 50%</li>
              <li>3 jackpot winners → each receives 33.3%</li>
            </ul>
            <p className="mt-2">Winnings credit on-chain in the same block — one click to withdraw on the Play page, no queuing, no expiry.</p>
          </>
        ),
      },
      {
        q: "Does the jackpot keep growing?",
        a: "Yes. Every round rolls at least 10% of its pool into the next draw — about $20 per round on the $2 tier — and any unwon prize rolls forward on top of that. The jackpot compounds round after round and only resets when someone finally wins it.",
      },
      {
        q: "How fast do winnings arrive?",
        a: "In the same block as the draw. Your prize credit is on-chain instantly — hit Withdraw on the Play page to send USDC to your wallet. No waiting, no expiry.",
      },
      {
        q: "Do I need to claim my winnings?",
        a: "Yes — one click. Winnings credit on-chain the moment the round settles, jackpot to Lucky Wallet alike. Open the My Tickets tab and hit Withdraw to send your USDC to your wallet. Credits never expire.",
      },
    ],
  },
  {
    title: "Wallets & Security",
    icon: "🔐",
    items: [
      {
        q: "Which wallets are supported?",
        a: "Any EVM-compatible wallet works: MetaMask, Coinbase Wallet, Rainbow, Trust Wallet, Ledger (via MetaMask), and any wallet that supports WalletConnect v2.",
      },
      {
        q: "Does KITY hold my funds?",
        a: "No. The smart contract holds the current round's pool, but you always retain custody of your wallet and keys. KITY has no ability to drain your wallet — you only approve exactly what you spend on tickets.",
      },
      {
        q: "Do I need to approve USDC?",
        a: "Yes, once. The first ticket purchase asks you to approve KITY's contract to spend your USDC. You can set the approval to exactly $2 (single ticket) or a larger amount for future purchases. Standard ERC-20 approval flow.",
      },
      {
        q: "Is my personal data collected?",
        a: "None. KITY is a wallet-connect app — no email, no name, no KYC. Your wallet address is the only identifier. On-chain activity is public by nature of Base, but KITY itself stores no user data.",
      },
    ],
  },
  {
    title: "Legality",
    icon: "⚖️",
    items: [
      {
        q: "Is KITY legal?",
        a: "Online lottery and gambling laws vary by jurisdiction. KITY is a smart contract deployed on a public blockchain — participation is your responsibility to verify against your local laws. We strongly recommend checking your country or state's gambling regulations before playing.",
      },
      {
        q: "Are winnings taxable?",
        a: "In most jurisdictions, gambling winnings are taxable income. This is entirely your responsibility. KITY doesn't provide tax advice — consult a qualified tax professional in your jurisdiction.",
      },
    ],
  },
];

function FaqAccordion({ item, idx }: { item: FaqItem; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: idx * 0.04 }}
      className="border-b border-white/5 last:border-0"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-indigo-100">{item.q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-violet-400 text-lg font-light leading-none"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm text-indigo-300/60 leading-relaxed">{item.a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqPage() {
  return (
    <div className="space-y-10 pb-8 lg:max-w-3xl lg:mx-auto">

      {/* Hero */}
      <div className="pt-4 space-y-5">
        <div className="eyebrow text-violet-400/70">Help center</div>
        <h1 className="display display-md text-white">
          Frequently asked <span className="gradient-text">questions.</span>
        </h1>
        <p className="max-w-md text-pretty text-base leading-relaxed text-indigo-300/60">
          Everything you need to know before your first draw. Something missing?{" "}
          <Link href="/community" className="text-violet-400 underline underline-offset-2">
            Ask in the community.
          </Link>
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{section.icon}</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-300/50">
              {section.title}
            </h2>
          </div>
          <div className="card-glass divide-y-0">
            {section.items.map((item, idx) => (
              <FaqAccordion key={item.q} item={item} idx={idx} />
            ))}
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="card-glass text-center space-y-3 py-6">
        <p className="text-sm text-indigo-300/60">Still have questions?</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/community" className="btn-primary px-6 py-3 rounded-2xl text-sm font-bold text-white">
            Join the community →
          </Link>
          <Link href="/play" className="px-6 py-3 rounded-2xl text-sm font-semibold border border-white/10 text-indigo-300 hover:border-white/20 transition-colors">
            Enter a draw
          </Link>
        </div>
      </div>

    </div>
  );
}
