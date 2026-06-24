import type { Address } from "viem";

export const ZERO_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";

function readAddress(value: string | undefined): Address {
  if (!value) return ZERO_ADDRESS;
  const trimmed = value.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return trimmed as Address;
  return ZERO_ADDRESS;
}

// ── Kitti Lottery ────────────────────────────────────────────────────────────

// Base mainnet deployment — 2026-06-24 (KittiLottery v3 — Pyth Entropy randomness)
const MAINNET_LOTTERY = "0x7AB998E1f73229f0Cf016e8811e9a88eFE8Ee0c5";
const MAINNET_USDC    = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const LOTTERY_ADDRESS = readAddress(
  process.env.NEXT_PUBLIC_LOTTERY_ADDRESS ?? MAINNET_LOTTERY,
);
export const TOKEN_ADDRESS = readAddress(
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? MAINNET_USDC,
);
export const LOTTERY_CONFIGURED = LOTTERY_ADDRESS !== ZERO_ADDRESS;

export const DEFAULT_CHAIN_ID = (() => {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 8453; // default to Base mainnet
})();

export const TOKEN_DECIMALS = 6;

export const SUPPORTED_CHAIN_IDS = [8453, 84532] as const;

export const isAddressSet = (addr: Address) => addr !== ZERO_ADDRESS;
