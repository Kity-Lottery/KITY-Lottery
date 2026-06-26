import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { lotteryAbi } from "@/lib/lotteryAbi";
import { LOTTERY_ADDRESS } from "@/lib/contracts";

// Max time to wait for a single tx receipt on Base (~2 s block time).
const TX_TIMEOUT = 30_000;
const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const cronSecret   = process.env.CRON_SECRET;    // injected by Vercel for cron calls
  const keeperSecret = process.env.KEEPER_SECRET;  // set manually for cron-job.org / curl
  if (!cronSecret && !keeperSecret) return true;   // no guard configured → open (dev)
  if (cronSecret   && auth === `Bearer ${cronSecret}`)   return true;
  if (keeperSecret && auth === `Bearer ${keeperSecret}`) return true;
  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawKey = process.env.KEEPER_PRIVATE_KEY;
  if (!rawKey) {
    return NextResponse.json({ error: "KEEPER_PRIVATE_KEY not set" }, { status: 500 });
  }
  const key = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

  const log: string[] = [];
  try {
    const account = privateKeyToAccount(key);
    const transport = http(RPC_URL);
    const pub = createPublicClient({ chain: base, transport });
    const wal = createWalletClient({ account, chain: base, transport });

    log.push(`keeper ${account.address}`);

    // ── 1. Settle a round whose randomness arrived (Drawn → Settled) ──────────
    const settleDue = await pub.readContract({
      address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "settleDue",
    }) as boolean;

    if (settleDue) {
      log.push("settleDue=true → settle(1000)");
      const hash = await wal.writeContract({
        address: LOTTERY_ADDRESS, abi: lotteryAbi,
        functionName: "settle", args: [1000n],
      });
      const receipt = await pub.waitForTransactionReceipt({ hash, timeout: TX_TIMEOUT });
      log.push(`  settled tx=${hash} status=${receipt.status}`);
    } else {
      log.push("settleDue=false");
    }

    // ── 2. Trigger draw when the round timer has elapsed ──────────────────────
    const drawDue = await pub.readContract({
      address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "drawDue",
    }) as boolean;

    if (drawDue) {
      log.push("drawDue=true → triggerDraw()");
      const hash = await wal.writeContract({
        address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "triggerDraw",
      });
      const receipt = await pub.waitForTransactionReceipt({ hash, timeout: TX_TIMEOUT });
      log.push(`  draw requested tx=${hash} status=${receipt.status}`);
    } else {
      log.push("drawDue=false");
    }

    // ── 3. Roll an empty round forward when its timer expires ─────────────────
    // With 0 tickets drawDue() returns false, so triggerDraw() simply extends
    // the round by ROUND_DURATION rather than requesting randomness.
    const currentRound = await pub.readContract({
      address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "currentRound",
    }) as bigint;

    const round = await pub.readContract({
      address: LOTTERY_ADDRESS, abi: lotteryAbi,
      functionName: "getRound", args: [currentRound],
    }) as { status: number; ticketCount: bigint; endTime: bigint };

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    if (Number(round.status) === 0 && round.ticketCount === 0n && nowSec >= round.endTime) {
      log.push("empty round past endTime → triggerDraw() to roll timer forward");
      const hash = await wal.writeContract({
        address: LOTTERY_ADDRESS, abi: lotteryAbi, functionName: "triggerDraw",
      });
      const receipt = await pub.waitForTransactionReceipt({ hash, timeout: TX_TIMEOUT });
      log.push(`  rolled forward tx=${hash} status=${receipt.status}`);
    } else {
      log.push("rollForward=not needed");
    }

    log.push("done");
    return NextResponse.json({ ok: true, log });
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; message?: string };
    const msg = err.shortMessage ?? err.message ?? String(e);
    console.error("[keeper]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Allow Vercel cron to call via POST as well (some schedulers prefer POST)
export const GET_alias = GET;
export async function POST(req: Request) { return GET(req); }
