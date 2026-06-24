"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { lotteryAbi } from "@/lib/lotteryAbi";
import { LOTTERY_ADDRESS } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";
import { kittiLabel } from "@/lib/odds";

const TIER_LABELS = ["", "JACKPOT", "2nd Prize", "3rd Prize"];

export function TicketChecker({
  roundId,
  ticketIdx,
  userAddress,
}: {
  roundId: bigint | undefined;
  ticketIdx: bigint | undefined;
  userAddress?: string;
}) {
  const enabled =
    roundId !== undefined &&
    ticketIdx !== undefined &&
    LOTTERY_ADDRESS !== "0x0000000000000000000000000000000000000000";

  const { data: ticket, isLoading: tLoading } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "getTicket",
    args: [ticketIdx ?? 0n],
    query: { enabled },
  });

  const { data: check, isLoading: cLoading } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "checkTicket",
    args: [roundId ?? 0n, ticketIdx ?? 0n],
    query: { enabled },
  });

  const { data: isLucky } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "isLuckyWallet",
    args: [roundId ?? 0n, userAddress as `0x${string}`],
    query: { enabled: enabled && !!userAddress },
  });

  const tier = (check ?? 0) as number;

  const { data: claimed, refetch: refetchClaimed } = useReadContract({
    address: LOTTERY_ADDRESS,
    abi: lotteryAbi,
    functionName: "prizeClaimed",
    args: [roundId ?? 0n, ticketIdx ?? 0n],
    query: { enabled: enabled && tier > 0 },
  });

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Refresh claimed state once the claim confirms.
  if (confirmed && claimed === false) refetchClaimed();

  if (!enabled) return null;
  if (tLoading || cLoading) {
    return <div className="text-xs text-indigo-300/50 py-2">Loading ticket…</div>;
  }
  if (!ticket) {
    return (
      <div className="text-xs text-rose-400/70 py-2">
        Ticket not found (index may not exist yet).
      </div>
    );
  }

  const isOwner =
    userAddress && ticket.buyer.toLowerCase() === userAddress.toLowerCase();
  const isClaimed = claimed === true || confirmed;

  function claim() {
    if (roundId === undefined || ticketIdx === undefined) return;
    writeContract({
      address: LOTTERY_ADDRESS,
      abi: lotteryAbi,
      functionName: "claimPrize",
      args: [roundId, ticketIdx],
    });
  }

  return (
    <div className="rounded-xl bg-navy-800/60 p-3 space-y-2 text-sm">
      <div>
        Numbers:{" "}
        <span className="font-bold text-white">
          {Array.from(ticket.mainNumbers).join(" · ")}
        </span>
        <span className="text-amber-400"> {kittiLabel(Number(ticket.kittiNumber))}</span>
      </div>
      <div className="text-xs text-indigo-300/50">
        Buyer: {shortAddress(ticket.buyer)}
        {isOwner ? " (you)" : ""}
      </div>

      {tier > 0 ? (
        <div className="space-y-2">
          <div className="font-bold text-emerald-400">
            {tier === 1 ? "🏆" : tier === 2 ? "🥈" : "🥉"} {TIER_LABELS[tier]}!
          </div>

          {isClaimed ? (
            <div className="text-xs text-emerald-300/80">
              ✓ Prize claimed — withdraw your USDC in My Tickets → Prize Credits.
            </div>
          ) : (
            <>
              <button
                onClick={claim}
                disabled={isPending || confirming}
                className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-3 py-2 text-sm font-semibold text-navy-900 transition"
              >
                {isPending
                  ? "Confirm in wallet…"
                  : confirming
                  ? "Claiming…"
                  : `Claim ${TIER_LABELS[tier]}`}
              </button>
              <div className="text-[10px] text-indigo-300/40">
                Claiming credits your wallet; then Withdraw to receive USDC. Anyone can
                claim a winning ticket — funds always go to the buyer.
              </div>
            </>
          )}
          {error && (
            <div className="text-xs text-rose-400/80">
              {error.message.includes("AlreadyClaimed")
                ? "Already claimed."
                : "Claim failed — try again."}
            </div>
          )}
        </div>
      ) : (
        <div className="text-indigo-300/50">No prize match for this ticket.</div>
      )}

      {isLucky && isOwner && (
        <div className="text-amber-400 font-semibold text-xs">
          ★ Your wallet is the Lucky Wallet for round #{roundId!.toString()} — the 10%
          prize is auto-credited; just Withdraw.
        </div>
      )}
    </div>
  );
}
