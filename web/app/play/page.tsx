"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { lotteryAbi } from "@/lib/lotteryAbi";
import { erc20Abi } from "@/lib/erc20Abi";
import { LOTTERY_ADDRESS, TOKEN_ADDRESS, ZERO_ADDRESS } from "@/lib/contracts";
import { formatToken } from "@/lib/format";
import { TicketChecker } from "@/components/TicketChecker"; // Corrected import path
import { RoundCard } from "@/components/RoundCard";
import { LotteryBall } from "@/components/LotteryBall";
import { EstPrizePanel } from "@/components/EstPrizePanel";
import { PrizeMatchGuide } from "@/components/PrizeMatchGuide";
import { DrawReveal } from "@/components/DrawReveal";
import { RoundTimer } from "@/components/RoundTimer";
import { OddsBoost } from "@/components/OddsPanel";
import { MAIN_RANGE, KITTI_RANGE, KITTI_LETTERS, kittiLabel, smartSpread } from "@/lib/odds";

// ── Constants ──────────────────────────────────────────────────────────────────
type Tab = "play" | "tickets" | "results";
// main is POSITIONAL (Ball 1..4, repeats allowed) — order is significant, never sort.
type Draft = { main: number[]; kitti: number };

const TICKET_PRICE           = 2_000_000n;
const MAX_MAIN               = MAIN_RANGE;  // digits 0–9
const MAX_KITTI              = KITTI_RANGE; // K · I · T · Y
const MAX_TICKETS_PER_WALLET = 75;          // soft UI cap

// Shared transition helpers (avoiding string ease in variant objects for TS)
const TAB_TRANS  = { duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] as const };
const SLIP_TRANS = { duration: 0.22, ease: [0.16, 1, 0.3, 1]    as const };

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LotteryPage() {
  const { address, isConnected } = useAccount();

  const [tab, setTab]                       = useState<Tab>("play");
  const [slots, setSlots]                   = useState<(number | null)[]>([null, null, null, null]);
  const [selectedKitti, setSelectedKitti]   = useState<number | null>(null);
  const [activeSlot, setActiveSlot]         = useState<number>(0); // 0–3 = balls, 4 = Kitti
  const [cart, setCart]                     = useState<Draft[]>([]);
  const [lookupRound, setLookupRound]       = useState("");
  const [lookupTicket, setLookupTicket]     = useState("");
  const [viewOffset, setViewOffset]         = useState(0);

  // ── Contract reads ──────────────────────────────────────────────────────────
  const isDeployed = LOTTERY_ADDRESS !== ZERO_ADDRESS;

  const { data: currentRoundId, refetch: refetchRoundId } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "currentRound",
    query: { enabled: isDeployed, refetchInterval: 6000 },
  });

  const { data: roundData, refetch: refetchRound } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "getRound",
    args: [currentRoundId ?? 0n],
    query: { enabled: isDeployed && currentRoundId !== undefined, refetchInterval: 6000 },
  });

  // On-chain ticket cap — a round draws early (after 15 min) once it fills to this.
  const { data: maxTicketsRaw } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "MAX_TICKETS_PER_ROUND",
    query: { enabled: isDeployed },
  });

  const { data: usdcBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address && TOKEN_ADDRESS !== ZERO_ADDRESS, refetchInterval: 10000 },
  });

  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address!, LOTTERY_ADDRESS],
    query: {
      enabled: !!address && TOKEN_ADDRESS !== ZERO_ADDRESS && isDeployed,
      refetchInterval: 6000,
    },
  });

  const { data: userCredits, refetch: refetchCredits } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "credits",
    args: [address!],
    query: { enabled: !!address && isDeployed, refetchInterval: 8000 },
  });

  const { data: nextRoundPoolData } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "nextRoundPool",
    query: { enabled: isDeployed, refetchInterval: 8000 },
  });

  // ── Write contract ──────────────────────────────────────────────────────────
  const { writeContractAsync, isPending, data: txHash, reset: resetTx } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const { writeContractAsync: withdrawAsync, isPending: withdrawPending, data: withdrawHash, reset: resetWithdraw } = useWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawConfirmed } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // ── Derived state ───────────────────────────────────────────────────────────
  const ticketCount    = roundData?.ticketCount ?? 0n;
  const maxTickets     = maxTicketsRaw !== undefined ? Number(maxTicketsRaw) : 1000;
  const fillPct        = maxTickets > 0 ? Math.min(100, (Number(ticketCount) / maxTickets) * 100) : 0;
  const totalCost      = BigInt(cart.length) * TICKET_PRICE;
  const needsApproval  = isConnected && cart.length > 0 && usdcAllowance !== undefined && usdcAllowance < totalCost;
  const canAddToCart   = slots.every((s) => s !== null) && selectedKitti !== null;
  const settledCount   = currentRoundId !== undefined ? Number(currentRoundId) : 0;
  const viewRoundId    = settledCount > 0 ? BigInt(Math.max(0, settledCount - 1 - viewOffset)) : null;
  const rolledPool     = nextRoundPoolData ?? 0n;
  const currentPool    = ticketCount * TICKET_PRICE + rolledPool;
  const estJackpot     = currentPool / 2n; // 50% of pool

  // ── Handlers ────────────────────────────────────────────────────────────────
  // Positional pick: set the active ball/Kitti, then auto-advance to the next empty slot.
  const pickNumber = (n: number) => {
    if (activeSlot === 4) {
      setSelectedKitti(n);
      const firstEmpty = slots.findIndex((s) => s === null);
      if (firstEmpty !== -1) setActiveSlot(firstEmpty);
    } else {
      const next = [...slots];
      next[activeSlot] = n;
      setSlots(next);
      const nextEmpty = next.findIndex((s) => s === null);
      if (nextEmpty !== -1) setActiveSlot(nextEmpty);
      else if (selectedKitti === null) setActiveSlot(4);
    }
  };

  const clearTicket = () => {
    setSlots([null, null, null, null]);
    setSelectedKitti(null);
    setActiveSlot(0);
  };

  const addToCart = () => {
    if (!canAddToCart) return;
    if (cart.length >= MAX_TICKETS_PER_WALLET) return;
    setCart((c) => [...c, { main: slots as number[], kitti: selectedKitti! }]);
    clearTicket();
    resetTx();
  };

  const quickPick = () => {
    setSlots(Array.from({ length: 4 }, () => Math.floor(Math.random() * MAX_MAIN)));
    setSelectedKitti(Math.floor(Math.random() * MAX_KITTI));
    setActiveSlot(0);
  };

  // Smart pick: drop N distinct slips straight into the cart. Real added
  // coverage of the same fair draw — the honest way to shorten the odds.
  const smartPick = (n: number) => {
    setCart((c) => [...c, ...smartSpread(n)]);
    resetTx();
  };

  const handleApprove = async () => {
    await writeContractAsync({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [LOTTERY_ADDRESS, totalCost * 20n],
    });
    setTimeout(() => refetchAllowance(), 2000);
  };

  const handleBuy = async () => {
    if (!cart.length) return;
    await writeContractAsync({
      address: LOTTERY_ADDRESS,
      abi: lotteryAbi,
      functionName: "buyTickets",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: [cart.map((t) => t.main) as any, cart.map((t) => t.kitti)],
    });
    setCart([]);
    setTimeout(() => { refetchRoundId(); refetchRound(); }, 3000);
  };

  const handleWithdraw = async () => {
    await withdrawAsync({ address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "withdraw" });
    setTimeout(() => refetchCredits(), 3000);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Draw status strip ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0.6, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative overflow-hidden rounded-2xl border border-white/8 backdrop-blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(18,10,55,0.88) 0%, rgba(6,4,22,0.95) 100%)",
        }}
      >
        <div className="absolute inset-0 shimmer pointer-events-none" />
        {/* Subtle centre glow under jackpot */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 80% at 50% 50%, rgba(124,92,255,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative grid grid-cols-3 divide-x divide-white/8">

          {/* Column 1 — Round + tickets */}
          <div className="flex flex-col justify-center px-4 py-4 gap-px">
            <div className="text-[9px] uppercase tracking-widest text-indigo-300/38 font-semibold">
              Round #{currentRoundId?.toString() ?? "—"}
            </div>
            <div className="text-xl font-black text-white tabular-nums leading-tight">
              {ticketCount.toString()}
            </div>
            <div className="text-[9px] text-indigo-300/32 leading-none">
              tickets entered
            </div>
          </div>

          {/* Column 2 — Pool (primary) */}
          <div className="flex flex-col justify-center items-center px-3 py-4 gap-px">
            <div className="text-[9px] uppercase tracking-widest text-violet-300/40 font-semibold">
              Pool
            </div>
            <motion.div
              key={currentPool.toString()}
              initial={{ opacity: 0.6, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="gradient-text text-2xl sm:text-3xl font-black leading-tight tabular-nums"
            >
              ${formatToken(currentPool)}
            </motion.div>
            <div className="text-[9px] text-indigo-300/28 leading-none">
              USDC in the round
            </div>
          </div>

          {/* Column 3 — Countdown */}
          <div className="flex flex-col justify-center items-end px-4 py-4 gap-px">
            <div className="text-[9px] uppercase tracking-widest text-indigo-300/38 font-semibold">
              Next draw
            </div>
            <RoundTimer
              variant="compact"
              endTime={roundData?.endTime}
              className="text-xl font-black whitespace-nowrap"
            />
            <div className="text-[9px] text-indigo-300/28 leading-none">
              24h or when full
            </div>
          </div>

        </div>

        {/* Ticket-fill progress — fills to the cap → 15-min early draw */}
        <div className="relative border-t border-white/8 px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest">
            <span className="text-indigo-300/38 font-semibold">Round fill</span>
            <span className="tabular-nums text-indigo-300/45">
              {ticketCount.toString()} / {maxTickets.toLocaleString()}
              <span className="ml-1 text-indigo-300/28 normal-case tracking-normal">
                {fillPct >= 100 ? "· full — drawing soon" : "· full → 15-min draw"}
              </span>
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full neon-bar"
              animate={{ width: `${Math.max(fillPct, 1.5)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Not deployed warning */}
      {!isDeployed && (
        <div className="card-glass border border-amber-500/20 bg-amber-500/5 text-amber-300 text-sm text-center py-3">
          Contract not deployed — deploy first, then update{" "}
          <code className="text-amber-200">web/.env.local</code>
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="relative flex gap-1 rounded-2xl border border-white/8 bg-navy-800/60 p-1.5 backdrop-blur lg:max-w-md lg:mx-auto">
        {(["play", "tickets", "results"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors z-10"
            style={{
              color: tab === t ? "white" : "rgba(165,148,255,0.6)",
            }}
          >
            {tab === t && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(124,92,255,0.9) 0%, rgba(60,40,180,0.9) 100%)",
                  boxShadow: "0 4px 16px rgba(124,92,255,0.4)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              {t === "tickets" ? "My Tickets" : t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0.6, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={TAB_TRANS}
        >

          {/* ── PLAY ───────────────────────────────────────────────────────── */}
          {tab === "play" && (
            <div className="space-y-5 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start lg:space-y-0">

              {/* PRIMARY work column */}
              <div className="lg:col-span-8 lg:space-y-5 min-w-0">

              {/* Number picker */}
              <div className="card-glass space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-white tracking-tight">Pick your numbers</div>
                    <div className="text-xs text-indigo-300/40 mt-0.5">4 digits + 1 KITY letter · repeats ok · order matters</div>
                  </div>
                  <button
                    type="button"
                    onClick={clearTicket}
                    className="text-xs text-rose-400/60 hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {/* Ball slots — big, clickable, arcade-style */}
                <div className="grid grid-cols-5 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <SlotChip
                      key={i}
                      label={`B${i + 1}`}
                      value={slots[i]}
                      active={activeSlot === i}
                      variant="main"
                      onClick={() => setActiveSlot(i)}
                    />
                  ))}
                  <SlotChip
                    label="KITY"
                    value={selectedKitti}
                    active={activeSlot === 4}
                    variant="kitti"
                    onClick={() => setActiveSlot(4)}
                  />
                </div>

                {/* Active ball label */}
                <motion.div
                  key={activeSlot}
                  initial={{ opacity: 0.6, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <span
                    className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
                    style={{
                      background: activeSlot === 4 ? "rgba(245,158,11,0.12)" : "rgba(124,92,255,0.12)",
                      color: activeSlot === 4 ? "rgba(245,158,11,0.9)" : "rgba(124,92,255,0.9)",
                      border: `1px solid ${activeSlot === 4 ? "rgba(245,158,11,0.25)" : "rgba(124,92,255,0.25)"}`,
                    }}
                  >
                    {activeSlot === 4 ? "Pick your KITY letter (K · I · T · Y)" : `Pick a digit for Ball ${activeSlot + 1} (0–9)`}
                  </span>
                </motion.div>

                {/* Picker grid */}
                <div className={activeSlot === 4 ? "flex justify-center gap-4 sm:gap-6 py-2" : "grid grid-cols-5 gap-2 sm:grid-cols-10"}>
                  {Array.from({ length: activeSlot === 4 ? MAX_KITTI : MAX_MAIN }, (_, i) => (
                    <LotteryBall
                      key={i}
                      n={i}
                      label={activeSlot === 4 ? KITTI_LETTERS[i] : undefined}
                      selected={activeSlot === 4 ? selectedKitti === i : slots[activeSlot] === i}
                      onClick={() => pickNumber(i)}
                      variant={activeSlot === 4 ? "kitti" : "main"}
                      size={activeSlot === 4 ? "xl" : "lg"}
                    />
                  ))}
                </div>

                {/* Quick pick · Smart pick · Add */}
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button type="button" onClick={quickPick} className="btn btn-ghost flex-1 text-xs">
                      ⚡ Quick Pick
                    </button>
                    <button type="button" onClick={() => smartPick(5)} className="btn btn-ghost flex-1 text-xs">
                      ✨ Smart Pick ×5
                    </button>
                  </div>
                  {cart.length >= MAX_TICKETS_PER_WALLET ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-center text-xs text-amber-400 font-semibold">
                      Max {MAX_TICKETS_PER_WALLET} tickets per wallet per round
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={addToCart}
                      disabled={!canAddToCart}
                      whileHover={canAddToCart ? { scale: 1.02 } : undefined}
                      whileTap={canAddToCart ? { scale: 0.96 } : undefined}
                      className="btn btn-primary w-full text-base py-3 font-black"
                    >
                      {canAddToCart
                        ? `🎟 Add — ${slots.join(" · ")} + ${kittiLabel(selectedKitti)}`
                        : "Complete your ticket to add"}
                    </motion.button>
                  )}
                </div>
              </div>

              {/* How you win + the draw experience */}
              <div className="card-glass space-y-5">
                <PrizeMatchGuide />
                <div className="border-t border-white/5 pt-4">
                  <DrawReveal />
                </div>
              </div>

              </div>

              {/* STICKY rail — ticket slip + prize breakdown */}
              <div className="lg:col-span-4 lg:sticky lg:top-6 lg:self-start min-w-0 space-y-4">

              {/* ── Ticket slip ─────────────────────────────────────────────── */}
              <div className="card-glass overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <span className="text-sm font-bold text-indigo-100 flex items-center gap-2">
                    Your Slip
                    <AnimatePresence>
                      {cart.length > 0 && (
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="rounded-full text-white text-[10px] font-black px-2 py-0.5 tabular-nums"
                          style={{ background: "rgba(124,92,255,1)", boxShadow: "0 0 12px rgba(124,92,255,0.5)" }}
                        >
                          {cart.length}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-[11px] text-rose-400/50 hover:text-rose-400 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {cart.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pb-8 pt-2 text-center"
                    >
                      <div className="text-4xl mb-2.5">🎟️</div>
                      <div className="text-sm text-indigo-300/25 font-medium">
                        Pick your numbers and add to slip
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="filled"
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Scrollable ticket stack */}
                      <div
                        className="px-3 space-y-2 overflow-y-auto"
                        style={{ maxHeight: 344, scrollbarWidth: "none" }}
                      >
                        <AnimatePresence initial={false}>
                          {cart.map((t, i) => (
                            <TicketCard
                              key={i}
                              ticket={t}
                              index={i}
                              onRemove={() => setCart((c) => c.filter((_, j) => j !== i))}
                            />
                          ))}
                        </AnimatePresence>
                      </div>

                      {/* Footer: odds + total + CTA */}
                      <div className="border-t border-white/8 mt-3 px-5 pt-4 pb-5 space-y-3">
                        {/* Combined odds + boost */}
                        <OddsBoost tickets={cart.length} onSmartPick={smartPick} />

                        <div className="border-t border-white/6" />

                        {/* Total */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-indigo-300/50">
                            {cart.length} ticket{cart.length !== 1 ? "s" : ""} × $2 USDC
                          </span>
                          <span className="text-xl font-black text-white">
                            ${formatToken(totalCost)}
                          </span>
                        </div>

                        {address && usdcBalance !== undefined && (
                          <div className="text-[10px] text-indigo-300/30">
                            Wallet: ${formatToken(usdcBalance)} USDC
                          </div>
                        )}

                        {/* CTA */}
                        {!isConnected ? (
                          <p className="text-center text-sm text-indigo-300/40 py-1">
                            Connect wallet to enter
                          </p>
                        ) : needsApproval ? (
                          <motion.button
                            type="button"
                            onClick={handleApprove}
                            disabled={isPending || confirming}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn btn-primary w-full"
                          >
                            {isPending || confirming ? "Approving…" : "Approve USDC"}
                          </motion.button>
                        ) : (
                          <motion.button
                            type="button"
                            onClick={handleBuy}
                            disabled={isPending || confirming || !isDeployed}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn btn-cta w-full text-base font-black py-3.5"
                          >
                            {isPending || confirming
                              ? "Buying…"
                              : `Enter draw — $${formatToken(totalCost)}`}
                          </motion.button>
                        )}

                        <AnimatePresence>
                          {confirmed && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="text-center text-sm text-emerald-400 font-semibold"
                            >
                              ✓ You&apos;re in! Check Results after the draw.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Prize breakdown with estimated amounts */}
              <div className="card-glass">
                <EstPrizePanel ticketCount={ticketCount} nextRoundPool={rolledPool} />
              </div>

              </div>
            </div>
          )}

          {/* ── MY TICKETS ──────────────────────────────────────────────────── */}
          {tab === "tickets" && (
            <div className="space-y-4">
              {!isConnected ? (
                <div className="card-glass py-16 text-center">
                  <div className="text-4xl mb-4">🎫</div>
                  <div className="text-indigo-300/50">Connect your wallet to view tickets</div>
                </div>
              ) : (
                <>
                  {/* Prize credit withdraw */}
                  <div className="card-glass space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-indigo-100">Prize Credits</div>
                      {userCredits !== undefined && userCredits > 0n && (
                        <span className="pill text-[10px] !px-2 !py-0.5">
                          <span className="pill-dot" /> Claimable
                        </span>
                      )}
                    </div>
                    {userCredits === undefined ? (
                      <div className="text-xs text-indigo-300/40">Loading…</div>
                    ) : userCredits === 0n ? (
                      <div className="text-xs text-indigo-300/40">No unclaimed prizes yet — enter the draw!</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="gradient-text text-2xl font-black">${formatToken(userCredits)} USDC</div>
                        <div className="text-xs text-indigo-300/50">Credited on-chain — withdraw within 30 days to avoid expiry.</div>
                        <button
                          type="button"
                          onClick={handleWithdraw}
                          disabled={withdrawPending || withdrawConfirming}
                          className="btn-cta w-full"
                        >
                          {withdrawPending || withdrawConfirming ? "Withdrawing…" : "Withdraw to wallet"}
                        </button>
                        {withdrawConfirmed && (
                          <div className="text-center text-sm text-emerald-400 font-semibold pt-1">
                            ✓ Withdrawn! Check your wallet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">

                  {/* LEFT: ticket form */}
                  <div className="lg:col-span-7 space-y-4 min-w-0">

                  {/* Ticket lookup */}
                  <div className="card-glass space-y-4">
                    <div className="font-semibold text-indigo-100">Check a Ticket</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Round #</label>
                        <input
                          type="number" min="0"
                          value={lookupRound}
                          onChange={(e) => setLookupRound(e.target.value)}
                          placeholder="0"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Ticket index</label>
                        <input
                          type="number" min="0"
                          value={lookupTicket}
                          onChange={(e) => setLookupTicket(e.target.value)}
                          placeholder="0"
                          className="input"
                        />
                      </div>
                    </div>
                    <TicketChecker
                      roundId={lookupRound !== "" ? BigInt(lookupRound) : undefined}
                      ticketIdx={lookupTicket !== "" ? BigInt(lookupTicket) : undefined}
                      userAddress={address}
                    />
                  </div>

                  </div>

                  {/* RIGHT: help card sticky rail */}
                  <div className="lg:col-span-5 lg:sticky lg:top-6 lg:self-start space-y-4 min-w-0">
                  <div className="card-glass text-xs text-indigo-300/40 space-y-3">
                    <div className="font-semibold text-indigo-300/70">Finding your ticket index</div>
                    <div className="space-y-2">
                      <p>Each ticket has a global index across all rounds. To find yours:</p>
                      <ol className="list-decimal list-inside space-y-1.5 pl-1">
                        <li>Open your wallet → tap the buy transaction</li>
                        <li>View it on Basescan → click <span className="text-indigo-300/65 font-semibold">Logs</span></li>
                        <li>Find the <span className="text-indigo-300/65 font-semibold">TicketBought</span> event</li>
                        <li>The <span className="text-indigo-300/65 font-semibold">ticketIdx</span> value is your index</li>
                      </ol>
                    </div>
                    <div className="border-t border-white/5 pt-2">
                      After a round settles, <span className="text-emerald-400/70 font-semibold">Claim</span> your winning ticket in the checker below (the Lucky Wallet prize is auto-credited), then hit <span className="text-emerald-400/70 font-semibold">Withdraw</span> above.
                    </div>
                  </div>
                  </div>

                  </div>
                </>
              )}
            </div>
          )}

          {/* ── RESULTS ─────────────────────────────────────────────────────── */}
          {tab === "results" && (
            <div className="space-y-5 lg:mx-auto lg:max-w-3xl xl:max-w-5xl">
              {settledCount === 0 ? (
                <div className="card-glass py-16 text-center">
                  <div className="text-4xl mb-4 animate-float">🎰</div>
                  <div className="text-indigo-300/50">No rounds settled yet. Be first!</div>
                </div>
              ) : (
                <>
                  {/* Round navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setViewOffset((o) => Math.min(o + 1, settledCount - 1))}
                      disabled={viewOffset >= settledCount - 1}
                      className="btn btn-ghost px-3 py-2 text-xs disabled:opacity-30"
                    >
                      ← Older
                    </button>
                    <span className="text-xs text-indigo-300/50 font-medium">
                      Round {viewRoundId?.toString()} / {settledCount - 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewOffset((o) => Math.max(o - 1, 0))}
                      disabled={viewOffset === 0}
                      className="btn btn-ghost px-3 py-2 text-xs disabled:opacity-30"
                    >
                      Newer →
                    </button>
                  </div>

                  <div className="xl:grid xl:grid-cols-2 xl:gap-6 xl:items-start space-y-5 xl:space-y-0">
                    {viewRoundId !== null && (
                      <RoundCard roundId={viewRoundId} userAddress={address} />
                    )}

                    {/* Rollover into the next draw */}
                    <div className="card-glass space-y-4 py-6 text-center">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="text-3xl"
                      >
                        🔁
                      </motion.div>
                      <div className="gradient-text text-2xl font-black">Rolling jackpot</div>
                      <div className="text-sm font-semibold text-indigo-100">Seeds the next draw</div>
                      <p className="mx-auto max-w-xs text-xs leading-relaxed text-indigo-300/50">
                        Any prize no one won — plus 10% of every round — seeds the next draw.
                        The jackpot keeps growing until someone takes it.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Slot chip — arcade-style ball showing chosen number ──────────────────────
function SlotChip({
  label,
  value,
  active,
  variant,
  onClick,
}: {
  label: string;
  value: number | null;
  active: boolean;
  variant: "main" | "kitti";
  onClick: () => void;
}) {
  const filled  = value !== null;
  const isKitti = variant === "kitti";
  const accent  = isKitti ? "245,158,11" : "124,92,255";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      className="flex flex-col items-center gap-2"
    >
      <span
        className="text-[9px] font-bold uppercase tracking-widest transition-colors"
        style={{ color: active ? `rgb(${accent})` : "rgba(165,148,255,0.35)" }}
      >
        {label}
      </span>
      <motion.div
        animate={
          active
            ? {
                boxShadow: [
                  `0 0 0px rgba(${accent},0)`,
                  `0 0 22px rgba(${accent},0.85)`,
                  `0 0 0px rgba(${accent},0)`,
                ],
              }
            : { boxShadow: "none" }
        }
        transition={{ duration: 1.4, repeat: Infinity }}
        className="grid place-items-center rounded-full font-black"
        style={{
          width: 52,
          height: 52,
          fontSize: 18,
          background: filled
            ? isKitti
              ? "radial-gradient(circle at 35% 30%, rgba(245,200,50,1) 0%, rgba(180,100,5,1) 80%)"
              : `radial-gradient(circle at 35% 30%, rgba(${accent},1) 0%, rgba(60,35,180,1) 80%)`
            : `radial-gradient(circle at 35% 30%, rgba(${accent},0.12) 0%, rgba(15,21,53,0.92) 70%)`,
          border: `2px ${active ? "solid" : "dashed"} rgba(${accent},${active ? 0.75 : filled ? 0.5 : 0.2})`,
          color: filled ? (isKitti ? "#1a0a00" : "white") : `rgba(${accent},0.35)`,
        }}
      >
        {filled ? (isKitti ? kittiLabel(value) : value) : "?"}
      </motion.div>
    </motion.button>
  );
}

// ── Ticket card — visual lottery-ticket style slip ────────────────────────────
function TicketCard({
  ticket,
  index,
  onRemove,
}: {
  ticket: Draft;
  index: number;
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -18, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 18, height: 0 }}
      transition={SLIP_TRANS}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(18,12,58,0.94) 0%, rgba(8,5,32,0.97) 100%)",
        border: "1px solid rgba(124,92,255,0.22)",
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
        style={{
          background:
            "linear-gradient(to bottom, rgba(124,92,255,1) 0%, rgba(56,30,180,1) 100%)",
        }}
      />

      {/* Subtle dot texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "9px 9px",
        }}
      />

      <div className="relative pl-5 pr-3 py-2.5">
        {/* Top row: brand + ticket # + remove */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-black uppercase tracking-[0.28em] text-violet-400/45">
            KITY
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-mono text-indigo-300/18">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="text-rose-400/35 hover:text-rose-400 text-base leading-none transition-colors"
              aria-label="Remove ticket"
            >
              ×
            </button>
          </div>
        </div>

        {/* Number balls row */}
        <div className="flex items-center gap-1.5">
          {ticket.main.map((n, i) => (
            <MiniBall key={i} value={n} />
          ))}
          <div className="mx-1 h-4 w-px bg-white/12" />
          <MiniBall value={ticket.kitti} variant="kitti" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Mini ball — compact lottery ball for ticket cards ─────────────────────────
function MiniBall({
  value,
  variant = "main",
}: {
  value: number;
  variant?: "main" | "kitti";
}) {
  const isKitti = variant === "kitti";
  return (
    <div
      className="grid place-items-center rounded-full font-black text-[10px] select-none flex-shrink-0"
      style={{
        width: 26,
        height: 26,
        background: isKitti
          ? "radial-gradient(circle at 35% 30%, rgba(252,210,60,1) 0%, rgba(178,90,5,1) 80%)"
          : "radial-gradient(circle at 35% 30%, rgba(140,100,255,1) 0%, rgba(58,32,180,1) 80%)",
        color: isKitti ? "#1a0800" : "white",
        boxShadow: isKitti
          ? "0 0 7px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.22)"
          : "0 0 7px rgba(124,92,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {isKitti ? kittiLabel(value) : value}
    </div>
  );
}
