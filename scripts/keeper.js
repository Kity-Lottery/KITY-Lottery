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

  console.log("done");
}

main().catch((e) => { console.error(e.shortMessage || e.message || e); process.exit(1); });
