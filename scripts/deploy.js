/* eslint-disable no-console */
const { ethers, network } = require("hardhat");

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Pyth Entropy contract per network. This IS a fixed, public chain constant
// (a single shared contract), so it is safe to
// hardcode. Base mainnet value verified on-chain + against Pyth's official
// registry (docs.pyth.network/entropy/contract-addresses).
const ENTROPY = {
  base: "0x6E7D74FA7d5c90FEF9F0512987605a6d546181Bb",
  // Base Sepolia: set ENTROPY_ADDRESS in env (look it up at
  // docs.pyth.network/entropy/contract-addresses) — not hardcoded to avoid guessing.
};

async function deploy(name, args = []) {
  const f = await ethers.getContractFactory(name);
  const c = await f.deploy(...args);
  await c.waitForDeployment();
  return c;
}

function normalizeAddress(label, value) {
  if (!value) throw new Error(`Invalid ${label}: <empty>`);
  try {
    return ethers.getAddress(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const feeRecipient = normalizeAddress("fee recipient", process.env.FEE_RECIPIENT || deployer.address);
  // Initial owner — pass your Safe multisig via CONTRACT_OWNER so the contract is
  // Safe-owned from tx #1. The deploying EOA never holds ownership.
  const contractOwner = normalizeAddress("contract owner", process.env.CONTRACT_OWNER || deployer.address);

  const isLiveNetwork = network.name === "base" || network.name === "baseSepolia";

  // Pyth Entropy address: env override, else the per-network constant. For a
  // local node we deploy a MockEntropy below, so no address is needed here.
  let entropyAddr;
  if (process.env.ENTROPY_ADDRESS || ENTROPY[network.name]) {
    entropyAddr = normalizeAddress("entropy", process.env.ENTROPY_ADDRESS || ENTROPY[network.name]);
  }

  if (network.name === "base") {
    if (!process.env.CONTRACT_OWNER) {
      throw new Error("Refusing to deploy to base: set CONTRACT_OWNER to your Safe multisig.");
    }
    if (!process.env.FEE_RECIPIENT) {
      throw new Error("Refusing to deploy to base: set FEE_RECIPIENT to your Safe multisig.");
    }
  }
  if (isLiveNetwork && !entropyAddr) {
    throw new Error(
      `Refusing to deploy to ${network.name}: no Pyth Entropy address. Set ` +
      "ENTROPY_ADDRESS (see docs.pyth.network/entropy/contract-addresses).",
    );
  }

  console.log(`Network:         ${network.name}`);
  console.log(`Deployer (EOA):  ${deployer.address}  (gas-payer only, no ownership)`);
  console.log(`Owner (Safe):    ${contractOwner}`);
  console.log(`Fee recipient:   ${feeRecipient}`);

  let token;
  if (network.name === "base") {
    token = normalizeAddress("Base USDC", BASE_USDC);
    console.log(`Token (USDC):    ${token}`);
  } else {
    const usdc = await deploy("MockERC20", ["Test USD Coin", "tUSDC", 6]);
    token = normalizeAddress("test USDC", await usdc.getAddress());
    console.log(`Test USDC:       ${token}`);
  }

  // Local node: deploy a MockEntropy so triggerDraw()/settle() work end-to-end.
  if (!entropyAddr) {
    const mock = await deploy("MockEntropy", ["0x1111111111111111111111111111111111111111"]);
    entropyAddr = await mock.getAddress();
    console.log(`Mock Entropy:    ${entropyAddr}`);
  }
  console.log(`Pyth Entropy:    ${entropyAddr}\n`);

  const lottery = await deploy("KittiLottery", [
    token, feeRecipient, entropyAddr, contractOwner,
  ]);
  const lotteryAddr = await lottery.getAddress();

  console.log(`KittiLottery:    ${lotteryAddr}`);

  console.log("\n--- Deployment summary (JSON) ---");
  console.log(JSON.stringify({
    network:      network.name,
    owner:        contractOwner,
    feeRecipient,
    lottery:      lotteryAddr,
    token,
    entropy:      entropyAddr,
  }, null, 2));

  console.log(`
Post-deploy checklist:
  1. Verify on Sourcify/Basescan:
       npx hardhat verify --network ${network.name} ${lotteryAddr} \\
         "${token}" "${feeRecipient}" "${entropyAddr}" "${contractOwner}"
  2. Fund the contract's ETH float (pays Pyth Entropy fee ~0.00001 ETH/draw):
       send ~0.01 ETH on Base to ${lotteryAddr}  (≈1000 draws)
       (read the live fee any time with  lottery.entropyFee())
  3. Set up the keeper (cron / Chainlink Automation) to call:
       triggerDraw()  when  drawDue()  is true
       settle(1000)   when  settleDue() is true
  4. Verify owner:  await lottery.owner()  →  ${contractOwner}
  5. Repoint the frontend (web/lib/contracts.ts default + NEXT_PUBLIC_LOTTERY_ADDRESS):
       NEXT_PUBLIC_LOTTERY_ADDRESS=${lotteryAddr}
       NEXT_PUBLIC_TOKEN_ADDRESS=${token}
  `);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
