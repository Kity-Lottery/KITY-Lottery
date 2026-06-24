"use client";

import { useReadContract } from "wagmi";
import { lotteryAbi } from "@/lib/lotteryAbi";
import { LOTTERY_ADDRESS } from "@/lib/contracts";
import { formatToken } from "@/lib/format";
import { kittiLabel } from "@/lib/odds";

// Status enum: 0=Open 1=Drawing 2=Drawn(settling) 3=Settled
const STATUS_LABEL = ["Open", "Drawing", "Settling", "Settled"];
const STATUS_STYLE = [
  "bg-accent/20 text-accent-soft",
  "bg-amber-500/20 text-amber-400",
  "bg-amber-500/20 text-amber-400",
  "bg-emerald-500/20 text-emerald-400",
];

export function RoundCard({
  roundId,
  userAddress,
}: {
  roundId: bigint;
  userAddress?: string;
}) {
  const { data: round, isLoading } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "getRound",
    args: [roundId],
  });

  const { data: isLucky } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "isLuckyWallet",
    args: [roundId, userAddress as `0x${string}`],
    query: { enabled: !!userAddress && round?.status === 3 },
  });

  if (isLoading || !round) {
    return (
      <div className="card text-sm text-indigo-300/50">
        Loading round #{roundId.toString()}…
      </div>
    );
  }

  const isSettled = round.status === 3;
  // v2: pool is stored on the Round (includes rolled-in amounts)
  const pool = round.pool > 0n ? round.pool : round.ticketCount * 2_000_000n;
  const jackpotEst = (pool * 50n) / 100n;
  const luckyEst   = (pool * 10n) / 100n;
  const rollEst    = round.rolledToNext > 0n ? round.rolledToNext : (pool * 10n) / 100n;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-indigo-100">
          Round #{roundId.toString()}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[round.status]}`}
        >
          {STATUS_LABEL[round.status]}
        </span>
      </div>

      <div className="text-sm text-indigo-300">
        Tickets sold: {round.ticketCount.toString()}
        <span className="ml-2 text-indigo-300/50">
          (pool: ${formatToken(pool)})
        </span>
      </div>

      {!isSettled && (
        <div className="text-sm text-indigo-300/50">
          Est. jackpot: ${formatToken(jackpotEst)} if drawn now
        </div>
      )}

      {isSettled && (
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-indigo-300">Winning numbers: </span>
            <span className="font-bold text-white">
              {Array.from(round.winningMain).join(" · ")}
            </span>
            <span className="text-amber-400"> {kittiLabel(Number(round.winningKitti))}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-indigo-300/70">
            <span>Jackpot pool (50 %)</span>
            <span>${formatToken(jackpotEst)}</span>
            <span>Lucky Wallet pool (10 %)</span>
            <span>${formatToken(luckyEst)}</span>
            <span>Rolled to next draw</span>
            <span>${formatToken(rollEst)}</span>
          </div>

          <div className="text-[10px] text-indigo-300/40">
            Prize credits appear in My Tickets → Prize Credits.
          </div>

          {isLucky && userAddress && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400 font-semibold">
              ★ You are the Lucky Wallet winner for this round!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
