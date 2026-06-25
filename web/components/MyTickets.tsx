"use client";

import { useEffect, useState, useCallback } from "react";
import {
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { lotteryAbi } from "@/lib/lotteryAbi";
import { LOTTERY_ADDRESS, DEFAULT_CHAIN_ID } from "@/lib/contracts";
import { kittiLabel } from "@/lib/odds";
import { formatToken } from "@/lib/format";

type Row = {
  round: number;
  idx: number;
  main: number[];
  kitti: number;
  settled: boolean;
  winMain?: number[];
  winKitti?: number;
  tier: number; // 0 none · 1 jackpot · 2 second · 3 third
  lucky: boolean;
  claimed: boolean;
  prize: bigint;
};

const TARGET = DEFAULT_CHAIN_ID as 8453 | 84532;

const TIER = {
  1: { label: "Jackpot", icon: "🏆", cls: "text-violet-300" },
  2: { label: "2nd Prize", icon: "🥈", cls: "text-sky-300" },
  3: { label: "3rd Prize", icon: "🥉", cls: "text-emerald-300" },
} as const;

// Mirrors KittiLottery._checkMatch (positional).
function matchTier(main: number[], kitti: number, win: number[], winKitti: number): number {
  let m = 0;
  for (let i = 0; i < 4; i++) if (main[i] === win[i]) m++;
  if (m === 4 && kitti === winKitti) return 1;
  if (m === 4) return 2;
  if (m === 3) return 3;
  return 0;
}

function Digits({ main, kitti }: { main: number[]; kitti: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {main.map((d, i) => (
        <span
          key={i}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-black text-indigo-100"
        >
          {d}
        </span>
      ))}
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-sm font-black text-amber-300">
        {kittiLabel(kitti)}
      </span>
    </div>
  );
}

export function MyTickets({ userAddress }: { userAddress?: string }) {
  const client = usePublicClient({ chainId: TARGET });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: claiming } = useWaitForTransactionReceipt({ hash: txHash });

  const load = useCallback(async () => {
    if (!client || !userAddress) return;
    setLoading(true);
    setError(false);
    try {
      const [totalTickets, currentRound] = (await Promise.all([
        client.readContract({ address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "totalTickets" }),
        client.readContract({ address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "currentRound" }),
      ])) as [bigint, bigint];

      const N = Number(totalTickets);
      const R = Number(currentRound);
      if (N === 0) { setRows([]); return; }

      // Pure eth_call multicalls (no log-range limits) — scan tickets + rounds.
      const ticketRes = (await client.multicall({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contracts: Array.from({ length: N }, (_, i) => ({
          address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "getTicket", args: [BigInt(i)],
        })) as any,
        allowFailure: true,
      })) as { status: string; result?: any }[]; // eslint-disable-line @typescript-eslint/no-explicit-any

      const roundRes = (await client.multicall({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contracts: Array.from({ length: R + 1 }, (_, r) => ({
          address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "getRound", args: [BigInt(r)],
        })) as any,
        allowFailure: true,
      })) as { status: string; result?: any }[]; // eslint-disable-line @typescript-eslint/no-explicit-any

      const rounds = roundRes.map((x) => (x.status === "success" ? x.result : null));

      const ridForIdx = (idx: number) => {
        for (let r = 0; r <= R; r++) {
          const rd = rounds[r];
          if (!rd) continue;
          const st = Number(rd.startTicket);
          const ct = Number(rd.ticketCount);
          if (idx >= st && idx < st + ct) return r;
        }
        return R;
      };

      const mine: { idx: number; round: number; main: number[]; kitti: number; rd: any }[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
      for (let i = 0; i < N; i++) {
        const t = ticketRes[i];
        if (t.status !== "success" || !t.result) continue;
        if ((t.result.buyer as string).toLowerCase() !== userAddress.toLowerCase()) continue;
        const round = ridForIdx(i);
        mine.push({
          idx: i,
          round,
          main: Array.from(t.result.mainNumbers as number[]).map(Number),
          kitti: Number(t.result.kittiNumber),
          rd: rounds[round],
        });
      }

      // Claimed status for settled tickets.
      const claimKeys = mine.filter((x) => x.rd && Number(x.rd.status) === 3);
      const claimMap = new Map<string, boolean>();
      if (claimKeys.length) {
        const cr = (await client.multicall({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contracts: claimKeys.map((x) => ({
            address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "prizeClaimed", args: [BigInt(x.round), BigInt(x.idx)],
          })) as any,
          allowFailure: true,
        })) as { status: string; result?: boolean }[];
        cr.forEach((res, i) => {
          if (res.status === "success") claimMap.set(`${claimKeys[i].round}-${claimKeys[i].idx}`, Boolean(res.result));
        });
      }

      const out: Row[] = mine
        .map((x) => {
          const rd = x.rd;
          const settled = rd && Number(rd.status) === 3;
          const winMain = rd ? Array.from(rd.winningMain as number[]).map(Number) : undefined;
          const winKitti = rd ? Number(rd.winningKitti) : undefined;
          const tier = settled ? matchTier(x.main, x.kitti, winMain!, winKitti!) : 0;
          const lucky = rd ? Number(rd.luckyTicket) === x.idx : false;
          const prize = settled && tier > 0 ? (tier === 1 ? rd.jpp : tier === 2 ? rd.p2pp : rd.p3pp) : 0n;
          return { round: x.round, idx: x.idx, main: x.main, kitti: x.kitti, settled, winMain, winKitti, tier, lucky, claimed: claimMap.get(`${x.round}-${x.idx}`) ?? false, prize };
        })
        .reverse(); // newest first

      setRows(out);
    } catch (e) {
      console.error("MyTickets load", e);
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [client, userAddress]);

  useEffect(() => { load(); }, [load]);

  async function claim(round: number, idx: number) {
    try {
      await writeContractAsync({
        chainId: TARGET,
        address: LOTTERY_ADDRESS,
        abi: lotteryAbi,
        functionName: "claimPrize",
        args: [BigInt(round), BigInt(idx)],
      });
      setTimeout(load, 3500);
    } catch { /* user rejected / revert — surfaced by wallet */ }
  }

  if (!userAddress) return null;

  return (
    <div className="card-glass space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-indigo-100">Your Tickets</div>
        <button onClick={load} disabled={loading} className="text-xs text-indigo-300/50 transition hover:text-indigo-200 disabled:opacity-40">
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {rows === null ? (
        <div className="py-6 text-center text-xs text-indigo-300/40">Loading your tickets…</div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-rose-400/70">Couldn&apos;t load tickets — tap Refresh.</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-indigo-300/40">
          No tickets yet — head to the <span className="text-indigo-200">Play</span> tab to enter the draw.
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((t) => (
            <div key={`${t.round}-${t.idx}`} className="space-y-2 rounded-xl border border-white/5 bg-navy-800/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300/40">
                  Round {t.round} · ticket #{t.idx}
                </span>
                {!t.settled ? (
                  <span className="pill text-[10px] !px-2 !py-0.5"><span className="pill-dot" /> In the draw</span>
                ) : t.tier > 0 ? (
                  <span className={`text-xs font-bold ${TIER[t.tier as 1 | 2 | 3].cls}`}>
                    {TIER[t.tier as 1 | 2 | 3].icon} {TIER[t.tier as 1 | 2 | 3].label}
                  </span>
                ) : t.lucky ? (
                  <span className="text-xs font-bold text-amber-300">🍀 Lucky Wallet</span>
                ) : (
                  <span className="text-xs text-indigo-300/40">No match</span>
                )}
              </div>

              <Digits main={t.main} kitti={t.kitti} />

              {t.settled && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-300/40">
                    Drawn:
                    <span className="font-semibold text-indigo-200">
                      {t.winMain?.join("-")} + {kittiLabel(t.winKitti)}
                    </span>
                  </div>
                  {t.tier > 0 ? (
                    t.claimed ? (
                      <span className="text-[11px] font-semibold text-emerald-300/80">✓ Claimed ${formatToken(t.prize)}</span>
                    ) : (
                      <button
                        onClick={() => claim(t.round, t.idx)}
                        disabled={isPending || claiming}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-navy-900 transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {isPending || claiming ? "Claiming…" : `Claim $${formatToken(t.prize)}`}
                      </button>
                    )
                  ) : t.lucky ? (
                    <span className="text-[11px] text-amber-300/80">Auto-credited — withdraw above</span>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-indigo-300/30">
        Tier prizes (jackpot / 2nd / 3rd) are claimed per winning ticket, then withdrawn above. The Lucky Wallet prize is auto-credited.
      </p>
    </div>
  );
}
