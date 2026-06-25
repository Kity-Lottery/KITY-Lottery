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
        <div className="space-y-3">
          {/* Winning numbers as chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300/40">Winning numbers</div>
            <div className="flex items-center gap-1.5">
              {Array.from(round.winningMain).map((d, i) => (
                <span key={i} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-base font-black text-white">
                  {Number(d)}
                </span>
              ))}
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/25 text-base font-black text-amber-300">
                {kittiLabel(Number(round.winningKitti))}
              </span>
            </div>
          </div>

          {/* Winner summary */}
          <div className="flex flex-wrap gap-2">
            <WinChip icon="🏆" label="Jackpot" n={Number(round.jWin)} />
            <WinChip icon="🥈" label="2nd" n={Number(round.p2Win)} />
            <WinChip icon="🥉" label="3rd" n={Number(round.p3Win)} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 border-t border-white/5 pt-2 text-xs text-indigo-300/70">
            <span>Pool</span>
            <span>${formatToken(pool)}</span>
            <span>Rolled to next draw</span>
            <span>${formatToken(round.rolledToNext)}</span>
          </div>

          {isLucky && userAddress && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400 font-semibold">
              ★ You won the Lucky Wallet this round — withdraw it in My Tickets.
            </div>
          )}

          <div className="text-[10px] text-indigo-300/40">
            Your per-ticket results &amp; claims are in the <span className="text-indigo-300/60">My Tickets</span> tab.
          </div>
        </div>
      )}
    </div>
  );
}

function WinChip({ icon, label, n }: { icon: string; label: string; n: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
        n > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-indigo-300/40"
      }`}
    >
      {icon} {label}: <strong>{n}</strong>
    </span>
  );
}
