/* eslint-disable no-console */
/**
 * KITY keeper — settles any drawn round and triggers any due draw.
 *
 * Permissionless: it only calls triggerDraw() / settle(), which anyone may call.
 * Pyth Entropy auto-fulfills the randomness request between runs, so a later run
 * picks up the settle. Runs on a schedule (see .github/workflows/keeper.yml).
 *
 * Env:
 *   KEEPER_PRIVATE_KEY  funded keeper EOA (gas only — NOT the owner key)
 *   LOTTERY_ADDRESS     defaults to the deployed mainnet contract
 *   BASE_RPC_URL        defaults to the public Base RPC
 */
const { ethers } = require("ethers");

const RPC      = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const LOTTERY  = process.env.LOTTERY_ADDRESS || "0x7AB998E1f73229f0Cf016e8811e9a88eFE8Ee0c5";
const KEY      = process.env.KEEPER_PRIVATE_KEY;

const ABI = [
  "function drawDue() view returns (bool)",
  "function settleDue() view returns (bool)",
  "function triggerDraw() payable",
  "function settle(uint256 maxTickets)",
  "function currentRound() view returns (uint256)",
  "function nextRoundToSettle() view returns (uint256)",
  "function getRound(uint256) view returns (tuple(uint256 startTicket,uint256 ticketCount,uint256 endTime,uint256 drawRequestedAt,uint8[4] winningMain,uint8 winningKitti,uint256 luckyTicket,uint8 status,uint256 settledAt,uint256 pool,uint256 rolledToNext,uint64 entropySeq,uint256 randomWord,uint256 scanCursor,uint256 jWin,uint256 p2Win,uint256 p3Win,uint256 jpp,uint256 p2pp,uint256 p3pp))",
];

async function main() {
  if (!KEY) throw new Error("KEEPER_PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(KEY, provider);
  const c        = new ethers.Contract(LOTTERY, ABI, wallet);

  const [round, toSettle, bal] = await Promise.all([
    c.currentRound(), c.nextRoundToSettle(), provider.getBalance(wallet.address),
  ]);
  console.log(`keeper ${wallet.address}  bal ${ethers.formatEther(bal)} ETH`);
  console.log(`currentRound=${round}  nextRoundToSettle=${toSettle}`);

  // 1) Settle a round whose randomness has arrived (Drawn → Settled). Batched at
  //    1000 = MAX_TICKETS_PER_ROUND so a full round finishes in one call.
  if (await c.settleDue()) {
    console.log("settleDue=true → settle(1000)");
    const tx = await c.settle(1000n);
    console.log(`  ${tx.hash}`);
    await tx.wait();
    console.log("  settled");
  } else {
    console.log("settleDue=false");
  }

  // 2) Trigger the draw for the current round if its timer has elapsed. The Pyth
  //    fee is paid from the contract's ETH float, so no value is sent here.
  if (await c.drawDue()) {
    console.log("drawDue=true → triggerDraw()");
    const tx = await c.triggerDraw();
    console.log(`  ${tx.hash}`);
    await tx.wait();
    console.log("  draw requested (Pyth will fulfill shortly)");
  } else {
    console.log("drawDue=false");
  }

  // 3) Roll an EMPTY round forward when its timer has elapsed. With 0 tickets a
  //    draw can't fire (drawDue=false), so triggerDraw() simply extends the round
  //    by ROUND_DURATION — keeping the countdown live and giving the first buyer a
  //    real window instead of an instant draw.
  const curr = await c.currentRound();
  const r = await c.getRound(curr);
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  if (Number(r.status) === 0 && r.ticketCount === 0n && nowSec >= r.endTime) {
    console.log("empty round past endTime -> triggerDraw() to roll the timer forward");
    const tx = await c.triggerDraw();
    console.log(`  ${tx.hash}`);
    await tx.wait();
    console.log("  rolled forward ~24h");
  } else {
    console.log("rollForward=not needed");
  }

  console.log("done");
}

main().catch((e) => { console.error(e.shortMessage || e.message || e); process.exit(1); });
